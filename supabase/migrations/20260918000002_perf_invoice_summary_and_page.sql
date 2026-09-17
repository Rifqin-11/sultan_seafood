-- =====================================================
-- Performance: invoice list aggregate + paginated list.
--
-- Summary is computed in SQL over ALL matching invoices, so KPI cards are
-- never truncated. The list returns only one page and NEVER includes invoice
-- items/direct costs; full detail is fetched on demand.
-- =====================================================

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
    'totalOverdueAmount', COALESCE(SUM(remaining_balance) FILTER (WHERE effective_status = 'OVERDUE'), 0)
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

CREATE OR REPLACE FUNCTION public.get_invoices_page(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value public.user_role := public.current_user_role();
  search_value TEXT := NULLIF(BTRIM(p_search), '');
  safe_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  safe_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
  result_value JSONB;
BEGIN
  IF role_value IS NULL THEN RAISE EXCEPTION 'Akun belum disetujui'; END IF;

  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM (
      SELECT 1
      FROM public.invoices i
      JOIN public.customers c ON c.id = i.customer_id
      WHERE (p_start_date IS NULL OR i.issue_date >= p_start_date)
        AND (p_end_date IS NULL OR i.issue_date <= p_end_date)
        AND (role_value IN ('OWNER','FINANCE') OR i.created_by = auth.uid())
        AND (search_value IS NULL OR i.invoice_number ILIKE '%' || search_value || '%' OR c.name ILIKE '%' || search_value || '%')
        AND (p_status IS NULL OR p_status = 'ALL'
          OR (CASE WHEN i.status IN ('ISSUED','PARTIALLY_PAID') AND i.due_date < CURRENT_DATE THEN 'OVERDUE' ELSE i.status::TEXT END) = p_status)
    ) counted),
    'rows', COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  )
  INTO result_value
  FROM (
    SELECT jsonb_build_object(
      'id', i.id,
      'publicToken', i.public_token,
      'invoiceNumber', i.invoice_number,
      'customerId', i.customer_id,
      'customerName', c.name,
      'customerPhone', c.phone,
      'issueDate', i.issue_date,
      'dueDate', i.due_date,
      'status', CASE WHEN i.status IN ('ISSUED','PARTIALLY_PAID') AND i.due_date < CURRENT_DATE THEN 'OVERDUE' ELSE i.status::TEXT END,
      'subtotal', i.subtotal,
      'discount', i.discount,
      'total', i.total,
      'totalPaid', i.total_paid,
      'remainingBalance', i.remaining_balance,
      'totalProductCost', CASE WHEN role_value IN ('OWNER','FINANCE') THEN i.total_product_cost ELSE 0 END,
      'totalDirectCost', CASE WHEN role_value IN ('OWNER','FINANCE') THEN i.total_direct_cost ELSE 0 END,
      'productProfit', CASE WHEN role_value IN ('OWNER','FINANCE') THEN i.product_profit ELSE 0 END,
      'transactionProfit', CASE WHEN role_value IN ('OWNER','FINANCE') THEN i.transaction_profit ELSE 0 END,
      'transactionMargin', CASE WHEN role_value IN ('OWNER','FINANCE') THEN i.transaction_margin ELSE 0 END,
      'notes', i.notes,
      'createdBy', i.created_by,
      'createdAt', i.created_at,
      'updatedAt', i.updated_at,
      'marginValue', COALESCE((
        SELECT SUM(GREATEST(COALESCE(ii.margin_quantity, 0), 0) * GREATEST(ii.selling_price_snapshot, 0))
        FROM public.invoice_items ii WHERE ii.invoice_id = i.id
      ), 0),
      'items', '[]'::jsonb,
      'directCosts', '[]'::jsonb
    ) AS row_data
    FROM public.invoices i
    JOIN public.customers c ON c.id = i.customer_id
    WHERE (p_start_date IS NULL OR i.issue_date >= p_start_date)
      AND (p_end_date IS NULL OR i.issue_date <= p_end_date)
      AND (role_value IN ('OWNER','FINANCE') OR i.created_by = auth.uid())
      AND (search_value IS NULL OR i.invoice_number ILIKE '%' || search_value || '%' OR c.name ILIKE '%' || search_value || '%')
      AND (p_status IS NULL OR p_status = 'ALL'
        OR (CASE WHEN i.status IN ('ISSUED','PARTIALLY_PAID') AND i.due_date < CURRENT_DATE THEN 'OVERDUE' ELSE i.status::TEXT END) = p_status)
    ORDER BY i.created_at DESC
    LIMIT safe_limit OFFSET safe_offset
  ) page_rows;

  RETURN result_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invoice_summary(DATE, DATE, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_invoices_page(DATE, DATE, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invoice_summary(DATE, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoices_page(DATE, DATE, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
