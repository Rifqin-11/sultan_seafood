-- The previous migration is already applied on some databases, so changing
-- that file does not update the stored function body. Re-declare the runtime
-- functions here with distinct PL/pgSQL variable names and qualified columns.

CREATE OR REPLACE FUNCTION public.apply_stock_movement_to_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_value NUMERIC := ABS(NEW.quantity_delta);
  batch_row RECORD;
  allocated_value NUMERIC;
BEGIN
  IF NEW.movement_type = 'INVOICE_VOID_RETURN'::public.stock_movement_type THEN
    FOR batch_row IN
      SELECT allocation.batch_id, allocation.quantity
      FROM public.stock_batch_allocations AS allocation
      JOIN public.stock_movements AS sale ON sale.id = allocation.movement_id
      WHERE sale.invoice_item_id = NEW.invoice_item_id
        AND sale.movement_type = 'SALE_OUT'::public.stock_movement_type
    LOOP
      UPDATE public.stock_batches AS batch
      SET quantity_remaining = batch.quantity_remaining + batch_row.quantity,
          status = 'OPEN'
      WHERE batch.id = batch_row.batch_id;
    END LOOP;
    RETURN NEW;
  END IF;

  IF NEW.movement_type = 'ADJUSTMENT_IN'::public.stock_movement_type
    AND NEW.receipt_item_id IS NULL THEN
    INSERT INTO public.stock_batches(
      product_id, quantity_received, quantity_remaining, unit_cost,
      received_at, notes
    )
    SELECT NEW.product_id, NEW.quantity_delta, NEW.quantity_delta,
      balance.average_unit_cost, NEW.occurred_at,
      'Batch penyesuaian: ' || COALESCE(NEW.notes, 'tanpa catatan')
    FROM public.stock_balances AS balance
    WHERE balance.product_id = NEW.product_id;
    RETURN NEW;
  END IF;

  IF NEW.movement_type = 'ADJUSTMENT_OUT'::public.stock_movement_type
    AND NEW.receipt_item_id IS NOT NULL THEN
    UPDATE public.stock_batches AS batch
    SET quantity_remaining = 0,
        status = 'CANCELLED'
    WHERE batch.receipt_item_id = NEW.receipt_item_id;
    RETURN NEW;
  END IF;

  IF NEW.movement_type NOT IN (
    'SALE_OUT'::public.stock_movement_type,
    'ADJUSTMENT_OUT'::public.stock_movement_type
  ) THEN
    RETURN NEW;
  END IF;

  FOR batch_row IN
    SELECT batch.id, batch.quantity_remaining
    FROM public.stock_batches AS batch
    WHERE batch.product_id = NEW.product_id
      AND batch.status = 'OPEN'
      AND batch.quantity_remaining > 0
    ORDER BY batch.expiry_date NULLS LAST, batch.received_at, batch.created_at, batch.id
    FOR UPDATE
  LOOP
    EXIT WHEN remaining_value <= 0;
    allocated_value := LEAST(remaining_value, batch_row.quantity_remaining);
    UPDATE public.stock_batches AS batch
    SET quantity_remaining = batch.quantity_remaining - allocated_value,
        status = CASE
          WHEN batch.quantity_remaining - allocated_value = 0 THEN 'DEPLETED'
          ELSE 'OPEN'
        END
    WHERE batch.id = batch_row.id;
    INSERT INTO public.stock_batch_allocations(batch_id, movement_id, quantity)
    VALUES (batch_row.id, NEW.id, allocated_value);
    remaining_value := remaining_value - allocated_value;
  END LOOP;

  IF remaining_value > 0 THEN
    RAISE EXCEPTION 'Batch stok untuk % tidak cukup. Saldo batch belum sesuai dengan stok tercatat.', NEW.product_name_snapshot;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_stock_receipt_transaction_final(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.user_role := public.current_user_role();
  actor_name TEXT;
  supplier_row public.suppliers%ROWTYPE;
  product_row public.products%ROWTYPE;
  balance_row public.stock_balances%ROWTYPE;
  item JSONB;
  receipt_id UUID := gen_random_uuid();
  v_receipt_item_id UUID;
  supplier_bill_id UUID;
  bill_result JSONB;
  receipt_number TEXT;
  received_date_value DATE := COALESCE(NULLIF(p_payload->>'receivedDate', '')::DATE, CURRENT_DATE);
  due_date_value DATE := NULLIF(p_payload->>'dueDate', '')::DATE;
  total_value NUMERIC := 0;
  manual_quantity_value NUMERIC;
  digital_quantity_value NUMERIC;
  unit_cost_value NUMERIC;
  subtotal_value NUMERIC;
  effective_unit_cost_value NUMERIC;
  average_cost_value NUMERIC;
BEGIN
  IF actor_role NOT IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role) THEN
    RAISE EXCEPTION 'Hanya Owner/Finance yang dapat mencatat penerimaan stok';
  END IF;
  IF jsonb_array_length(COALESCE(p_payload->'items', '[]')) = 0 THEN
    RAISE EXCEPTION 'Penerimaan stok harus memiliki minimal satu produk';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_payload->'items', '[]')) AS payload_item(item_value)
    GROUP BY payload_item.item_value->>'productId'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Produk yang sama cukup dicatat satu kali dalam satu penerimaan';
  END IF;

  SELECT supplier.* INTO supplier_row
  FROM public.suppliers AS supplier
  WHERE supplier.id = (p_payload->>'supplierId')::UUID
    AND supplier.status = 'ACTIVE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier aktif tidak ditemukan'; END IF;
  IF due_date_value IS NOT NULL AND due_date_value < received_date_value THEN
    RAISE EXCEPTION 'Jatuh tempo tidak boleh sebelum tanggal penerimaan';
  END IF;

  FOR item IN SELECT payload_item.item_value FROM jsonb_array_elements(p_payload->'items') AS payload_item(item_value)
  LOOP
    manual_quantity_value := ROUND(COALESCE((item->>'manualQuantity')::NUMERIC, (item->>'quantity')::NUMERIC, 0), 3);
    digital_quantity_value := ROUND(COALESCE((item->>'digitalQuantity')::NUMERIC, (item->>'quantity')::NUMERIC, manual_quantity_value), 3);
    unit_cost_value := ROUND(COALESCE((item->>'unitCost')::NUMERIC, 0), 2);
    IF manual_quantity_value <= 0 OR digital_quantity_value <= 0 OR unit_cost_value <= 0 THEN
      RAISE EXCEPTION 'Berat manual, berat digital, dan harga beli penerimaan harus lebih dari nol';
    END IF;
    SELECT product.* INTO product_row
    FROM public.products AS product
    WHERE product.id = (item->>'productId')::UUID
      AND product.status = 'ACTIVE';
    IF NOT FOUND THEN RAISE EXCEPTION 'Produk aktif tidak ditemukan'; END IF;
    total_value := total_value + ROUND(manual_quantity_value * unit_cost_value, 2);
  END LOOP;

  IF COALESCE((p_payload->>'createPayable')::BOOLEAN, FALSE) THEN
    bill_result := public.create_supplier_bill_transaction(jsonb_build_object(
      'supplierId', supplier_row.id,
      'supplierReference', p_payload->>'supplierReference',
      'billDate', received_date_value,
      'dueDate', p_payload->>'dueDate',
      'total', total_value,
      'notes', p_payload->>'notes'
    ));
    supplier_bill_id := (bill_result->>'supplierBillId')::UUID;
  END IF;

  receipt_number := public.next_stock_receipt_number(TO_CHAR(received_date_value, 'YYYY/MM'));
  INSERT INTO public.stock_receipts(
    id, receipt_number, supplier_id, supplier_bill_id, supplier_reference,
    received_date, total_cost, notes, created_by
  ) VALUES (
    receipt_id, receipt_number, supplier_row.id, supplier_bill_id,
    NULLIF(BTRIM(p_payload->>'supplierReference'), ''), received_date_value,
    total_value, NULLIF(BTRIM(p_payload->>'notes'), ''), auth.uid()
  );

  INSERT INTO public.stock_balances(product_id)
  SELECT DISTINCT (payload_item.item_value->>'productId')::UUID
  FROM jsonb_array_elements(p_payload->'items') AS payload_item(item_value)
  ON CONFLICT (product_id) DO NOTHING;

  PERFORM balance.product_id
  FROM public.stock_balances AS balance
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_payload->'items') AS payload_item(item_value)
    WHERE (payload_item.item_value->>'productId')::UUID = balance.product_id
  )
  ORDER BY balance.product_id
  FOR UPDATE;

  SELECT profile.full_name INTO actor_name
  FROM public.profiles AS profile
  WHERE profile.id = auth.uid();

  FOR item IN
    SELECT payload_item.item_value
    FROM jsonb_array_elements(p_payload->'items') AS payload_item(item_value)
    ORDER BY payload_item.item_value->>'productId'
  LOOP
    manual_quantity_value := ROUND(COALESCE((item->>'manualQuantity')::NUMERIC, (item->>'quantity')::NUMERIC, 0), 3);
    digital_quantity_value := ROUND(COALESCE((item->>'digitalQuantity')::NUMERIC, (item->>'quantity')::NUMERIC, manual_quantity_value), 3);
    unit_cost_value := ROUND((item->>'unitCost')::NUMERIC, 2);
    subtotal_value := ROUND(manual_quantity_value * unit_cost_value, 2);
    effective_unit_cost_value := ROUND(subtotal_value / digital_quantity_value, 2);

    SELECT product.* INTO product_row
    FROM public.products AS product
    WHERE product.id = (item->>'productId')::UUID;
    SELECT balance.* INTO balance_row
    FROM public.stock_balances AS balance
    WHERE balance.product_id = product_row.id
    FOR UPDATE;

    average_cost_value := ROUND(
      (
        (balance_row.quantity * balance_row.average_unit_cost)
        + (manual_quantity_value * unit_cost_value)
      ) / (balance_row.quantity + digital_quantity_value),
      2
    );

    UPDATE public.stock_balances AS balance
    SET quantity = balance.quantity + digital_quantity_value,
        average_unit_cost = average_cost_value,
        updated_at = NOW()
    WHERE balance.product_id = product_row.id
    RETURNING balance.* INTO balance_row;

    v_receipt_item_id := gen_random_uuid();
    INSERT INTO public.stock_receipt_items(
      id, receipt_id, product_id, product_name_snapshot, unit, quantity,
      manual_quantity, digital_quantity, unit_cost, subtotal
    ) VALUES (
      v_receipt_item_id, receipt_id, product_row.id,
      product_row.name || CASE WHEN product_row.size IS NOT NULL THEN ' [' || product_row.size || ']' ELSE '' END,
      product_row.default_unit, digital_quantity_value, manual_quantity_value,
      digital_quantity_value, unit_cost_value, subtotal_value
    );

    UPDATE public.stock_batches AS batch
    SET quantity_received = digital_quantity_value,
        quantity_remaining = digital_quantity_value,
        unit_cost = effective_unit_cost_value
    WHERE batch.receipt_item_id = v_receipt_item_id;

    INSERT INTO public.stock_movements(
      product_id, product_name_snapshot, unit, movement_type, quantity_delta,
      balance_after, supplier_id, receipt_id, receipt_item_id, notes, occurred_at, created_by
    ) VALUES (
      product_row.id,
      product_row.name || CASE WHEN product_row.size IS NOT NULL THEN ' [' || product_row.size || ']' ELSE '' END,
      product_row.default_unit, 'PURCHASE_IN'::public.stock_movement_type,
      digital_quantity_value, balance_row.quantity, supplier_row.id, receipt_id,
      v_receipt_item_id,
      CASE WHEN manual_quantity_value <> digital_quantity_value
        THEN receipt_number || ' · manual ' || manual_quantity_value || ' · digital ' || digital_quantity_value
        ELSE receipt_number END,
      received_date_value, auth.uid()
    );

    PERFORM public.set_product_cost(
      product_row.id, supplier_row.id, average_cost_value, NOW(),
      'HPP rata-rata dari ' || receipt_number || '; dibayar ' || manual_quantity_value || ' ' || product_row.default_unit ||
      ', masuk ' || digital_quantity_value || ' ' || product_row.default_unit
    );
  END LOOP;

  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
  VALUES (
    auth.uid(), COALESCE(actor_name, 'User'), 'stock_receipts', receipt_id,
    'STOCK_RECEIPT_CREATED',
    jsonb_build_object(
      'receipt_number', receipt_number,
      'supplier_id', supplier_row.id,
      'total', total_value,
      'supplier_bill_id', supplier_bill_id,
      'cost_method', 'PAID_MANUAL_WEIGHT_OVER_DIGITAL_WEIGHT'
    )
  );

  RETURN jsonb_build_object(
    'receiptId', receipt_id,
    'receiptNumber', receipt_number,
    'supplierBillId', supplier_bill_id,
    'total', total_value
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_stock_receipt_transaction(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.create_stock_receipt_transaction_final(p_payload);
END;
$$;

REVOKE ALL ON FUNCTION public.create_stock_receipt_transaction_final(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_stock_receipt_transaction(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_receipt_transaction(JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
