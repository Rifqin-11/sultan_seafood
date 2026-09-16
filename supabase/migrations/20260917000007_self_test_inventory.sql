-- =====================================================
-- Self-test for inventory reversal idempotency.
-- Runs inside a subtransaction that is always rolled back, so it never leaves
-- data behind. It is executed once at migration time and stays available for
-- manual re-runs.
-- =====================================================

CREATE OR REPLACE FUNCTION public.self_test_inventory_reversal()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  product_id_value UUID;
  customer_id_value UUID;
  invoice_id_value UUID;
  balance_before NUMERIC;
  balance_after_issue NUMERIC;
  balance_after_void NUMERIC;
  batch_before NUMERIC;
  batch_after_issue NUMERIC;
  batch_after_void NUMERIC;
  return_count INTEGER;
BEGIN
  BEGIN
    INSERT INTO public.products(id, name, sku, category, size, default_unit, default_selling_price, status)
    VALUES (gen_random_uuid(), 'SELF TEST PRODUCT', 'SELFTEST-' || gen_random_uuid(), 'Test', 'Test', 'kg', 100000, 'ACTIVE')
    RETURNING id INTO product_id_value;

    INSERT INTO public.customers(id, name, contact_name, phone, billing_address, status, payment_term_days)
    VALUES (gen_random_uuid(), 'SELF TEST CUSTOMER', 'Test', '000', 'Test', 'ACTIVE', 7)
    RETURNING id INTO customer_id_value;

    UPDATE public.stock_balances SET quantity = 50, average_unit_cost = 60000, updated_at = NOW()
    WHERE product_id = product_id_value;

    INSERT INTO public.stock_movements(product_id, product_name_snapshot, unit, movement_type, quantity_delta, balance_after, notes, occurred_at)
    VALUES (product_id_value, 'SELF TEST PRODUCT', 'kg', 'ADJUSTMENT_IN', 50, 50, 'self test seed', NOW());

    SELECT quantity INTO balance_before FROM public.stock_balances WHERE product_id = product_id_value;
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO batch_before FROM public.stock_batches WHERE product_id = product_id_value AND status = 'OPEN';

    INSERT INTO public.invoices(id, public_token, invoice_number, customer_id, issue_date, due_date, status,
      subtotal, discount, total, total_paid, remaining_balance, total_product_cost, total_direct_cost,
      product_profit, transaction_profit, transaction_margin, created_by)
    VALUES (gen_random_uuid(), gen_random_uuid(), 'SELFTEST/VOID/0001', customer_id_value, CURRENT_DATE, CURRENT_DATE + 7, 'DRAFT',
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, auth.uid())
    RETURNING id INTO invoice_id_value;

    INSERT INTO public.invoice_items(id, invoice_id, product_id, description_snapshot, quantity, margin_quantity, unit,
      selling_price_snapshot, purchase_price_snapshot, subtotal, product_cost_total, profit)
    VALUES (gen_random_uuid(), invoice_id_value, product_id_value, 'SELF TEST PRODUCT', 19, 0, 'kg',
      100000, 60000, 1900000, 1140000, 760000);

    -- Issue: deferred trigger deducts stock. Force deferred triggers to run now.
    UPDATE public.invoices SET status = 'ISSUED' WHERE id = invoice_id_value;
    SET CONSTRAINTS ALL IMMEDIATE;

    SELECT quantity INTO balance_after_issue FROM public.stock_balances WHERE product_id = product_id_value;
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO batch_after_issue FROM public.stock_batches WHERE product_id = product_id_value AND status = 'OPEN';

    -- Restore explicitly, then set VOID. Deferred trigger must NOT double-restock.
    PERFORM public.restore_invoice_stock(invoice_id_value);
    UPDATE public.invoices SET status = 'VOID', remaining_balance = 0 WHERE id = invoice_id_value;
    SET CONSTRAINTS ALL IMMEDIATE;

    SELECT quantity INTO balance_after_void FROM public.stock_balances WHERE product_id = product_id_value;
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO batch_after_void FROM public.stock_batches WHERE product_id = product_id_value AND status = 'OPEN';
    SELECT COUNT(*) INTO return_count FROM public.stock_movements WHERE invoice_id = invoice_id_value AND movement_type = 'INVOICE_VOID_RETURN';

    result := jsonb_build_object(
      'balance_before', balance_before,
      'balance_after_issue', balance_after_issue,
      'balance_after_void', balance_after_void,
      'batch_before', batch_before,
      'batch_after_issue', batch_after_issue,
      'batch_after_void', batch_after_void,
      'return_movements', return_count,
      'issue_ok', balance_after_issue = balance_before - 19,
      'void_balance_ok', balance_after_void = balance_before,
      'void_batch_ok', batch_after_void = batch_before,
      'single_return_ok', return_count = 1
    );

    RAISE EXCEPTION 'SELF_TEST_ROLLBACK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'SELF_TEST_ROLLBACK' THEN RAISE; END IF;
  END;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.self_test_inventory_reversal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_test_inventory_reversal() TO authenticated;

-- Run once at migration time to verify the reversal chain.
DO $$
DECLARE test_result JSONB;
BEGIN
  SELECT public.self_test_inventory_reversal() INTO test_result;
  IF NOT (test_result->>'issue_ok')::BOOLEAN
     OR NOT (test_result->>'void_balance_ok')::BOOLEAN
     OR NOT (test_result->>'void_batch_ok')::BOOLEAN
     OR NOT (test_result->>'single_return_ok')::BOOLEAN THEN
    RAISE EXCEPTION 'Self test gagal: %', test_result;
  END IF;
  RAISE NOTICE 'Self test inventory reversal lulus: %', test_result;
END $$;
