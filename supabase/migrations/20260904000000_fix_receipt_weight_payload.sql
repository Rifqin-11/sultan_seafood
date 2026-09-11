-- The remote database may already have the older receipt RPC recorded as
-- applied. The UI now sends manualQuantity/digitalQuantity, so adapt that
-- payload to the deployed legacy RPC while preserving the original supplier
-- price and both weights on the receipt item.

ALTER TABLE public.stock_receipt_items
  ALTER COLUMN manual_quantity DROP NOT NULL,
  ALTER COLUMN digital_quantity DROP NOT NULL;

ALTER FUNCTION public.create_stock_receipt_transaction(JSONB)
  RENAME TO create_stock_receipt_transaction_legacy;

CREATE OR REPLACE FUNCTION public.create_stock_receipt_transaction(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  legacy_payload JSONB;
  legacy_result JSONB;
  v_receipt_id UUID;
  item JSONB;
  manual_quantity_value NUMERIC;
  digital_quantity_value NUMERIC;
  unit_cost_value NUMERIC;
BEGIN
  IF jsonb_array_length(COALESCE(p_payload->'items', '[]')) = 0 THEN
    RAISE EXCEPTION 'Penerimaan stok harus memiliki minimal satu produk';
  END IF;

  -- The deployed legacy RPC uses quantity for stock and unitCost for both
  -- payment and stock valuation. Send digital quantity as quantity and an
  -- effective cost so: digital quantity x effective cost = manual quantity x
  -- supplier cost. This keeps payable total and stock HPP correct.
  SELECT jsonb_agg(
    jsonb_set(
      jsonb_set(item_value, '{quantity}', to_jsonb(digital_quantity_value), true),
      '{unitCost}', to_jsonb(ROUND(manual_quantity_value * unit_cost_value / digital_quantity_value, 2)), true
    )
  )
  INTO legacy_payload
  FROM (
    SELECT item_value,
      ROUND(COALESCE((item_value->>'manualQuantity')::NUMERIC, (item_value->>'quantity')::NUMERIC, 0), 3) AS manual_quantity_value,
      ROUND(COALESCE((item_value->>'digitalQuantity')::NUMERIC, (item_value->>'quantity')::NUMERIC, 0), 3) AS digital_quantity_value,
      ROUND(COALESCE((item_value->>'unitCost')::NUMERIC, 0), 2) AS unit_cost_value
    FROM jsonb_array_elements(p_payload->'items') AS payload_item(item_value)
  ) AS normalized_items;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(legacy_payload, '[]')) AS payload_item(item_value)
    WHERE COALESCE((item_value->>'quantity')::NUMERIC, 0) <= 0
      OR COALESCE((item_value->>'unitCost')::NUMERIC, 0) <= 0
  ) THEN
    RAISE EXCEPTION 'Berat manual, berat digital, dan harga beli penerimaan harus lebih dari nol';
  END IF;

  legacy_payload := jsonb_set(p_payload, '{items}', legacy_payload, true);
  legacy_result := public.create_stock_receipt_transaction_legacy(legacy_payload);
  v_receipt_id := (legacy_result->>'receiptId')::UUID;

  -- The legacy RPC has already added digital quantity to stock and created its
  -- batch using the effective cost. Complete the audit/payment facts here.
  FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
    manual_quantity_value := ROUND(COALESCE((item->>'manualQuantity')::NUMERIC, (item->>'quantity')::NUMERIC, 0), 3);
    digital_quantity_value := ROUND(COALESCE((item->>'digitalQuantity')::NUMERIC, (item->>'quantity')::NUMERIC, 0), 3);
    unit_cost_value := ROUND(COALESCE((item->>'unitCost')::NUMERIC, 0), 2);

    UPDATE public.stock_receipt_items
    SET manual_quantity = manual_quantity_value,
        digital_quantity = digital_quantity_value,
        unit_cost = unit_cost_value,
        subtotal = ROUND(manual_quantity_value * unit_cost_value, 2)
    WHERE stock_receipt_items.receipt_id = v_receipt_id
      AND product_id = (item->>'productId')::UUID;

    -- The legacy RPC created the batch using the effective digital-unit cost.
    -- Re-apply it from the now-correct payment subtotal so this also remains
    -- correct when all migrations are installed on a fresh database.
    UPDATE public.stock_batches AS batch
    SET quantity_received = digital_quantity_value,
        quantity_remaining = digital_quantity_value,
        unit_cost = ROUND(manual_quantity_value * unit_cost_value / digital_quantity_value, 2)
    WHERE batch.receipt_item_id = (
      SELECT receipt_item.id
      FROM public.stock_receipt_items AS receipt_item
      WHERE receipt_item.receipt_id = v_receipt_id
        AND receipt_item.product_id = (item->>'productId')::UUID
    );
  END LOOP;

  RETURN legacy_result;
END;
$$;

ALTER TABLE public.stock_receipt_items
  ALTER COLUMN manual_quantity SET NOT NULL,
  ALTER COLUMN digital_quantity SET NOT NULL;

REVOKE ALL ON FUNCTION public.create_stock_receipt_transaction_legacy(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_stock_receipt_transaction(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_receipt_transaction(JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
