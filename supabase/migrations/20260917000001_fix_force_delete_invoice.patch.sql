-- Patch for force_delete_invoice: Change status to VOID first, let deferred trigger handle restocking
CREATE OR REPLACE FUNCTION public.force_delete_invoice(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor_role    public.user_role := public.current_user_role();
  actor_name    TEXT;
  inv           public.invoices%ROWTYPE;
BEGIN
  IF actor_role <> 'OWNER' THEN
    RAISE EXCEPTION 'Hanya Owner yang dapat menghapus invoice secara permanen';
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice tidak ditemukan'; END IF;

  -- First, restore stock by changing status to VOID (triggers deferred trigger)
  IF inv.status NOT IN ('DRAFT', 'VOID') THEN
    -- Audit log before change
    INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
    VALUES (auth.uid(), COALESCE(actor_name,'Owner'), 'invoices', p_invoice_id, 'INVOICE_FORCE_DELETE_QUEUED',
      jsonb_build_object(
        'invoice_number', inv.invoice_number,
        'status', inv.status,
        'total', inv.total,
        'total_paid', inv.total_paid,
        'stock_restore_pending', TRUE
      ));
    
    -- Change status to VOID first - deferred trigger will handle all restocking
    UPDATE public.invoices 
    SET status = 'VOID', remaining_balance = 0, updated_at = NOW() 
    WHERE id = p_invoice_id;
  END IF;

  SELECT full_name INTO actor_name FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
  VALUES (auth.uid(), COALESCE(actor_name,'Owner'), 'invoices', p_invoice_id, 'INVOICE_FORCE_DELETED',
    jsonb_build_object(
      'invoice_number', inv.invoice_number,
      'status', 'VOID',
      'total', inv.total,
      'total_paid', inv.total_paid
    ));

  DELETE FROM public.payments WHERE invoice_id = p_invoice_id;
  DELETE FROM public.invoices WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.force_delete_invoice(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.force_delete_invoice(UUID) TO authenticated;
