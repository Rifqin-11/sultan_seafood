-- =====================================================
-- Parity test for stock page summary + paginated list.
-- Proves the summary matches a manual full computation and that pages return
-- only a bounded slice. Rolled back, no data changes.
-- =====================================================

CREATE OR REPLACE FUNCTION public.self_test_stock_pagination()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
  result JSONB;
  summary JSONB;
  page_payload JSONB;
  manual_count INTEGER;
  manual_qty NUMERIC;
  manual_value NUMERIC;
  manual_low INTEGER;
  manual_out INTEGER;
  page_total INTEGER;
  page_rows INTEGER;
  balance_rows INT;
BEGIN
  SELECT id INTO owner_id FROM public.profiles WHERE role = 'OWNER' AND status = 'APPROVED' LIMIT 1;
  IF owner_id IS NULL THEN
    RETURN jsonb_build_object('skipped', TRUE, 'reason', 'no approved owner');
  END IF;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id::text)::text, true);

    SELECT public.get_stock_page_summary() INTO summary;
    SELECT public.get_stock_balances_page(NULL, NULL, NULL, NULL, 'productName', 'asc', 5, 0) INTO page_payload;

    SELECT
      COUNT(*),
      COALESCE(SUM(balance.quantity), 0),
      COALESCE(SUM(CASE
        WHEN batch_value.quantity IS NULL THEN balance.quantity * balance.average_unit_cost
        ELSE batch_value.value + GREATEST(0, balance.quantity - batch_value.quantity) * balance.average_unit_cost
      END), 0),
      COUNT(*) FILTER (WHERE balance.minimum_quantity > 0 AND balance.quantity <= balance.minimum_quantity),
      COUNT(*) FILTER (WHERE balance.quantity <= 0)
    INTO manual_count, manual_qty, manual_value, manual_low, manual_out
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

    page_total := (page_payload->>'total')::INTEGER;
    page_rows := jsonb_array_length(page_payload->'rows');
    SELECT COUNT(*) INTO balance_rows FROM public.stock_balances;

    result := jsonb_build_object(
      'count_match', (summary->>'activeProductCount')::INTEGER = manual_count,
      'quantity_match', (summary->>'totalQuantity')::NUMERIC = manual_qty,
      'value_match', (summary->>'totalStockValue')::NUMERIC = manual_value,
      'low_match', (summary->>'lowStockCount')::INTEGER = manual_low,
      'out_match', (summary->>'outOfStockCount')::INTEGER = manual_out,
      'page_total_match', page_total = balance_rows,
      'page_bounded', page_rows <= 5,
      'summary', summary,
      'manual_count', manual_count,
      'manual_qty', manual_qty,
      'manual_value', manual_value,
      'page_total', page_total,
      'balance_rows', balance_rows,
      'page_rows', page_rows
    );

    RAISE EXCEPTION 'SELF_TEST_ROLLBACK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'SELF_TEST_ROLLBACK' THEN RAISE; END IF;
  END;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.self_test_stock_pagination() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_test_stock_pagination() TO authenticated;

DO $$
DECLARE test_result JSONB;
BEGIN
  SELECT public.self_test_stock_pagination() INTO test_result;
  IF (test_result ? 'skipped') THEN
    RAISE NOTICE 'Self test stock pagination dilewati: %', test_result;
    RETURN;
  END IF;
  IF NOT (test_result->>'count_match')::BOOLEAN
     OR NOT (test_result->>'quantity_match')::BOOLEAN
     OR NOT (test_result->>'value_match')::BOOLEAN
     OR NOT (test_result->>'low_match')::BOOLEAN
     OR NOT (test_result->>'out_match')::BOOLEAN
     OR NOT (test_result->>'page_total_match')::BOOLEAN
     OR NOT (test_result->>'page_bounded')::BOOLEAN THEN
    RAISE EXCEPTION 'Self test stock pagination gagal: %', test_result;
  END IF;
  RAISE NOTICE 'Self test stock pagination lulus: %', test_result;
END $$;
