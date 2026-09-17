-- =====================================================
-- Performance indexes matching the actual query patterns introduced by the
-- paginated/aggregate reads. All are additive (no data changes) and use
-- IF NOT EXISTS so re-running is safe.
-- =====================================================

-- Invoice lists/aggregates filter by issue_date then order by created_at.
CREATE INDEX IF NOT EXISTS idx_invoices_issue_created
  ON public.invoices (issue_date DESC, created_at DESC, id DESC);

-- Staff-scoped invoice reads filter by creator.
CREATE INDEX IF NOT EXISTS idx_invoices_creator_issue_created
  ON public.invoices (created_by, issue_date DESC, created_at DESC);

-- Dashboard/notification overdue count and invoice list "OVERDUE" filter.
CREATE INDEX IF NOT EXISTS idx_invoices_open_due_date
  ON public.invoices (due_date)
  WHERE status IN ('ISSUED', 'PARTIALLY_PAID');

-- Invoice child rows are aggregated/ordered per invoice.
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_created
  ON public.invoice_items (invoice_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_invoice_costs_invoice_created
  ON public.invoice_direct_costs (invoice_id, created_at, id);

-- Stock page: latest purchase fact per product scans receipt items newest-first.
CREATE INDEX IF NOT EXISTS idx_stock_receipt_items_product_created
  ON public.stock_receipt_items (product_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_stock_receipt_items_created
  ON public.stock_receipt_items (created_at DESC, id DESC);

-- Stock movements page orders all movements newest-first with a type filter.
CREATE INDEX IF NOT EXISTS idx_stock_movements_type_occurred
  ON public.stock_movements (movement_type, occurred_at DESC);

-- FEFO/FIFO batch traversal order used by invoice stock allocation.
CREATE INDEX IF NOT EXISTS idx_stock_batches_product_fefo
  ON public.stock_batches (product_id, expiry_date ASC NULLS LAST, received_at, created_at, id)
  WHERE status = 'OPEN' AND quantity_remaining > 0;

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date_created
  ON public.expenses (expense_date DESC, created_at DESC);

NOTIFY pgrst, 'reload schema';
