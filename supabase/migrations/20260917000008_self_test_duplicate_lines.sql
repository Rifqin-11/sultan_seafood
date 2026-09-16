-- =====================================================
-- Second self-test: duplicate product lines and double-restore idempotency.
-- Runs in a rolled-back subtransaction. Executed at migration time.
-- =====================================================

CREATE OR REPLACE FUNCTION public.self_test_duplicate_lines_reversal()
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
  balance_after_restore NUMERIC;
  balance_after_second_restore NUMERIC;
  batch_before NUMERIC;
  batch_after_restore NUMERIC;
  return_count INTEGER;
BEGIN
  BEGIN
    INSERT INTO public.products(id, name, sku, category, size, default_unit, default_selling_price, status)
    VALUES (gen_random_uuid(), 'SELF TEST DUP', 'SELFTEST-DUP-' || gen_random_uuid(), 'Test', 'Test', 'kg', 100000, 'ACTIVE')
    RETURNING id INTO product_id_value;

    INSERT INTO public.customers(id, name, contact_name, phone, billing_address, status, payment_term_days)
    VALUES (gen_random_uuid(), 'SELF TEST DUP CUSTOMER', 'Test', '000', 'Test', 'ACTIVE', 7)
    RETURNING id INTO customer_id_value;

    UPDATE public.stock_balances SET quantity = 50, average_unit_cost = 60000, updated_at = NOW()
    WHERE product_id = product_id_value;

    INSERT INTO public.stock_movements(product_id, product_name_snapshot, unit, movement_type, quantity_delta, balance_after, notes, occurred_at)
    VALUES (product_id_value, 'SELF TEST DUP', 'kg', 'ADJUSTMENT_IN', 50, 50, 'self test dup seed', NOW());

    SELECT quantity INTO balance_before FROM public.stock_balances WHERE product_id = product_id_value;
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO batch_before FROM public.stock_batches WHERE product_id = product_id_value AND status = 'OPEN';

    INSERT INTO public.invoices(id, public_token, invoice_number, customer_id, issue_date, due_date, status,
      subtotal, discount, total, total_paid, remaining_balance, total_product_cost, total_direct_cost,
      product_profit, transaction_profit, transaction_margin, created_by)
    VALUES (gen_random_uuid(), gen_random_uuid(), 'SELFTEST/DUP/0001', customer_id_value, CURRENT_DATE, CURRENT_DATE + 7, 'DRAFT',
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, auth.uid())
    RETURNING id INTO invoice_id_value;

    -- Two lines for the SAME product: 10kg and 9kg (total 19kg).
    INSERT INTO public.invoice_items(id, invoice_id, product_id, description_snapshot, quantity, margin_quantity, unit,
      selling_price_snapshot, purchase_price_snapshot, subtotal, product_cost_total, profit)
    VALUES
      (gen_random_uuid(), invoice_id_value, product_id_value, 'SELF TEST DUP', 10, 0, 'kg', 100000, 60000, 1000000, 600000, 400000),
      (gen_random_uuid(), invoice_id_value, product_id_value, 'SELF TEST DUP', 9, 0, 'kg', 100000, 60000, 900000, 540000, 360000);

    UPDATE public.invoices SET status = 'ISSUED' WHERE id = invoice_id_value;
    SET CONSTRAINTS ALL IMMEDIATE;

    SELECT quantity INTO balance_after_issue FROM public.stock_balances WHERE product_id = product_id_value;

    -- First restore: must return exactly 19kg across two return movements.
    PERFORM public.restore_invoice_stock(invoice_id_value);
    SET CONSTRAINTS ALL IMMEDIATE;

    SELECT quantity INTO balance_after_restore FROM public.stock_balances WHERE product_id = product_id_value;
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO batch_after_restore FROM public.stock_batches WHERE product_id = product_id_value AND status = 'OPEN';
    SELECT COUNT(*) INTO return_count FROM public.stock_movements WHERE invoice_id = invoice_id_value AND movement_type = 'INVOICE_VOID_RETURN';

    -- Second restore: must be a no-op.
    PERFORM public.restore_invoice_stock(invoice_id_value);
    SET CONSTRAINTS ALL IMMEDIATE;
    SELECT quantity INTO balance_after_second_restore FROM public.stock_balances WHERE product_id = product_id_value;

    result := jsonb_build_object(
      'balance_before', balance_before,
      'balance_after_issue', balance_after_issue,
      'balance_after_restore', balance_after_restore,
      'balance_after_second_restore', balance_after_second_restore,
      'batch_before', batch_before,
      'batch_after_restore', batch_after_restore,
      'return_movements', return_count,
      'issue_ok', balance_after_issue = balance_before - 19,
      'restore_balance_ok', balance_after_restore = balance_before,
      'restore_batch_ok', batch_after_restore = batch_before,
      'two_returns_ok', return_count = 2,
      'second_restore_noop_ok', balance_after_second_restore = balance_before
    );

    RAISE EXCEPTION 'SELF_TEST_ROLLBACK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'SELF_TEST_ROLLBACK' THEN RAISE; END IF;
  END;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.self_test_duplicate_lines_reversal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_test_duplicate_lines_reversal() TO authenticated;

DO $$
DECLARE test_result JSONB;
BEGIN
  SELECT public.self_test_duplicate_lines_reversal() INTO test_result;
  IF NOT (test_result->>'issue_ok')::BOOLEAN
     OR NOT (test_result->>'restore_balance_ok')::BOOLEAN
     OR NOT (test_result->>'restore_batch_ok')::BOOLEAN
     OR NOT (test_result->>'two_returns_ok')::BOOLEAN
     OR NOT (test_result->>'second_restore_noop_ok')::BOOLEAN THEN
    RAISE EXCEPTION 'Self test duplicate lines gagal: %', test_result;
  END IF;
  RAISE NOTICE 'Self test duplicate lines lulus: %', test_result;
END $$;
