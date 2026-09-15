-- Finalize receipt costing after the weight adapter migrations.
--
-- manual_quantity is the quantity paid to the supplier. digital_quantity is
-- the quantity that enters stock. The only inventory value added by a receipt
-- is manual_quantity * supplier unit cost, allocated over digital_quantity.

UPDATE public.stock_receipt_items
SET manual_quantity = COALESCE(manual_quantity, quantity),
    digital_quantity = COALESCE(digital_quantity, quantity),
    quantity = COALESCE(digital_quantity, quantity),
    subtotal = ROUND(COALESCE(manual_quantity, quantity) * unit_cost, 2)
WHERE manual_quantity IS NULL
   OR digital_quantity IS NULL
   OR quantity IS DISTINCT FROM COALESCE(digital_quantity, quantity)
   OR subtotal IS DISTINCT FROM ROUND(COALESCE(manual_quantity, quantity) * unit_cost, 2);

ALTER TABLE public.stock_receipt_items
  ALTER COLUMN manual_quantity SET NOT NULL,
  ALTER COLUMN digital_quantity SET NOT NULL;

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

    -- The receipt-item trigger creates the batch immediately. Replace its
    -- supplier-price valuation with the effective digital-unit cost.
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

-- Rebuild current average HPP from receipt history. Invoice snapshots are
-- deliberately untouched. Manual HPP corrections remain chronological events.
CREATE OR REPLACE FUNCTION public.recalculate_inventory_hpp()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_row RECORD;
  event_row RECORD;
  state_row RECORD;
  opening_quantity NUMERIC;
  opening_cost NUMERIC;
  old_cost NUMERIC;
  recalculated_count INTEGER := 0;
