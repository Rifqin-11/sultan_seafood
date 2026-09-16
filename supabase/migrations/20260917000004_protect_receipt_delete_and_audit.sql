-- =====================================================
-- Protect receipt deletion: refuse when receipt batches are still allocated
-- to live depletion movements. This prevents breaking future invoice voids.
-- Also adds read-only audit functions (no data changes).
-- =====================================================

CREATE OR REPLACE FUNCTION public.force_delete_stock_receipt(p_receipt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receipt_row public.stock_receipts%ROWTYPE;
  product_ids UUID[];
  actor_name TEXT;
  remaining_quantity NUMERIC;
  remaining_value NUMERIC;
  remaining_average NUMERIC;
  affected_product_id UUID;
  deleted_items INTEGER := 0;
  deleted_movements INTEGER := 0;
  deleted_batches INTEGER := 0;
  blocking_batch RECORD;
BEGIN
  IF public.current_user_role() <> 'OWNER'::public.user_role THEN
    RAISE EXCEPTION 'Hanya Owner yang dapat menghapus pembelian secara permanen';
  END IF;

  SELECT * INTO receipt_row FROM public.stock_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Penerimaan stok tidak ditemukan'; END IF;

  SELECT ARRAY_AGG(DISTINCT product_id) INTO product_ids
  FROM public.stock_receipt_items WHERE receipt_id = p_receipt_id;

  -- Refuse deletion when a receipt batch is referenced by any allocation.
  SELECT b.id, b.product_id, COUNT(a.id) AS allocation_count
  INTO blocking_batch
  FROM public.stock_batches b
  JOIN public.stock_receipt_items item ON item.id = b.receipt_item_id
  JOIN public.stock_batch_allocations a ON a.batch_id = b.id
  WHERE item.receipt_id = p_receipt_id
  GROUP BY b.id, b.product_id
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Pembelian tidak dapat dihapus karena batch-nya masih dipakai oleh % alokasi invoice/penyesuaian. Batalkan atau hapus invoice terkait terlebih dahulu.', blocking_batch.allocation_count;
  END IF;

  DELETE FROM public.stock_batch_allocations allocation
  USING public.stock_batches batch, public.stock_receipt_items item
  WHERE allocation.batch_id = batch.id AND batch.receipt_item_id = item.id AND item.receipt_id = p_receipt_id;
  DELETE FROM public.stock_batches batch
  USING public.stock_receipt_items item
  WHERE batch.receipt_item_id = item.id AND item.receipt_id = p_receipt_id;
  GET DIAGNOSTICS deleted_batches = ROW_COUNT;
  DELETE FROM public.stock_movements WHERE receipt_id = p_receipt_id;
  GET DIAGNOSTICS deleted_movements = ROW_COUNT;
  DELETE FROM public.stock_receipt_items WHERE receipt_id = p_receipt_id;
  GET DIAGNOSTICS deleted_items = ROW_COUNT;

  FOR affected_product_id IN SELECT value FROM UNNEST(COALESCE(product_ids, ARRAY[]::UUID[])) AS values(value)
  LOOP
    SELECT COALESCE(SUM(batch.quantity_remaining), 0), COALESCE(SUM(batch.quantity_remaining * batch.unit_cost), 0)
    INTO remaining_quantity, remaining_value
    FROM public.stock_batches batch
    WHERE batch.product_id = affected_product_id AND batch.quantity_remaining > 0 AND batch.status = 'OPEN';
    remaining_average := CASE WHEN remaining_quantity > 0 THEN ROUND(remaining_value / remaining_quantity, 2) ELSE 0 END;
    UPDATE public.stock_balances SET quantity = remaining_quantity, average_unit_cost = remaining_average, updated_at = NOW()
    WHERE stock_balances.product_id = affected_product_id;
  END LOOP;

  IF receipt_row.supplier_bill_id IS NOT NULL THEN
    DELETE FROM public.supplier_payments WHERE supplier_bill_id = receipt_row.supplier_bill_id;
  END IF;

  SELECT full_name INTO actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
  VALUES (auth.uid(), COALESCE(actor_name, 'Owner'), 'stock_receipts', p_receipt_id, 'STOCK_RECEIPT_FORCE_DELETED',
    jsonb_build_object('receipt_number', receipt_row.receipt_number, 'deleted_items', deleted_items,
      'deleted_movements', deleted_movements, 'deleted_batches', deleted_batches,
      'invoice_history_preserved', TRUE, 'receipt_cancellation_bypassed', TRUE));

  DELETE FROM public.stock_receipts WHERE id = p_receipt_id;
  IF receipt_row.supplier_bill_id IS NOT NULL THEN
    DELETE FROM public.supplier_bills bill
    WHERE bill.id = receipt_row.supplier_bill_id
      AND NOT EXISTS (SELECT 1 FROM public.stock_receipts receipt WHERE receipt.supplier_bill_id = bill.id);
  END IF;

  RETURN jsonb_build_object('receiptNumber', receipt_row.receipt_number, 'invoiceHistoryPreserved', TRUE,
    'deletedItems', deleted_items, 'deletedMovements', deleted_movements, 'deletedBatches', deleted_batches);
END;
$$;

REVOKE ALL ON FUNCTION public.force_delete_stock_receipt(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.force_delete_stock_receipt(UUID) TO authenticated;

-- =====================================================
-- Read-only audit functions. These never modify data.
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_stock_balance_vs_batches()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  balance_quantity NUMERIC,
  open_batch_quantity NUMERIC,
  difference NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sb.product_id,
         p.name::TEXT,
         sb.quantity,
         COALESCE(SUM(CASE WHEN b.status = 'OPEN' THEN b.quantity_remaining ELSE 0 END), 0),
         sb.quantity - COALESCE(SUM(CASE WHEN b.status = 'OPEN' THEN b.quantity_remaining ELSE 0 END), 0)
  FROM public.stock_balances sb
  JOIN public.products p ON p.id = sb.product_id
  LEFT JOIN public.stock_batches b ON b.product_id = sb.product_id
  GROUP BY sb.product_id, p.name, sb.quantity
  HAVING ABS(sb.quantity - COALESCE(SUM(CASE WHEN b.status = 'OPEN' THEN b.quantity_remaining ELSE 0 END), 0)) > 0.0005;
$$;

CREATE OR REPLACE FUNCTION public.audit_depletion_movements_without_allocation()
RETURNS TABLE (
  movement_id UUID,
  product_id UUID,
  movement_type TEXT,
  quantity_delta NUMERIC,
  allocated_quantity NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sm.id, sm.product_id, sm.movement_type::TEXT, sm.quantity_delta,
         COALESCE(SUM(a.quantity), 0)
  FROM public.stock_movements sm
  LEFT JOIN public.stock_batch_allocations a ON a.movement_id = sm.id
  WHERE sm.movement_type IN ('SALE_OUT', 'ADJUSTMENT_OUT')
    AND sm.receipt_item_id IS NULL
  GROUP BY sm.id, sm.product_id, sm.movement_type, sm.quantity_delta
  HAVING ABS(ABS(sm.quantity_delta) - COALESCE(SUM(a.quantity), 0)) > 0.0005;
$$;

CREATE OR REPLACE FUNCTION public.audit_invalid_batches()
RETURNS TABLE (
  batch_id UUID,
  product_id UUID,
  quantity_received NUMERIC,
  quantity_remaining NUMERIC,
  status TEXT,
  issue TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.product_id, b.quantity_received, b.quantity_remaining, b.status,
         CASE
           WHEN b.quantity_remaining > b.quantity_received + 0.0005 THEN 'sisa melebihi diterima'
           WHEN b.quantity_remaining < 0 THEN 'sisa negatif'
           WHEN b.status = 'OPEN' AND b.quantity_remaining <= 0 THEN 'OPEN tanpa sisa'
           WHEN b.status IN ('DEPLETED','CANCELLED') AND b.quantity_remaining <> 0 THEN 'selesai/dibatalkan masih bersisa'
           ELSE 'tidak diketahui'
         END
  FROM public.stock_batches b
  WHERE b.quantity_remaining > b.quantity_received + 0.0005
     OR b.quantity_remaining < 0
     OR (b.status = 'OPEN' AND b.quantity_remaining <= 0)
     OR (b.status IN ('DEPLETED','CANCELLED') AND b.quantity_remaining <> 0);
$$;

CREATE OR REPLACE FUNCTION public.audit_suspicious_returns()
RETURNS TABLE (
  movement_id UUID,
  invoice_id UUID,
  product_id UUID,
  movement_type TEXT,
  quantity_delta NUMERIC,
  invoice_item_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sm.id, sm.invoice_id, sm.product_id, sm.movement_type::TEXT, sm.quantity_delta, sm.invoice_item_id
  FROM public.stock_movements sm
  WHERE sm.movement_type = 'INVOICE_VOID_RETURN'
    AND (sm.quantity_delta < 0 OR sm.invoice_item_id IS NULL);
$$;

REVOKE ALL ON FUNCTION public.audit_stock_balance_vs_batches() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.audit_depletion_movements_without_allocation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.audit_invalid_batches() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.audit_suspicious_returns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_stock_balance_vs_batches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_depletion_movements_without_allocation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_invalid_batches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_suspicious_returns() TO authenticated;
