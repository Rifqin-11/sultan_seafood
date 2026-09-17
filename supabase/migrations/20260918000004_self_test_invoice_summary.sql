-- =====================================================
-- Parity test for invoice summary + paginated list.
-- Proves the summary matches a manual full-table computation and that the
-- paginated list returns the correct page without items. Rolled back.
-- =====================================================

CREATE OR REPLACE FUNCTION public.self_test_invoice_summary()
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
  manual_total_count INTEGER;
  manual_total_amount NUMERIC;
  manual_overdue_count INTEGER;
  page_rows_count INTEGER;
  page_total INTEGER;
  rows_with_items INTEGER;
BEGIN
  SELECT id INTO owner_id FROM public.profiles WHERE role = 'OWNER' AND status = 'APPROVED' LIMIT 1;
  IF owner_id IS NULL THEN
    RETURN jsonb_build_object('skipped', TRUE, 'reason', 'no approved owner');
  END IF;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id::text)::text, true);

    SELECT public.get_invoice_summary(NULL, NULL, NULL, NULL) INTO summary;
    SELECT public.get_invoices_page(NULL, NULL, NULL, NULL, 5, 0) INTO page_payload;

    SELECT COUNT(*), COALESCE(SUM(total), 0)
    INTO manual_total_count, manual_total_amount
    FROM (
      SELECT i.total,
             CASE WHEN i.status IN ('ISSUED','PARTIALLY_PAID') AND i.due_date < CURRENT_DATE THEN 'OVERDUE' ELSE i.status::TEXT END AS effective_status
      FROM public.invoices i
    ) rows
    WHERE effective_status <> 'VOID';

    SELECT COUNT(*) INTO manual_overdue_count
    FROM (
      SELECT CASE WHEN i.status IN ('ISSUED','PARTIALLY_PAID') AND i.due_date < CURRENT_DATE THEN 'OVERDUE' ELSE i.status::TEXT END AS effective_status
      FROM public.invoices i
    ) rows
    WHERE effective_status = 'OVERDUE';

    page_total := (page_payload->>'total')::INTEGER;
    page_rows_count := jsonb_array_length(page_payload->'rows');
    SELECT COUNT(*) INTO rows_with_items
    FROM jsonb_array_elements(page_payload->'rows') AS row
    WHERE jsonb_array_length(row->'items') > 0;

    result := jsonb_build_object(
      'count_match', (summary->>'totalInvoiceCount')::INTEGER = manual_total_count,
      'amount_match', (summary->>'totalInvoiceAmount')::NUMERIC = manual_total_amount,
      'overdue_match', (summary->>'overdueCount')::INTEGER = manual_overdue_count,
      'page_total_match', page_total = manual_total_count,
      'page_size_ok', page_rows_count <= 5,
      'no_items_in_list', rows_with_items = 0,
      'summary', summary,
      'manual_total_count', manual_total_count,
      'manual_total_amount', manual_total_amount,
      'manual_overdue_count', manual_overdue_count,
      'page_total', page_total,
      'page_rows_count', page_rows_count
    );

    RAISE EXCEPTION 'SELF_TEST_ROLLBACK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'SELF_TEST_ROLLBACK' THEN RAISE; END IF;
  END;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.self_test_invoice_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_test_invoice_summary() TO authenticated;

DO $$
DECLARE test_result JSONB;
BEGIN
  SELECT public.self_test_invoice_summary() INTO test_result;
  IF (test_result ? 'skipped') THEN
    RAISE NOTICE 'Self test invoice summary dilewati: %', test_result;
    RETURN;
  END IF;
  IF NOT (test_result->>'count_match')::BOOLEAN
     OR NOT (test_result->>'amount_match')::BOOLEAN
     OR NOT (test_result->>'overdue_match')::BOOLEAN
     OR NOT (test_result->>'page_total_match')::BOOLEAN
     OR NOT (test_result->>'page_size_ok')::BOOLEAN
     OR NOT (test_result->>'no_items_in_list')::BOOLEAN THEN
    RAISE EXCEPTION 'Self test invoice summary gagal: %', test_result;
  END IF;
  RAISE NOTICE 'Self test invoice summary lulus: %', test_result;
END $$;
