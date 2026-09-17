-- =====================================================
-- Performance: dashboard aggregate reads.
-- These functions only READ data and return small aggregates. They never
-- modify data. Cards remain computed from ALL matching rows (no row limit),
-- so summary values stay accurate regardless of table size.
-- =====================================================

-- Daily operating-expense totals for the dashboard chart and net profit.
-- Replaces the previous "fetch 500 rows and sum in Node.js" approach, which
-- could silently undercount periods with more than 500 expenses.
CREATE OR REPLACE FUNCTION public.get_expense_daily_totals(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (expense_date DATE, total NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT expense.expense_date, SUM(expense.amount)::NUMERIC
  FROM public.expenses AS expense
  WHERE (p_start_date IS NULL OR expense.expense_date >= p_start_date)
    AND (p_end_date IS NULL OR expense.expense_date <= p_end_date)
    AND public.current_user_role() IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role)
  GROUP BY expense.expense_date
  ORDER BY expense.expense_date;
$$;

-- Inventory summary already exists via get_inventory_summary(). This companion
-- returns the extra stock KPI counts the dashboard needs without loading rows.
CREATE OR REPLACE FUNCTION public.get_dashboard_stock_summary()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalStockValue', COALESCE(SUM(
      CASE
        WHEN batch_value.quantity IS NULL THEN balance.quantity * balance.average_unit_cost
        ELSE batch_value.value + GREATEST(0, balance.quantity - batch_value.quantity) * balance.average_unit_cost
      END
    ), 0),
    'activeProductCount', COUNT(*),
    'totalQuantity', COALESCE(SUM(balance.quantity), 0)
  )
  FROM public.stock_balances AS balance
  JOIN public.products AS product ON product.id = balance.product_id
  LEFT JOIN LATERAL (
    SELECT
      SUM(batch.quantity_remaining) AS quantity,
      SUM(batch.quantity_remaining * batch.unit_cost) AS value
    FROM public.stock_batches AS batch
    WHERE batch.product_id = balance.product_id
      AND batch.status = 'OPEN'
      AND batch.quantity_remaining > 0
  ) AS batch_value ON TRUE
  WHERE product.status = 'ACTIVE'
    AND public.current_user_role() IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role);
$$;

REVOKE ALL ON FUNCTION public.get_expense_daily_totals(DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_dashboard_stock_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_expense_daily_totals(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stock_summary() TO authenticated;

NOTIFY pgrst, 'reload schema';
