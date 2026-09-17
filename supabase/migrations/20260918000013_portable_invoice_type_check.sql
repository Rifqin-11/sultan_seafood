-- =====================================================
-- Portability fix: make the invoice stock trigger independent of the
-- invoices.invoice_type column.
--
-- Background: the deployed remote database has an extra `invoice_type` column
-- (plus loads/reject_stock tables) that is NOT present in this repository's
-- migrations. The previous trigger referenced NEW.invoice_type directly, which
-- works on remote but raises "record NEW has no field invoice_type" on a fresh
-- local database built only from these migrations.
--
-- Using to_jsonb(NEW)->>'invoice_type' is equivalent when the column exists and
-- safe when it does not, so FACTORY_LOAD/REJECT_STOCK_SALE invoices keep being
-- skipped on remote while local environments still work.
-- =====================================================

CREATE OR REPLACE FUNCTION public.apply_invoice_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE item_row RECORD; balance_row public.stock_balances%ROWTYPE; requested NUMERIC; available NUMERIC; product_name_value TEXT; actor_name TEXT; direction TEXT;
BEGIN
  -- Portable check: avoids referencing a column that may not exist locally.
  IF COALESCE(to_jsonb(NEW)->>'invoice_type', '') IN ('FACTORY_LOAD', 'REJECT_STOCK_SALE') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') THEN direction := 'OUT';
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'DRAFT' AND NEW.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') THEN direction := 'OUT';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'VOID' AND OLD.status NOT IN ('DRAFT', 'VOID') THEN direction := 'RETURN';
  ELSE RETURN NEW; END IF;

  IF direction = 'OUT' THEN
    IF EXISTS (SELECT 1 FROM public.stock_movements WHERE invoice_id = NEW.id AND movement_type = 'SALE_OUT') THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.invoice_items WHERE invoice_id = NEW.id AND product_id IS NULL) THEN
      RAISE EXCEPTION 'Invoice memiliki produk yang sudah tidak tersedia';
    END IF;
    INSERT INTO public.stock_balances(product_id) SELECT DISTINCT product_id FROM public.invoice_items WHERE invoice_id = NEW.id AND product_id IS NOT NULL ON CONFLICT DO NOTHING;
    PERFORM sb.product_id FROM public.stock_balances sb WHERE EXISTS (SELECT 1 FROM public.invoice_items ii WHERE ii.invoice_id = NEW.id AND ii.product_id = sb.product_id) ORDER BY sb.product_id FOR UPDATE;
    SELECT p.name, sb.quantity, req.requested_quantity INTO product_name_value, available, requested FROM public.stock_balances sb JOIN public.products p ON p.id = sb.product_id JOIN (SELECT product_id, SUM(quantity) requested_quantity FROM public.invoice_items WHERE invoice_id = NEW.id GROUP BY product_id) req ON req.product_id = sb.product_id WHERE sb.quantity < req.requested_quantity ORDER BY sb.product_id LIMIT 1;
    IF FOUND THEN RAISE EXCEPTION 'Stok % tidak cukup. Tersedia %, dibutuhkan %', product_name_value, available, requested; END IF;
    FOR item_row IN SELECT ii.* FROM public.invoice_items ii WHERE ii.invoice_id = NEW.id ORDER BY ii.product_id, ii.id LOOP
      UPDATE public.stock_balances SET quantity = quantity - item_row.quantity, updated_at = NOW() WHERE product_id = item_row.product_id RETURNING * INTO balance_row;
      INSERT INTO public.stock_movements(product_id, product_name_snapshot, unit, movement_type, quantity_delta, balance_after, customer_id, invoice_id, invoice_item_id, notes, occurred_at, created_by) VALUES (item_row.product_id, item_row.description_snapshot, item_row.unit, 'SALE_OUT', -item_row.quantity, balance_row.quantity, NEW.customer_id, NEW.id, item_row.id, COALESCE(NEW.invoice_number, 'Invoice'), NEW.issue_date, auth.uid());
    END LOOP;
  ELSE
    -- Idempotency guard: if stock was already restored for this invoice, skip.
    IF EXISTS (SELECT 1 FROM public.stock_movements WHERE invoice_id = NEW.id AND movement_type = 'INVOICE_VOID_RETURN') THEN RETURN NEW; END IF;
    FOR item_row IN SELECT sm.* FROM public.stock_movements sm WHERE sm.invoice_id = NEW.id AND sm.movement_type = 'SALE_OUT' ORDER BY sm.product_id, sm.id LOOP
      UPDATE public.stock_balances SET quantity = quantity + ABS(item_row.quantity_delta), updated_at = NOW() WHERE product_id = item_row.product_id RETURNING * INTO balance_row;
      INSERT INTO public.stock_movements(product_id, product_name_snapshot, unit, movement_type, quantity_delta, balance_after, customer_id, invoice_id, invoice_item_id, notes, occurred_at, created_by) VALUES (item_row.product_id, item_row.product_name_snapshot, item_row.unit, 'INVOICE_VOID_RETURN', ABS(item_row.quantity_delta), balance_row.quantity, item_row.customer_id, NEW.id, item_row.invoice_item_id, 'Pengembalian invoice dibatalkan', NOW(), auth.uid());
    END LOOP;
  END IF;

  SELECT full_name INTO actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload) VALUES (auth.uid(), COALESCE(actor_name, 'User'), 'invoices', NEW.id, CASE WHEN direction = 'OUT' THEN 'STOCK_SALE_OUT' ELSE 'STOCK_VOID_RETURN' END, jsonb_build_object('invoice_number', NEW.invoice_number));
  RETURN NEW;
END; $$;

NOTIFY pgrst, 'reload schema';
