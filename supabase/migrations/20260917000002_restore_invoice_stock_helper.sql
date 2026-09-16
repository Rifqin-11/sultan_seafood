-- =====================================================
-- Consolidated, safe fix for invoice stock restoration.
-- Design:
--   * One explicit helper restores stock exactly once per SALE_OUT movement.
--   * Return movements keep the original invoice_item_id so the existing
--     unique index (invoice_item_id, movement_type) guarantees idempotency
--     and the existing batch trigger can restore FIFO allocations.
--   * stock_balances.quantity remains the source of truth for availability.
--   * No historical data is modified by this migration.
-- =====================================================

CREATE OR REPLACE FUNCTION public.restore_invoice_stock(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sale_row RECORD;
  balance_row public.stock_balances%ROWTYPE;
BEGIN
  -- Lock every affected balance row first (deterministic order).
  PERFORM sb.product_id
  FROM public.stock_balances sb
  WHERE EXISTS (
    SELECT 1 FROM public.stock_movements sm
    WHERE sm.invoice_id = p_invoice_id
      AND sm.movement_type = 'SALE_OUT'
      AND sm.product_id = sb.product_id
  )
  ORDER BY sb.product_id
  FOR UPDATE;

  FOR sale_row IN
    SELECT sm.id, sm.product_id, sm.product_name_snapshot, sm.unit,
           sm.quantity_delta, sm.customer_id, sm.invoice_item_id
    FROM public.stock_movements sm
    WHERE sm.invoice_id = p_invoice_id
      AND sm.movement_type = 'SALE_OUT'
      AND sm.invoice_item_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.stock_movements ret
        WHERE ret.invoice_item_id = sm.invoice_item_id
          AND ret.movement_type = 'INVOICE_VOID_RETURN'
      )
    ORDER BY sm.product_id, sm.id
  LOOP
    UPDATE public.stock_balances
    SET quantity = quantity + ABS(sale_row.quantity_delta), updated_at = NOW()
    WHERE product_id = sale_row.product_id
    RETURNING * INTO balance_row;

    -- Positive delta return, preserving invoice_item_id for idempotency and
    -- so the batch trigger can restore the original FIFO allocations.
    INSERT INTO public.stock_movements(
      product_id, product_name_snapshot, unit, movement_type, quantity_delta,
      balance_after, customer_id, invoice_id, invoice_item_id, notes, occurred_at, created_by
    ) VALUES (
      sale_row.product_id, sale_row.product_name_snapshot, sale_row.unit,
      'INVOICE_VOID_RETURN', ABS(sale_row.quantity_delta), balance_row.quantity,
      sale_row.customer_id, p_invoice_id, sale_row.invoice_item_id,
      'Pengembalian stok invoice dibatalkan', NOW(), auth.uid()
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_invoice_stock(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_invoice_stock(UUID) TO authenticated;

-- void_invoice: validate, restore stock once, then mark VOID.
CREATE OR REPLACE FUNCTION public.void_invoice(p_invoice_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invoices%ROWTYPE; actor_name TEXT;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'OWNER'::public.user_role THEN
    RAISE EXCEPTION 'Hanya Owner yang dapat membatalkan invoice';
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice tidak ditemukan'; END IF;
  IF inv.status IN ('DRAFT', 'VOID', 'PAID') OR inv.total_paid > 0 THEN
    RAISE EXCEPTION 'Invoice tidak dapat dibatalkan (status=% atau sudah ada pembayaran)', inv.status;
  END IF;

  -- Restore stock explicitly (idempotent). The deferred invoice trigger will
  -- detect the existing return movements and skip, avoiding double restock.
  PERFORM public.restore_invoice_stock(p_invoice_id);

  UPDATE public.invoices
  SET status = 'VOID', remaining_balance = 0, updated_at = NOW()
  WHERE id = p_invoice_id;

  SELECT full_name INTO actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
  VALUES (auth.uid(), COALESCE(actor_name, 'Owner'), 'invoices', inv.id, 'INVOICE_VOIDED',
    jsonb_build_object('reason', p_reason, 'invoice_number', inv.invoice_number));
END;
$$;

REVOKE ALL ON FUNCTION public.void_invoice(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_invoice(UUID, TEXT) TO authenticated;

-- force_delete_invoice: restore stock once before deleting the invoice.
CREATE OR REPLACE FUNCTION public.force_delete_invoice(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role public.user_role := public.current_user_role(); actor_name TEXT; inv public.invoices%ROWTYPE;
BEGIN
  IF actor_role <> 'OWNER' THEN
    RAISE EXCEPTION 'Hanya Owner yang dapat menghapus invoice secara permanen';
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice tidak ditemukan'; END IF;

  -- Restore stock for non-DRAFT/VOID invoices before deletion.
  IF inv.status NOT IN ('DRAFT', 'VOID') THEN
    PERFORM public.restore_invoice_stock(p_invoice_id);
  END IF;

  SELECT full_name INTO actor_name FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
  VALUES (auth.uid(), COALESCE(actor_name,'Owner'), 'invoices', p_invoice_id, 'INVOICE_FORCE_DELETED',
    jsonb_build_object(
      'invoice_number', inv.invoice_number,
      'status', inv.status,
      'total', inv.total,
      'total_paid', inv.total_paid
    ));

  DELETE FROM public.payments WHERE invoice_id = p_invoice_id;
  DELETE FROM public.invoices WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.force_delete_invoice(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.force_delete_invoice(UUID) TO authenticated;