BEGIN
  CREATE TEMP TABLE hpp_recalculation_state(
    product_id UUID PRIMARY KEY,
    quantity NUMERIC NOT NULL,
    average_cost NUMERIC NOT NULL
  ) ON COMMIT DROP;

  FOR product_row IN SELECT product.id FROM public.products AS product LOOP
    SELECT
      GREATEST(
        0,
        COALESCE(balance.quantity, 0) - COALESCE((
          SELECT SUM(movement.quantity_delta)
          FROM public.stock_movements AS movement
          WHERE movement.product_id = balance.product_id
        ), 0)
      ),
      COALESCE(
        (
          SELECT batch.unit_cost
          FROM public.stock_batches AS batch
          WHERE batch.product_id = balance.product_id
            AND batch.receipt_item_id IS NULL
          ORDER BY batch.created_at
          LIMIT 1
        ),
        (
          SELECT history.new_cost
          FROM public.product_cost_history AS history
          WHERE history.product_id = balance.product_id
            AND history.source_type = 'LEGACY_MIGRATION'
          ORDER BY history.created_at
          LIMIT 1
        ),
        0
      )
    INTO opening_quantity, opening_cost
    FROM public.stock_balances AS balance
    WHERE balance.product_id = product_row.id;

    INSERT INTO hpp_recalculation_state(product_id, quantity, average_cost)
    VALUES (product_row.id, COALESCE(opening_quantity, 0), ROUND(COALESCE(opening_cost, 0), 2));

    FOR event_row IN
      SELECT
        CASE
          WHEN movement.movement_type = 'PURCHASE_IN'::public.stock_movement_type THEN 'RECEIPT'
          WHEN movement.movement_type = 'ADJUSTMENT_OUT'::public.stock_movement_type
            AND movement.receipt_item_id IS NOT NULL THEN 'RECEIPT_CANCEL'
          ELSE 'STOCK_MOVEMENT'
        END::TEXT AS event_type,
        movement.product_id,
        movement.occurred_at AS event_at,
        movement.created_at AS tie_breaker,
        movement.id AS event_id,
        receipt_item.manual_quantity,
        receipt_item.digital_quantity,
        receipt_item.unit_cost,
        movement.quantity_delta,
        NULL::NUMERIC AS corrected_cost
      FROM public.stock_movements AS movement
      LEFT JOIN public.stock_receipt_items AS receipt_item ON receipt_item.id = movement.receipt_item_id
      WHERE movement.product_id = product_row.id
      UNION ALL
      SELECT
        'MANUAL_ADJUSTMENT'::TEXT,
        history.product_id,
        history.created_at,
        history.created_at,
        history.id,
        NULL,
        NULL,
        NULL,
        NULL,
        history.new_cost
      FROM public.product_cost_history AS history
      WHERE history.product_id = product_row.id
        AND history.source_type = 'MANUAL_ADJUSTMENT'
      ORDER BY event_at, tie_breaker, event_type, event_id
    LOOP
      SELECT * INTO state_row
      FROM hpp_recalculation_state
      WHERE hpp_recalculation_state.product_id = product_row.id
      FOR UPDATE;

      IF event_row.event_type = 'RECEIPT' THEN
        UPDATE hpp_recalculation_state
        SET average_cost = CASE
          WHEN state_row.quantity + event_row.digital_quantity <= 0 THEN 0
          ELSE ROUND(
            (
              (state_row.quantity * state_row.average_cost)
              + (event_row.manual_quantity * event_row.unit_cost)
            ) / (state_row.quantity + event_row.digital_quantity),
            2
          )
        END,
        quantity = state_row.quantity + event_row.digital_quantity
        WHERE hpp_recalculation_state.product_id = product_row.id;

        UPDATE public.stock_batches AS batch
        SET quantity_received = event_row.digital_quantity,
            unit_cost = ROUND((event_row.manual_quantity * event_row.unit_cost) / event_row.digital_quantity, 2)
        WHERE batch.receipt_item_id = event_row.event_id;
      ELSIF event_row.event_type = 'RECEIPT_CANCEL' THEN
        UPDATE hpp_recalculation_state
        SET average_cost = CASE
          WHEN state_row.quantity - event_row.digital_quantity <= 0 THEN 0
          ELSE ROUND(
            (
              (state_row.quantity * state_row.average_cost)
              - (event_row.manual_quantity * event_row.unit_cost)
            ) / (state_row.quantity - event_row.digital_quantity),
            2
          )
        END,
        quantity = GREATEST(0, state_row.quantity - event_row.digital_quantity)
        WHERE hpp_recalculation_state.product_id = product_row.id;
      ELSIF event_row.event_type = 'STOCK_MOVEMENT' THEN
        UPDATE hpp_recalculation_state
        SET quantity = GREATEST(0, state_row.quantity + event_row.quantity_delta)
        WHERE hpp_recalculation_state.product_id = product_row.id;
      ELSE
        UPDATE hpp_recalculation_state
        SET average_cost = ROUND(event_row.corrected_cost, 2)
        WHERE hpp_recalculation_state.product_id = product_row.id;
      END IF;
    END LOOP;

    SELECT * INTO state_row
    FROM hpp_recalculation_state
    WHERE hpp_recalculation_state.product_id = product_row.id;

    SELECT ROUND(COALESCE(cost.unit_cost, 0), 2)
    INTO old_cost
    FROM public.product_costs AS cost
    WHERE cost.product_id = product_row.id
      AND cost.ended_at IS NULL
    ORDER BY cost.effective_at DESC
    LIMIT 1;

    UPDATE public.stock_balances AS balance
    SET average_unit_cost = ROUND(state_row.average_cost, 2), updated_at = NOW()
    WHERE balance.product_id = product_row.id;

    IF state_row.average_cost <= 0 THEN
      UPDATE public.product_costs AS cost
      SET ended_at = NOW()
      WHERE cost.product_id = product_row.id
        AND cost.ended_at IS NULL;
    ELSIF old_cost IS NULL THEN
      INSERT INTO public.product_costs(product_id, supplier_id, unit_cost, effective_at, notes)
      VALUES (product_row.id, NULL, ROUND(state_row.average_cost, 2), NOW(), 'HPP direkonstruksi dari penerimaan berbobot');
    ELSE
      UPDATE public.product_costs AS cost
      SET unit_cost = ROUND(state_row.average_cost, 2),
          notes = COALESCE(cost.notes, 'HPP direkonstruksi dari penerimaan berbobot')
      WHERE cost.product_id = product_row.id
        AND cost.ended_at IS NULL;
    END IF;

    IF COALESCE(old_cost, 0) <> ROUND(state_row.average_cost, 2) THEN
      INSERT INTO public.product_cost_history(product_id, old_cost, new_cost, source_type, source_id, created_by)
      VALUES (product_row.id, COALESCE(old_cost, 0), ROUND(state_row.average_cost, 2), 'HPP_RECALCULATION', product_row.id, NULL);
      INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
      VALUES (NULL, 'System', 'products', product_row.id, 'PRODUCT_HPP_RECALCULATED', jsonb_build_object(
        'old_cost', COALESCE(old_cost, 0),
        'new_cost', ROUND(state_row.average_cost, 2),
        'invoice_snapshots_unchanged', TRUE,
        'cost_method', 'PAID_MANUAL_WEIGHT_OVER_DIGITAL_WEIGHT'
      ));
    END IF;
    recalculated_count := recalculated_count + 1;
  END LOOP;

  RETURN jsonb_build_object('productsRecalculated', recalculated_count, 'invoiceSnapshotsUnchanged', TRUE);
END;
$$;

SELECT public.recalculate_inventory_hpp();
DROP FUNCTION public.recalculate_inventory_hpp();

CREATE OR REPLACE FUNCTION public.get_inventory_summary()
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN batch_value.quantity IS NULL THEN balance.quantity * balance.average_unit_cost
      ELSE batch_value.value + GREATEST(0, balance.quantity - batch_value.quantity) * balance.average_unit_cost
    END
  ), 0)
  FROM public.stock_balances AS balance
  JOIN public.products AS product ON product.id = balance.product_id
  LEFT JOIN LATERAL (
    SELECT
      SUM(batch.quantity_remaining) AS quantity,
      SUM(batch.quantity_remaining * batch.unit_cost) AS value
    FROM public.stock_batches AS batch
    WHERE batch.product_id = balance.product_id
      AND batch.status = 'OPEN'
      AND batch.quantity_remaining > 0
  ) AS batch_value ON TRUE
  WHERE product.status = 'ACTIVE'
    AND public.current_user_role() IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role);
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_summary() TO authenticated;

NOTIFY pgrst, 'reload schema';
