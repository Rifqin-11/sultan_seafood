-- =====================================================
-- Third self-test: edit issued invoice and force delete, with full stock
-- reconciliation. Runs in a rolled-back subtransaction and sets a local JWT
-- claim so role-gated RPCs can be exercised. Executed at migration time.
-- =====================================================

CREATE OR REPLACE FUNCTION public.self_test_edit_and_force_delete()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  owner_id UUID;
  product_id_value UUID;
  customer_id_value UUID;
  invoice_id_value UUID;
  balance_before NUMERIC;
  balance_after_issue NUMERIC;
  balance_after_edit NUMERIC;
  batch_before NUMERIC;
  batch_after_edit NUMERIC;
  balance_after_delete NUMERIC;
  batch_after_delete NUMERIC;
BEGIN
  SELECT id INTO owner_id FROM public.profiles WHERE role = 'OWNER' AND status = 'APPROVED' LIMIT 1;
  IF owner_id IS NULL THEN
    RETURN jsonb_build_object('skipped', TRUE, 'reason', 'no approved owner');
  END IF;

  BEGIN
    -- Local JWT claim so auth.uid() resolves to the owner inside this subtransaction.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id::text)::text, true);

    INSERT INTO public.products(id, name, sku, category, size, default_unit, default_selling_price, status)
    VALUES (gen_random_uuid(), 'SELF TEST EDIT', 'SELFTEST-EDIT-' || gen_random_uuid(), 'Test', 'Test', 'kg', 100000, 'ACTIVE')
    RETURNING id INTO product_id_value;

    INSERT INTO public.customers(id, name, contact_name, phone, billing_address, status, payment_term_days)
    VALUES (gen_random_uuid(), 'SELF TEST EDIT CUSTOMER', 'Test', '000', 'Test', 'ACTIVE', 7)
    RETURNING id INTO customer_id_value;

    UPDATE public.stock_balances SET quantity = 50, average_unit_cost = 60000, updated_at = NOW()
    WHERE product_id = product_id_value;

    INSERT INTO public.stock_movements(product_id, product_name_snapshot, unit, movement_type, quantity_delta, balance_after, notes, occurred_at)
    VALUES (product_id_value, 'SELF TEST EDIT', 'kg', 'ADJUSTMENT_IN', 50, 50, 'self test edit seed', NOW());

    SELECT quantity INTO balance_before FROM public.stock_balances WHERE product_id = product_id_value;
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO batch_before FROM public.stock_batches WHERE product_id = product_id_value AND status = 'OPEN';

    -- Issued invoice for 19kg.
    INSERT INTO public.invoices(id, public_token, invoice_number, customer_id, issue_date, due_date, status,
      subtotal, discount, total, total_paid, remaining_balance, total_product_cost, total_direct_cost,
      product_profit, transaction_profit, transaction_margin, created_by)
    VALUES (gen_random_uuid(), gen_random_uuid(), 'SELFTEST/EDIT/0001', customer_id_value, CURRENT_DATE, CURRENT_DATE + 7, 'DRAFT',
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, owner_id)
    RETURNING id INTO invoice_id_value;

    INSERT INTO public.invoice_items(id, invoice_id, product_id, description_snapshot, quantity, margin_quantity, unit,
      selling_price_snapshot, purchase_price_snapshot, subtotal, product_cost_total, profit)
    VALUES (gen_random_uuid(), invoice_id_value, product_id_value, 'SELF TEST EDIT', 19, 0, 'kg',
      100000, 60000, 1900000, 1140000, 760000);

    UPDATE public.invoices SET status = 'ISSUED' WHERE id = invoice_id_value;
    SET CONSTRAINTS ALL IMMEDIATE;
    SELECT quantity INTO balance_after_issue FROM public.stock_balances WHERE product_id = product_id_value;

    -- Edit: reduce to 5kg. Stock must go to 45 and batch total must match.
    PERFORM public.update_invoice_transaction(invoice_id_value, jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object(
        'productId', product_id_value, 'quantity', 5, 'marginQuantity', 0,
        'sellingPrice', 100000, 'purchasePrice', 60000)),
      'costs', '[]'::jsonb,
      'discount', 0,
      'dueDate', (CURRENT_DATE + 7)::text,
      'notes', 'self test edit'
    ));
    SET CONSTRAINTS ALL IMMEDIATE;

    SELECT quantity INTO balance_after_edit FROM public.stock_balances WHERE product_id = product_id_value;
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO batch_after_edit FROM public.stock_batches WHERE product_id = product_id_value AND status = 'OPEN';

    -- Force delete: stock must return to 50 and batch total must match.
    PERFORM public.force_delete_invoice(invoice_id_value);
    SET CONSTRAINTS ALL IMMEDIATE;

    SELECT quantity INTO balance_after_delete FROM public.stock_balances WHERE product_id = product_id_value;
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO batch_after_delete FROM public.stock_batches WHERE product_id = product_id_value AND status = 'OPEN';

    result := jsonb_build_object(
      'balance_before', balance_before,
      'balance_after_issue', balance_after_issue,
      'balance_after_edit', balance_after_edit,
      'balance_after_delete', balance_after_delete,
      'batch_before', batch_before,
      'batch_after_edit', batch_after_edit,
      'batch_after_delete', batch_after_delete,
      'issue_ok', balance_after_issue = balance_before - 19,
      'edit_ok', balance_after_edit = balance_before - 5,
      'edit_batch_ok', batch_after_edit = balance_before - 5,
      'delete_ok', balance_after_delete = balance_before,
      'delete_batch_ok', batch_after_delete = batch_before
    );

    RAISE EXCEPTION 'SELF_TEST_ROLLBACK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'SELF_TEST_ROLLBACK' THEN RAISE; END IF;
  END;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.self_test_edit_and_force_delete() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_test_edit_and_force_delete() TO authenticated;

DO $$
DECLARE test_result JSONB;
BEGIN
  SELECT public.self_test_edit_and_force_delete() INTO test_result;
  IF (test_result ? 'skipped') THEN
    RAISE NOTICE 'Self test edit/force delete dilewati: %', test_result;
    RETURN;
  END IF;
  IF NOT (test_result->>'issue_ok')::BOOLEAN
     OR NOT (test_result->>'edit_ok')::BOOLEAN
     OR NOT (test_result->>'edit_batch_ok')::BOOLEAN
     OR NOT (test_result->>'delete_ok')::BOOLEAN
     OR NOT (test_result->>'delete_batch_ok')::BOOLEAN THEN
    RAISE EXCEPTION 'Self test edit/force delete gagal: %', test_result;
  END IF;
  RAISE NOTICE 'Self test edit/force delete lulus: %', test_result;
END $$;
