-- Supplier purchases can have two weights:
--   manual_quantity  = market scale / quantity used for payment
--   digital_quantity = warehouse scale / quantity added to inventory
-- The supplier unit price remains the price per manual unit. Inventory uses
-- the effective cost per digital unit so the total paid value is not inflated.

ALTER TABLE public.stock_receipt_items
  ADD COLUMN IF NOT EXISTS manual_quantity NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS digital_quantity NUMERIC(14, 3);

UPDATE public.stock_receipt_items
SET manual_quantity = COALESCE(manual_quantity, quantity),
    digital_quantity = COALESCE(digital_quantity, quantity)
WHERE manual_quantity IS NULL OR digital_quantity IS NULL;

ALTER TABLE public.stock_receipt_items
  ALTER COLUMN manual_quantity SET NOT NULL,
  ALTER COLUMN digital_quantity SET NOT NULL;

ALTER TABLE public.stock_receipt_items
  DROP CONSTRAINT IF EXISTS stock_receipt_items_manual_quantity_check,
  DROP CONSTRAINT IF EXISTS stock_receipt_items_digital_quantity_check;

ALTER TABLE public.stock_receipt_items
  ADD CONSTRAINT stock_receipt_items_manual_quantity_check CHECK (manual_quantity > 0),
  ADD CONSTRAINT stock_receipt_items_digital_quantity_check CHECK (digital_quantity > 0);

-- A batch is valued at the effective digital-unit cost. The receipt item keeps
-- the original supplier price for payment/audit display.
CREATE OR REPLACE FUNCTION public.create_stock_batch_for_receipt_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE supplier_value UUID; received_value TIMESTAMPTZ; effective_cost NUMERIC;
BEGIN
  SELECT supplier_id, received_date::timestamptz INTO supplier_value, received_value
  FROM public.stock_receipts WHERE id = NEW.receipt_id;
  effective_cost := ROUND(NEW.subtotal / NEW.digital_quantity, 2);
  INSERT INTO public.stock_batches(product_id, receipt_item_id, supplier_id, quantity_received,
    quantity_remaining, unit_cost, received_at, notes)
  VALUES (NEW.product_id, NEW.id, supplier_value, NEW.digital_quantity, NEW.digital_quantity,
    effective_cost, COALESCE(received_value, NOW()), 'Batch dibuat dari penerimaan ' || NEW.receipt_id)
  ON CONFLICT (receipt_item_id) DO NOTHING;

  INSERT INTO public.product_cost_history(product_id, old_cost, new_cost, source_type, source_id, created_by)
  SELECT NEW.product_id, COALESCE((SELECT new_cost FROM public.product_cost_history
    WHERE product_id = NEW.product_id ORDER BY created_at DESC LIMIT 1), 0), balance.average_unit_cost,
    'PURCHASE_RECEIPT', NEW.receipt_id, receipt.created_by
  FROM public.stock_balances balance JOIN public.stock_receipts receipt ON receipt.id = NEW.receipt_id
  WHERE balance.product_id = NEW.product_id;
  RETURN NEW;
END; $$;

-- Keep quantity as the inventory quantity for existing reporting/query code.
-- subtotal is the actual amount paid to the supplier.
CREATE OR REPLACE FUNCTION public.create_stock_receipt_transaction(p_payload JSONB)
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
  item JSONB;
  receipt_id UUID := gen_random_uuid();
  receipt_item_id UUID;
  supplier_bill_id UUID;
  bill_result JSONB;
  receipt_number TEXT;
  received_date_value DATE := COALESCE(NULLIF(p_payload->>'receivedDate', '')::DATE, CURRENT_DATE);
  due_date_value DATE := NULLIF(p_payload->>'dueDate', '')::DATE;
  total_value NUMERIC := 0;
  manual_quantity_value NUMERIC;
  digital_quantity_value NUMERIC;
  unit_cost_value NUMERIC;
  effective_unit_cost_value NUMERIC;
  subtotal_value NUMERIC;
  average_cost_value NUMERIC;
  balance_row public.stock_balances%ROWTYPE;
