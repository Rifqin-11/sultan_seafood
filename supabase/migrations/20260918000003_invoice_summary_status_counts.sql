-- Add per-status counts to the invoice summary so status filter tabs stay
-- accurate while the list itself is paginated. Read-only, no data changes.
CREATE OR REPLACE FUNCTION public.get_invoice_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value public.user_role := public.current_user_role();
  search_value TEXT := NULLIF(BTRIM(p_search), '');
  result_value JSONB;
BEGIN
  IF role_value IS NULL THEN RAISE EXCEPTION 'Akun belum disetujui'; END IF;

  SELECT jsonb_build_object(
    'totalInvoiceCount', COUNT(*) FILTER (WHERE effective_status <> 'VOID'),
    'totalInvoiceAmount', COALESCE(SUM(total) FILTER (WHERE effective_status <> 'VOID'), 0),
    'paidCount', COUNT(*) FILTER (WHERE effective_status = 'PAID'),
    'totalPaidAmount', COALESCE(SUM(total) FILTER (WHERE effective_status = 'PAID'), 0),
    'unpaidCount', COUNT(*) FILTER (WHERE effective_status IN ('ISSUED','PARTIALLY_PAID','OVERDUE')),
    'totalUnpaidAmount', COALESCE(SUM(remaining_balance) FILTER (WHERE effective_status IN ('ISSUED','PARTIALLY_PAID','OVERDUE')), 0),
    'overdueCount', COUNT(*) FILTER (WHERE effective_status = 'OVERDUE'),
    'totalOverdueAmount', COALESCE(SUM(remaining_balance) FILTER (WHERE effective_status = 'OVERDUE'), 0),
    'statusCounts', jsonb_build_object(
      'ALL', COUNT(*) FILTER (WHERE effective_status <> 'VOID'),
      'DRAFT', COUNT(*) FILTER (WHERE effective_status = 'DRAFT'),
      'ISSUED', COUNT(*) FILTER (WHERE effective_status = 'ISSUED'),
      'PARTIALLY_PAID', COUNT(*) FILTER (WHERE effective_status = 'PARTIALLY_PAID'),
      'PAID', COUNT(*) FILTER (WHERE effective_status = 'PAID'),
      'OVERDUE', COUNT(*) FILTER (WHERE effective_status = 'OVERDUE')
    )
  )
  INTO result_value
  FROM (
    SELECT
      CASE
        WHEN i.status IN ('ISSUED','PARTIALLY_PAID') AND i.due_date < CURRENT_DATE THEN 'OVERDUE'
        ELSE i.status::TEXT
      END AS effective_status,
      i.total,
      i.remaining_balance
    FROM public.invoices i
    JOIN public.customers c ON c.id = i.customer_id
    WHERE (p_start_date IS NULL OR i.issue_date >= p_start_date)
      AND (p_end_date IS NULL OR i.issue_date <= p_end_date)
      AND (role_value IN ('OWNER','FINANCE') OR i.created_by = auth.uid())
      AND (
        search_value IS NULL
        OR i.invoice_number ILIKE '%' || search_value || '%'
        OR c.name ILIKE '%' || search_value || '%'
      )
      AND (
        p_status IS NULL OR p_status = 'ALL'
        OR (CASE
              WHEN i.status IN ('ISSUED','PARTIALLY_PAID') AND i.due_date < CURRENT_DATE THEN 'OVERDUE'
              ELSE i.status::TEXT
            END) = p_status
      )
  ) rows;

  RETURN result_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invoice_summary(DATE, DATE, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invoice_summary(DATE, DATE, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
