-- Repair the weight adapter. PostgreSQL can treat names such as
-- digital_quantity_value as either a PL/pgSQL variable or a column reference
-- inside UPDATE statements. Use distinct variable names and qualified columns.

-- The legacy RPC inserts receipt items without the new columns. Allow that
-- insert while the adapter calls it, then restore the invariant below.
ALTER TABLE public.stock_receipt_items
  ALTER COLUMN manual_quantity DROP NOT NULL,
  ALTER COLUMN digital_quantity DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.create_stock_receipt_transaction(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_legacy_payload JSONB;
  v_legacy_result JSONB;
  v_receipt_id UUID;
  v_item JSONB;
  v_manual_qty NUMERIC;
  v_digital_qty NUMERIC;
  v_supplier_cost NUMERIC;
  v_effective_cost NUMERIC;
  v_receipt_item_id UUID;
  v_total_cost NUMERIC := 0;
  v_supplier_bill_id UUID;
BEGIN
  IF jsonb_array_length(COALESCE(p_payload->'items', '[]')) = 0 THEN
    RAISE EXCEPTION 'Penerimaan stok harus memiliki minimal satu produk';
  END IF;

  SELECT jsonb_agg(
    jsonb_set(
      jsonb_set(
        normalized.item_value,
        '{quantity}',
        to_jsonb(normalized.digital_qty),
        true
      ),
      '{unitCost}',
      to_jsonb(normalized.effective_cost),
      true
    )
  )
  INTO v_legacy_payload
  FROM (
    SELECT
      payload_item.item_value,
      ROUND(COALESCE((payload_item.item_value->>'manualQuantity')::NUMERIC, (payload_item.item_value->>'quantity')::NUMERIC, 0), 3) AS manual_qty,
      ROUND(COALESCE((payload_item.item_value->>'digitalQuantity')::NUMERIC, (payload_item.item_value->>'quantity')::NUMERIC, 0), 3) AS digital_qty,
      ROUND(COALESCE((payload_item.item_value->>'unitCost')::NUMERIC, 0), 2) AS supplier_cost,
      ROUND(
        ROUND(COALESCE((payload_item.item_value->>'manualQuantity')::NUMERIC, (payload_item.item_value->>'quantity')::NUMERIC, 0), 3)
        * ROUND(COALESCE((payload_item.item_value->>'unitCost')::NUMERIC, 0), 2)
        / NULLIF(ROUND(COALESCE((payload_item.item_value->>'digitalQuantity')::NUMERIC, (payload_item.item_value->>'quantity')::NUMERIC, 0), 3), 0),
        2
      ) AS effective_cost
    FROM jsonb_array_elements(p_payload->'items') AS payload_item(item_value)
  ) AS normalized;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(v_legacy_payload, '[]')) AS payload_item(item_value)
    WHERE COALESCE((payload_item.item_value->>'quantity')::NUMERIC, 0) <= 0
       OR COALESCE((payload_item.item_value->>'unitCost')::NUMERIC, 0) <= 0
  ) THEN
    RAISE EXCEPTION 'Berat manual, berat digital, dan harga beli penerimaan harus lebih dari nol';
  END IF;

  v_legacy_payload := jsonb_set(p_payload, '{items}', v_legacy_payload, true);
  v_legacy_result := public.create_stock_receipt_transaction_legacy(v_legacy_payload);
  v_receipt_id := (v_legacy_result->>'receiptId')::UUID;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
    v_manual_qty := ROUND(COALESCE((v_item->>'manualQuantity')::NUMERIC, (v_item->>'quantity')::NUMERIC, 0), 3);
    v_digital_qty := ROUND(COALESCE((v_item->>'digitalQuantity')::NUMERIC, (v_item->>'quantity')::NUMERIC, 0), 3);
    v_supplier_cost := ROUND(COALESCE((v_item->>'unitCost')::NUMERIC, 0), 2);
    v_effective_cost := ROUND(v_manual_qty * v_supplier_cost / NULLIF(v_digital_qty, 0), 2);
    v_total_cost := v_total_cost + ROUND(v_manual_qty * v_supplier_cost, 2);

    SELECT receipt_item.id
    INTO v_receipt_item_id
    FROM public.stock_receipt_items AS receipt_item
    WHERE receipt_item.receipt_id = v_receipt_id
      AND receipt_item.product_id = (v_item->>'productId')::UUID;

    UPDATE public.stock_receipt_items AS receipt_item
    SET manual_quantity = v_manual_qty,
        digital_quantity = v_digital_qty,
        quantity = v_digital_qty,
        unit_cost = v_supplier_cost,
        subtotal = ROUND(v_manual_qty * v_supplier_cost, 2)
    WHERE receipt_item.id = v_receipt_item_id;

    UPDATE public.stock_batches AS batch
    SET quantity_received = v_digital_qty,
        quantity_remaining = v_digital_qty,
        unit_cost = v_effective_cost
    WHERE batch.receipt_item_id = v_receipt_item_id;
  END LOOP;

  -- The legacy function calculated its bill from the translated digital
  -- quantity and rounded effective cost. Restore the exact supplier payable
  -- total from manual weight, which is the amount actually paid.
  SELECT receipt.supplier_bill_id
  INTO v_supplier_bill_id
  FROM public.stock_receipts AS receipt
  WHERE receipt.id = v_receipt_id;

  UPDATE public.stock_receipts AS receipt
  SET total_cost = v_total_cost
  WHERE receipt.id = v_receipt_id;

  IF v_supplier_bill_id IS NOT NULL THEN
    UPDATE public.supplier_bills AS bill
    SET total = v_total_cost,
        remaining_balance = v_total_cost - bill.total_paid,
        updated_at = NOW()
    WHERE bill.id = v_supplier_bill_id;
  END IF;

  v_legacy_result := jsonb_set(v_legacy_result, '{total}', to_jsonb(v_total_cost), true);
  RETURN v_legacy_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_stock_receipt_transaction(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_receipt_transaction(JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
