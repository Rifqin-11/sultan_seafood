-- =====================================================
-- Edit issued invoice with full stock reconciliation.
-- Old stock is restored (via restore_invoice_stock) before new items are
-- applied, then new SALE_OUT movements are created for the new items.
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_invoice_transaction(p_invoice_id UUID, p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor_role public.user_role := public.current_user_role();
  inv_row public.invoices%ROWTYPE;
  customer_row public.customers%ROWTYPE;
  product_row public.products%ROWTYPE;
  item JSONB;
  cost JSONB;
  quantity_value NUMERIC;
  margin_value NUMERIC;
  billing_quantity NUMERIC;
  selling_price NUMERIC;
  purchase_price NUMERIC;
  item_subtotal NUMERIC;
  item_cost NUMERIC;
  subtotal_value NUMERIC := 0;
  product_cost_value NUMERIC := 0;
  direct_cost_value NUMERIC := 0;
  discount_value NUMERIC := COALESCE((p_payload->>'discount')::NUMERIC, 0);
  total_value NUMERIC;
  new_remaining NUMERIC;
  product_profit_value NUMERIC;
  transaction_profit_value NUMERIC;
  margin_percent NUMERIC;
  due_date_value DATE;
  new_item_id UUID;
  balance_row public.stock_balances%ROWTYPE;
  product_name_value TEXT;
  available_quantity NUMERIC;
  requested_quantity NUMERIC;
  new_sale_items JSONB := '[]'::JSONB;
BEGIN
  IF actor_role NOT IN ('OWNER','FINANCE') THEN RAISE EXCEPTION 'Hanya Owner/Finance yang dapat mengedit invoice'; END IF;
  SELECT * INTO inv_row FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice tidak ditemukan'; END IF;
  IF inv_row.status IN ('VOID','DRAFT') THEN RAISE EXCEPTION 'Invoice VOID atau DRAFT tidak dapat diedit dengan fungsi ini'; END IF;
  SELECT * INTO customer_row FROM public.customers WHERE id = inv_row.customer_id;
  IF jsonb_array_length(COALESCE(p_payload->'items', '[]')) = 0 THEN RAISE EXCEPTION 'Invoice harus memiliki minimal satu item'; END IF;

  -- 1) Restore stock of the existing sale exactly once before editing.
  PERFORM public.restore_invoice_stock(p_invoice_id);

  -- 2) Replace items and direct costs.
  DELETE FROM public.invoice_items WHERE invoice_id = p_invoice_id;
  DELETE FROM public.invoice_direct_costs WHERE invoice_id = p_invoice_id;

  due_date_value := COALESCE(NULLIF(BTRIM(p_payload->>'dueDate'), '')::DATE, inv_row.due_date, inv_row.issue_date + customer_row.payment_term_days);

  FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
    quantity_value := (item->>'quantity')::NUMERIC;
    margin_value := ROUND(COALESCE((item->>'marginQuantity')::NUMERIC, 0), 3);
    billing_quantity := quantity_value + margin_value;
    IF quantity_value IS NULL OR quantity_value <= 0 THEN RAISE EXCEPTION 'Jumlah item harus lebih dari nol'; END IF;
    IF margin_value < 0 THEN RAISE EXCEPTION 'Margin item tidak boleh negatif'; END IF;
    SELECT * INTO product_row FROM public.products WHERE id = (item->>'productId')::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak ditemukan'; END IF;
    selling_price := NULLIF((item->>'sellingPrice')::NUMERIC, 0);
    IF selling_price IS NULL OR selling_price <= 0 THEN
      SELECT cp.selling_price INTO selling_price FROM public.customer_prices cp
      WHERE cp.customer_id = customer_row.id AND cp.product_id = product_row.id
        AND cp.effective_at <= NOW() AND (cp.ended_at IS NULL OR cp.ended_at > NOW())
      ORDER BY cp.effective_at DESC LIMIT 1;
      selling_price := COALESCE(selling_price, product_row.default_selling_price);
    END IF;
    IF selling_price IS NULL OR selling_price <= 0 THEN RAISE EXCEPTION 'Harga jual produk belum tersedia'; END IF;
    purchase_price := NULLIF((item->>'purchasePrice')::NUMERIC, 0);
    IF purchase_price IS NULL OR purchase_price <= 0 THEN
      SELECT pc.unit_cost INTO purchase_price FROM public.product_costs pc
      WHERE pc.product_id = product_row.id AND pc.effective_at <= NOW() AND (pc.ended_at IS NULL OR pc.ended_at > NOW())
      ORDER BY pc.effective_at DESC LIMIT 1;
    END IF;
    IF purchase_price IS NULL OR purchase_price <= 0 THEN RAISE EXCEPTION 'HPP aktif produk belum tersedia'; END IF;
    item_subtotal := ROUND(billing_quantity * selling_price, 2);
    item_cost := ROUND(quantity_value * purchase_price, 2);
    subtotal_value := subtotal_value + item_subtotal;
    product_cost_value := product_cost_value + item_cost;

    new_item_id := gen_random_uuid();
    INSERT INTO public.invoice_items(id, invoice_id, product_id, description_snapshot, quantity, margin_quantity, unit, selling_price_snapshot, purchase_price_snapshot, subtotal, product_cost_total, profit)
    VALUES (new_item_id, p_invoice_id, product_row.id,
      product_row.name || CASE WHEN product_row.size IS NOT NULL THEN ' [' || product_row.size || ']' ELSE '' END,
      quantity_value, margin_value, product_row.default_unit, selling_price, purchase_price, item_subtotal, item_cost, item_subtotal - item_cost);

    new_sale_items := new_sale_items || jsonb_build_object(
      'itemId', new_item_id,
      'productId', product_row.id,
      'productName', product_row.name || CASE WHEN product_row.size IS NOT NULL THEN ' [' || product_row.size || ']' ELSE '' END,
      'unit', product_row.default_unit,
      'quantity', quantity_value
    );
  END LOOP;

  FOR cost IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'costs', '[]')) LOOP
    IF COALESCE((cost->>'amount')::NUMERIC, 0) <= 0 THEN RAISE EXCEPTION 'Biaya internal harus lebih dari nol'; END IF;
    direct_cost_value := direct_cost_value + (cost->>'amount')::NUMERIC;
    INSERT INTO public.invoice_direct_costs(id, invoice_id, category, name, amount, notes)
    VALUES (gen_random_uuid(), p_invoice_id, (cost->>'category')::public.direct_cost_category, LEFT(BTRIM(cost->>'name'), 120), (cost->>'amount')::NUMERIC, NULLIF(BTRIM(cost->>'notes'), ''));
  END LOOP;

  IF discount_value > subtotal_value THEN RAISE EXCEPTION 'Diskon melebihi subtotal'; END IF;

  -- 3) Validate availability against stock_balances (source of truth), aggregated per product.
  PERFORM sb.product_id
  FROM public.stock_balances sb
  WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(new_sale_items) AS sale_item
    WHERE (sale_item->>'productId')::UUID = sb.product_id
  )
  ORDER BY sb.product_id
  FOR UPDATE;

  SELECT p.name, sb.quantity, req.requested_quantity
  INTO product_name_value, available_quantity, requested_quantity
  FROM public.stock_balances sb
  JOIN public.products p ON p.id = sb.product_id
  JOIN (
    SELECT (sale_item->>'productId')::UUID AS product_id, SUM((sale_item->>'quantity')::NUMERIC) AS requested_quantity
    FROM jsonb_array_elements(new_sale_items) AS sale_item
    GROUP BY (sale_item->>'productId')::UUID
  ) req ON req.product_id = sb.product_id
  WHERE sb.quantity < req.requested_quantity
  ORDER BY sb.product_id
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Stok % tidak cukup. Tersedia %, dibutuhkan %', product_name_value, available_quantity, requested_quantity;
  END IF;

  -- 4) Apply new stock deduction and create SALE_OUT movements (FIFO via trigger).
  FOR item IN SELECT value FROM jsonb_array_elements(new_sale_items) LOOP
    UPDATE public.stock_balances
    SET quantity = quantity - (item->>'quantity')::NUMERIC, updated_at = NOW()
    WHERE product_id = (item->>'productId')::UUID
    RETURNING * INTO balance_row;

    INSERT INTO public.stock_movements(
      product_id, product_name_snapshot, unit, movement_type, quantity_delta,
      balance_after, customer_id, invoice_id, invoice_item_id, notes, occurred_at, created_by
    ) VALUES (
      (item->>'productId')::UUID, item->>'productName', item->>'unit', 'SALE_OUT',
      -(item->>'quantity')::NUMERIC, balance_row.quantity, inv_row.customer_id,
      p_invoice_id, (item->>'itemId')::UUID, COALESCE(inv_row.invoice_number, 'Invoice'), inv_row.issue_date, auth.uid()
    );
  END LOOP;

  total_value := subtotal_value - discount_value;
  new_remaining := GREATEST(total_value - inv_row.total_paid, 0);
  product_profit_value := total_value - product_cost_value;
  transaction_profit_value := product_profit_value - direct_cost_value;
  margin_percent := CASE WHEN total_value = 0 THEN 0 ELSE ROUND(transaction_profit_value / total_value * 100, 2) END;

  UPDATE public.invoices
  SET due_date = due_date_value, notes = NULLIF(BTRIM(p_payload->>'notes'), ''),
      discount = discount_value, subtotal = subtotal_value, total = total_value,
      remaining_balance = new_remaining, total_product_cost = product_cost_value,
      total_direct_cost = direct_cost_value, product_profit = product_profit_value,
      transaction_profit = transaction_profit_value, transaction_margin = margin_percent,
      updated_at = NOW()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object('invoiceId', p_invoice_id, 'newTotal', total_value, 'newRemaining', new_remaining);
END; $$;

REVOKE ALL ON FUNCTION public.update_invoice_transaction(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_invoice_transaction(UUID, JSONB) TO authenticated;
