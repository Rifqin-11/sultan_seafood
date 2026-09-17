-- =====================================================
-- Parity test for the dashboard aggregate RPCs.
-- Proves the aggregates match a manual computation over ALL rows (no limit),
-- using a real OWNER identity. Runs in a rolled-back subtransaction.
-- =====================================================

CREATE OR REPLACE FUNCTION public.self_test_dashboard_aggregates()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  result JSONB;
  rpc_summary JSONB;
  manual_value NUMERIC;
  manual_count INTEGER;
  manual_qty NUMERIC;
  rpc_expense_total NUMERIC;
  manual_expense_total NUMERIC;
BEGIN
  SELECT id INTO owner_id FROM public.profiles WHERE role = 'OWNER' AND status = 'APPROVED' LIMIT 1;
  IF owner_id IS NULL THEN
    RETURN jsonb_build_object('skipped', TRUE, 'reason', 'no approved owner');
  END IF;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id::text)::text, true);

    SELECT public.get_dashboard_stock_summary() INTO rpc_summary;

    SELECT
      COALESCE(SUM(
        CASE
          WHEN batch_value.quantity IS NULL THEN balance.quantity * balance.average_unit_cost
          ELSE batch_value.value + GREATEST(0, balance.quantity - batch_value.quantity) * balance.average_unit_cost
        END
      ), 0),
      COUNT(*),
      COALESCE(SUM(balance.quantity), 0)
    INTO manual_value, manual_count, manual_qty
    FROM public.stock_balances AS balance
    JOIN public.products AS product ON product.id = balance.product_id
    LEFT JOIN LATERAL (
      SELECT SUM(batch.quantity_remaining) AS quantity,
             SUM(batch.quantity_remaining * batch.unit_cost) AS value
      FROM public.stock_batches AS batch
      WHERE batch.product_id = balance.product_id
        AND batch.status = 'OPEN'
        AND batch.quantity_remaining > 0
    ) AS batch_value ON TRUE
    WHERE product.status = 'ACTIVE';

    SELECT COALESCE(SUM(total), 0) INTO rpc_expense_total FROM public.get_expense_daily_totals(NULL, NULL);
    SELECT COALESCE(SUM(amount), 0) INTO manual_expense_total FROM public.expenses;

    result := jsonb_build_object(
      'stock_value_match', (rpc_summary->>'totalStockValue')::NUMERIC = manual_value,
      'product_count_match', (rpc_summary->>'activeProductCount')::NUMERIC = manual_count,
      'quantity_match', (rpc_summary->>'totalQuantity')::NUMERIC = manual_qty,
      'expense_total_match', rpc_expense_total = manual_expense_total,
      'rpc_summary', rpc_summary,
      'manual_value', manual_value,
      'manual_count', manual_count,
      'manual_qty', manual_qty,
      'rpc_expense_total', rpc_expense_total,
      'manual_expense_total', manual_expense_total
    );

    RAISE EXCEPTION 'SELF_TEST_ROLLBACK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'SELF_TEST_ROLLBACK' THEN RAISE; END IF;
  END;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.self_test_dashboard_aggregates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_test_dashboard_aggregates() TO authenticated;

DO $$
DECLARE test_result JSONB;
BEGIN
  SELECT public.self_test_dashboard_aggregates() INTO test_result;
  IF (test_result ? 'skipped') THEN
    RAISE NOTICE 'Self test dashboard aggregates dilewati: %', test_result;
    RETURN;
  END IF;
  IF NOT (test_result->>'stock_value_match')::BOOLEAN
     OR NOT (test_result->>'product_count_match')::BOOLEAN
     OR NOT (test_result->>'quantity_match')::BOOLEAN
     OR NOT (test_result->>'expense_total_match')::BOOLEAN THEN
    RAISE EXCEPTION 'Self test dashboard aggregates gagal: %', test_result;
  END IF;
  RAISE NOTICE 'Self test dashboard aggregates lulus: %', test_result;
END $$;
