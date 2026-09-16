-- =====================================================
-- MIGRATION: Harden inventory reversals (VOID/DELETE)
-- No historical data is changed. Only future transactions are fixed.
-- stock_balances.quantity remains the source of truth.
-- =====================================================

-- Step 1: Remove the broken void_invoice and apply new implementation
CREATE OR REPLACE FUNCTION public.void_invoice(p_invoice_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invoices%ROWTYPE; actor_name TEXT;
BEGIN
  -- Validate user role
  IF public.current_user_role() IS DISTINCT FROM 'OWNER'::public.user_role THEN 
    RAISE EXCEPTION 'Hanya Owner yang dapat membatalkan invoice'; 
  END IF;
  
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Invoice tidak ditemukan'; 
  END IF;
  
  -- Only ISSUED or PARTIALLY_PAID invoices can be voided (no payments made)
  IF inv.status IN ('DRAFT', 'VOID', 'PAID') OR inv.total_paid > 0 THEN 
    RAISE EXCEPTION 'Invoice tidak dapat dibatalkan (status=% atau sudah ada pembayaran)', inv.status; 
  END IF;
  
  -- DO NOT create return movements here. Let the deferred trigger handle everything.
  -- This prevents duplicate restoration when the deferred trigger runs later.
  
  -- Update status to VOID
  UPDATE public.invoices 
  SET status = 'VOID', remaining_balance = 0, updated_at = NOW() 
  WHERE id = p_invoice_id;
  
  -- Audit log
  SELECT full_name INTO actor_name FROM public.profiles WHERE id = auth.uid();
  
  INSERT INTO public.audit_logs(
    user_id, user_name, entity_name, entity_id, action, payload
  )
  VALUES(
    auth.uid(), 
    COALESCE(actor_name, 'Owner'), 
    'invoices', 
    inv.id, 
    'INVOICE_VOIDED', 
    jsonb_build_object('reason', p_reason, 'invoice_number', inv.invoice_number)
  );
END; 
$$;

REVOKE ALL ON FUNCTION public.void_invoice(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_invoice(UUID, TEXT) TO authenticated;