BEGIN
  IF actor_role NOT IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role) THEN
    RAISE EXCEPTION 'Hanya Owner/Finance yang dapat mencatat penerimaan stok';
  END IF;
  IF jsonb_array_length(COALESCE(p_payload->'items', '[]')) = 0 THEN
    RAISE EXCEPTION 'Penerimaan stok harus memiliki minimal satu produk';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(p_payload->'items', '[]')) AS payload_item(item_value)
    GROUP BY payload_item.item_value->>'productId' HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Produk yang sama cukup dicatat satu kali dalam satu penerimaan';
  END IF;

  SELECT supplier.* INTO supplier_row
  FROM public.suppliers AS supplier
  WHERE supplier.id = (p_payload->>'supplierId')::UUID AND supplier.status = 'ACTIVE';
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
    SELECT product.* INTO product_row FROM public.products AS product
    WHERE product.id = (item->>'productId')::UUID AND product.status = 'ACTIVE';
    IF NOT FOUND THEN RAISE EXCEPTION 'Produk aktif tidak ditemukan'; END IF;
    total_value := total_value + ROUND(manual_quantity_value * unit_cost_value, 2);
  END LOOP;

  receipt_number := public.next_stock_receipt_number(TO_CHAR(received_date_value, 'YYYY/MM'));
  IF COALESCE((p_payload->>'createPayable')::BOOLEAN, FALSE) THEN
    bill_result := public.create_supplier_bill_transaction(jsonb_build_object(
      'supplierId', supplier_row.id, 'supplierReference', p_payload->>'supplierReference',
      'billDate', received_date_value, 'dueDate', p_payload->>'dueDate',
      'total', total_value, 'notes', p_payload->>'notes'
    ));
    supplier_bill_id := (bill_result->>'supplierBillId')::UUID;
  END IF;

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
    SELECT 1 FROM jsonb_array_elements(p_payload->'items') AS payload_item(item_value)
    WHERE (payload_item.item_value->>'productId')::UUID = balance.product_id
  )
  ORDER BY balance.product_id FOR UPDATE;

  SELECT profile.full_name INTO actor_name FROM public.profiles AS profile WHERE profile.id = auth.uid();
  FOR item IN
    SELECT payload_item.item_value FROM jsonb_array_elements(p_payload->'items') AS payload_item(item_value)
    ORDER BY payload_item.item_value->>'productId'
  LOOP
    manual_quantity_value := ROUND(COALESCE((item->>'manualQuantity')::NUMERIC, (item->>'quantity')::NUMERIC, 0), 3);
    digital_quantity_value := ROUND(COALESCE((item->>'digitalQuantity')::NUMERIC, (item->>'quantity')::NUMERIC, manual_quantity_value), 3);
    unit_cost_value := ROUND((item->>'unitCost')::NUMERIC, 2);
    subtotal_value := ROUND(manual_quantity_value * unit_cost_value, 2);
    effective_unit_cost_value := ROUND(subtotal_value / digital_quantity_value, 2);

    SELECT product.* INTO product_row FROM public.products AS product WHERE product.id = (item->>'productId')::UUID;
    SELECT balance.* INTO balance_row FROM public.stock_balances AS balance WHERE balance.product_id = product_row.id FOR UPDATE;
    average_cost_value := ROUND(
      ((balance_row.quantity * balance_row.average_unit_cost) + (digital_quantity_value * effective_unit_cost_value))
      / (balance_row.quantity + digital_quantity_value), 2
    );
    UPDATE public.stock_balances AS balance
    SET quantity = balance.quantity + digital_quantity_value,
        average_unit_cost = average_cost_value, updated_at = NOW()
    WHERE balance.product_id = product_row.id
    RETURNING balance.* INTO balance_row;

    receipt_item_id := gen_random_uuid();
    INSERT INTO public.stock_receipt_items(
      id, receipt_id, product_id, product_name_snapshot, unit, quantity,
      manual_quantity, digital_quantity, unit_cost, subtotal
    ) VALUES (
      receipt_item_id, receipt_id, product_row.id,
      product_row.name || CASE WHEN product_row.size IS NOT NULL THEN ' [' || product_row.size || ']' ELSE '' END,
      product_row.default_unit, digital_quantity_value, manual_quantity_value,
      digital_quantity_value, unit_cost_value, subtotal_value
    );
    INSERT INTO public.stock_movements(
      product_id, product_name_snapshot, unit, movement_type, quantity_delta,
      balance_after, supplier_id, receipt_id, receipt_item_id, notes, occurred_at, created_by
    ) VALUES (
      product_row.id,
      product_row.name || CASE WHEN product_row.size IS NOT NULL THEN ' [' || product_row.size || ']' ELSE '' END,
      product_row.default_unit, 'PURCHASE_IN', digital_quantity_value, balance_row.quantity,
      supplier_row.id, receipt_id, receipt_item_id,
      CASE WHEN manual_quantity_value <> digital_quantity_value
        THEN receipt_number || ' · manual ' || manual_quantity_value || ' · digital ' || digital_quantity_value
        ELSE receipt_number END,
      received_date_value, auth.uid()
    );
    PERFORM public.set_product_cost(
      product_row.id, supplier_row.id, average_cost_value, NOW(),
      'HPP rata-rata dari ' || receipt_number || '; dibayar ' || manual_quantity_value || ' ' || product_row.default_unit || ', masuk ' || digital_quantity_value || ' ' || product_row.default_unit
    );
  END LOOP;

  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
  VALUES (auth.uid(), COALESCE(actor_name, 'User'), 'stock_receipts', receipt_id, 'STOCK_RECEIPT_CREATED',
    jsonb_build_object('receipt_number', receipt_number, 'supplier_id', supplier_row.id, 'total', total_value, 'supplier_bill_id', supplier_bill_id, 'weight_difference_enabled', TRUE));
  RETURN jsonb_build_object('receiptId', receipt_id, 'receiptNumber', receipt_number, 'supplierBillId', supplier_bill_id, 'total', total_value);
