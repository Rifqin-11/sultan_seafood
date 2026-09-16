-- =====================================================
-- FIX #2: Void Invoice Harus Restock via Stock Movement  
-- =====================================================

-- Update void_invoice untuk create INVOICE_VOID_RETURN movements
CREATE OR REPLACE FUNCTION public.void_invoice(p_invoice_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invoices%ROWTYPE; actor_name TEXT; item RECORD;
  move_type constant public.stock_movement_type := 'INVOICE_VOID_RETURN'::public.stock_movement_type;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'OWNER'::public.user_role THEN 
    RAISE EXCEPTION 'Hanya Owner yang dapat membatalkan invoice'; 
  END IF;
  
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND OR inv.status IN ('DRAFT', 'VOID', 'PAID') OR inv.total_paid > 0 THEN 
    RAISE EXCEPTION 'Invoice tidak dapat dibatalkan (hanya ISSUED atau PARTIALLY_PAID tanpa pembayaran)'; 
  END IF;
  
  -- Buat stock movement untuk restock ke batch (per produk dengan SUM quantity)
  FOR item IN 
    SELECT DISTINCT i.product_id, p.name as product_name, ii.unit
    FROM public.invoice_items ii
    JOIN public.products p ON p.id = ii.product_id
    WHERE ii.invoice_id = p_invoice_id
  LOOP
    -- Sum all quantities for this product from this invoice
    DECLARE total_qty NUMERIC;
    BEGIN
      SELECT COALESCE(SUM(ii.quantity), 0) INTO total_qty
      FROM public.invoice_items ii
      WHERE ii.invoice_id = p_invoice_id AND ii.product_id = item.product_id;
      
      -- Insert stock movement with NEGATIVE delta (karena mengembalikan stock)
      INSERT INTO public.stock_movements(
        product_id, product_name_snapshot, unit, movement_type, quantity_delta, balance_after,
        invoice_id, invoice_item_id, occurred_at, created_by
      ) VALUES (
        item.product_id, item.product_name, item.unit, move_type, -total_qty,
        (SELECT quantity + total_qty FROM public.stock_balances WHERE product_id = item.product_id),
        p_invoice_id, NULL, NOW(), auth.uid()
      );
    END;
  END LOOP;
  
  -- Update status invoice menjadi VOID dan kembalikan remaining_balance = 0
  UPDATE public.invoices 
  SET status = 'VOID', remaining_balance = 0, updated_at = NOW() 
  WHERE id = p_invoice_id;
  
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