END;
$$;

-- The cancellation calculation must reverse the amount paid (manual weight x
-- supplier price), while subtracting the digital quantity from stock.
CREATE OR REPLACE FUNCTION public.cancel_stock_receipt_transaction(p_receipt_id UUID, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  receipt_row public.stock_receipts%ROWTYPE;
  bill_row public.supplier_bills%ROWTYPE;
  receipt_item_row public.stock_receipt_items%ROWTYPE;
  purchase_movement_row public.stock_movements%ROWTYPE;
  balance_row public.stock_balances%ROWTYPE;
  new_quantity_value NUMERIC;
  new_average_cost_value NUMERIC;
  actor_name TEXT;
  supplier_bill_voided BOOLEAN := FALSE;
BEGIN
  IF public.current_user_role() NOT IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role) THEN RAISE EXCEPTION 'Hanya Owner/Finance yang dapat membatalkan penerimaan stok'; END IF;
  IF p_receipt_id IS NULL THEN RAISE EXCEPTION 'Penerimaan stok tidak valid'; END IF;
  IF NULLIF(BTRIM(p_reason), '') IS NULL THEN RAISE EXCEPTION 'Alasan pembatalan wajib diisi'; END IF;
  SELECT receipt.* INTO receipt_row FROM public.stock_receipts AS receipt WHERE receipt.id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Penerimaan stok tidak ditemukan'; END IF;
  IF receipt_row.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Penerimaan stok ini sudah dibatalkan'; END IF;
  PERFORM balance.product_id FROM public.stock_balances AS balance
    JOIN public.stock_receipt_items AS receipt_item ON receipt_item.product_id = balance.product_id
    WHERE receipt_item.receipt_id = receipt_row.id ORDER BY balance.product_id FOR UPDATE;
  IF receipt_row.supplier_bill_id IS NOT NULL THEN
    SELECT bill.* INTO bill_row FROM public.supplier_bills AS bill WHERE bill.id = receipt_row.supplier_bill_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tagihan supplier penerimaan tidak ditemukan'; END IF;
    IF bill_row.status <> 'OPEN'::public.supplier_bill_status OR bill_row.total_paid <> 0 THEN RAISE EXCEPTION 'Penerimaan tidak dapat dibatalkan karena hutang supplier sudah diproses atau dibayar'; END IF;
  END IF;
  FOR receipt_item_row IN SELECT receipt_item.* FROM public.stock_receipt_items AS receipt_item WHERE receipt_item.receipt_id = receipt_row.id ORDER BY receipt_item.product_id LOOP
    SELECT purchase_movement.* INTO purchase_movement_row FROM public.stock_movements AS purchase_movement
      WHERE purchase_movement.receipt_item_id = receipt_item_row.id AND purchase_movement.movement_type = 'PURCHASE_IN'::public.stock_movement_type;
    IF NOT FOUND THEN RAISE EXCEPTION 'Mutasi pembelian penerimaan tidak ditemukan'; END IF;
    IF EXISTS (SELECT 1 FROM public.stock_movements AS later_movement WHERE later_movement.product_id = receipt_item_row.product_id AND later_movement.created_at > purchase_movement_row.created_at) THEN
      RAISE EXCEPTION 'Penerimaan % tidak dapat dibatalkan karena produk % sudah memiliki mutasi stok lanjutan', receipt_row.receipt_number, receipt_item_row.product_name_snapshot;
    END IF;
    SELECT balance.* INTO balance_row FROM public.stock_balances AS balance WHERE balance.product_id = receipt_item_row.product_id;
    IF balance_row.quantity < receipt_item_row.digital_quantity THEN RAISE EXCEPTION 'Stok % tidak cukup untuk membatalkan penerimaan', receipt_item_row.product_name_snapshot; END IF;
    new_quantity_value := balance_row.quantity - receipt_item_row.digital_quantity;
    new_average_cost_value := CASE WHEN new_quantity_value = 0 THEN 0 ELSE ROUND(((balance_row.quantity * balance_row.average_unit_cost) - (receipt_item_row.manual_quantity * receipt_item_row.unit_cost)) / new_quantity_value, 2) END;
    IF new_average_cost_value < 0 THEN RAISE EXCEPTION 'HPP setelah pembatalan tidak valid untuk produk %', receipt_item_row.product_name_snapshot; END IF;
    UPDATE public.stock_balances AS balance SET quantity = new_quantity_value, average_unit_cost = new_average_cost_value, updated_at = NOW() WHERE balance.product_id = receipt_item_row.product_id;
    INSERT INTO public.stock_movements(product_id, product_name_snapshot, unit, movement_type, quantity_delta, balance_after, supplier_id, receipt_id, receipt_item_id, notes, occurred_at, created_by)
      VALUES (receipt_item_row.product_id, receipt_item_row.product_name_snapshot, receipt_item_row.unit, 'ADJUSTMENT_OUT'::public.stock_movement_type, -receipt_item_row.digital_quantity, new_quantity_value, receipt_row.supplier_id, receipt_row.id, receipt_item_row.id, 'Pembatalan penerimaan ' || receipt_row.receipt_number || ': ' || BTRIM(p_reason), NOW(), auth.uid());
    IF new_quantity_value = 0 THEN UPDATE public.product_costs SET ended_at = NOW() WHERE product_id = receipt_item_row.product_id AND ended_at IS NULL;
    ELSE PERFORM public.set_product_cost(receipt_item_row.product_id, receipt_row.supplier_id, new_average_cost_value, NOW(), 'HPP setelah pembatalan ' || receipt_row.receipt_number); END IF;
  END LOOP;
  UPDATE public.stock_receipts SET cancelled_at = NOW(), cancelled_by = auth.uid(), cancellation_reason = BTRIM(p_reason) WHERE id = receipt_row.id;
  IF receipt_row.supplier_bill_id IS NOT NULL THEN
    UPDATE public.supplier_bills SET status = 'VOID'::public.supplier_bill_status, notes = CONCAT_WS(E'\n', notes, 'Dibatalkan bersama penerimaan ' || receipt_row.receipt_number || ': ' || BTRIM(p_reason)), updated_at = NOW() WHERE id = receipt_row.supplier_bill_id;
    supplier_bill_voided := TRUE;
  END IF;
  SELECT profile.full_name INTO actor_name FROM public.profiles AS profile WHERE profile.id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
    VALUES (auth.uid(), COALESCE(actor_name, 'User'), 'stock_receipts', receipt_row.id, 'STOCK_RECEIPT_CANCELLED', jsonb_build_object('receipt_number', receipt_row.receipt_number, 'reason', BTRIM(p_reason), 'supplier_bill_id', receipt_row.supplier_bill_id, 'supplier_bill_voided', supplier_bill_voided));
  RETURN jsonb_build_object('receiptId', receipt_row.id, 'receiptNumber', receipt_row.receipt_number, 'supplierBillVoided', supplier_bill_voided);
END;
$$;

REVOKE ALL ON FUNCTION public.create_stock_receipt_transaction(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_receipt_transaction(JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_stock_receipt_transaction(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_stock_receipt_transaction(UUID, TEXT) TO authenticated;
