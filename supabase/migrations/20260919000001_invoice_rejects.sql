-- Track rejected invoice quantities and optionally return them to inventory.
CREATE TABLE IF NOT EXISTS public.invoice_rejects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_item_id UUID NOT NULL REFERENCES public.invoice_items(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
  return_to_stock BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_rejects_invoice ON public.invoice_rejects(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_rejects_item ON public.invoice_rejects(invoice_item_id);
ALTER TABLE public.invoice_rejects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_invoice_rejects_read ON public.invoice_rejects;
CREATE POLICY finance_invoice_rejects_read ON public.invoice_rejects FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role));
REVOKE ALL ON TABLE public.invoice_rejects FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.invoice_rejects FROM authenticated;
GRANT SELECT ON TABLE public.invoice_rejects TO authenticated;

ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_direction_consistent;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_direction_consistent CHECK (
  (movement_type IN ('PURCHASE_IN', 'INVOICE_VOID_RETURN', 'INVOICE_REJECT_RETURN', 'ADJUSTMENT_IN') AND quantity_delta > 0)
  OR (movement_type IN ('SALE_OUT', 'ADJUSTMENT_OUT') AND quantity_delta < 0)
) NOT VALID;

CREATE OR REPLACE FUNCTION public.protect_rejected_invoice_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.invoice_rejects WHERE invoice_id = OLD.id) THEN
      RAISE EXCEPTION 'Invoice dengan catatan reject tidak dapat dibatalkan atau dihapus';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'VOID'
    AND EXISTS (SELECT 1 FROM public.invoice_rejects WHERE invoice_id = OLD.id) THEN
    RAISE EXCEPTION 'Invoice dengan catatan reject tidak dapat dibatalkan atau dihapus';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rejected_invoice_history ON public.invoices;
CREATE TRIGGER trg_protect_rejected_invoice_history
BEFORE UPDATE OF status ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.protect_rejected_invoice_history();
DROP TRIGGER IF EXISTS trg_protect_rejected_invoice_delete ON public.invoices;
CREATE TRIGGER trg_protect_rejected_invoice_delete
BEFORE DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.protect_rejected_invoice_history();

CREATE OR REPLACE FUNCTION public.protect_rejected_invoice_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.invoice_rejects WHERE invoice_item_id = OLD.id) THEN
      RAISE EXCEPTION 'Item invoice dengan catatan reject tidak dapat diubah atau dihapus';
    END IF;
    RETURN OLD;
  END IF;
  IF EXISTS (SELECT 1 FROM public.invoice_rejects WHERE invoice_item_id = OLD.id)
    AND (OLD.invoice_id IS DISTINCT FROM NEW.invoice_id OR OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
    RAISE EXCEPTION 'Item invoice dengan catatan reject tidak dapat diubah atau dihapus';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rejected_invoice_item ON public.invoice_items;
CREATE TRIGGER trg_protect_rejected_invoice_item
BEFORE UPDATE OF invoice_id, quantity ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.protect_rejected_invoice_item();
DROP TRIGGER IF EXISTS trg_protect_rejected_invoice_item_delete ON public.invoice_items;
CREATE TRIGGER trg_protect_rejected_invoice_item_delete
BEFORE DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.protect_rejected_invoice_item();

CREATE OR REPLACE FUNCTION public.record_invoice_reject(
  p_invoice_id UUID,
  p_items JSONB,
  p_return_to_stock BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.user_role := public.current_user_role();
  invoice_row public.invoices%ROWTYPE;
  item_payload JSONB;
  invoice_item_row public.invoice_items%ROWTYPE;
  balance_row public.stock_balances%ROWTYPE;
  requested_quantity NUMERIC;
  previously_rejected NUMERIC;
  remaining_quantity NUMERIC;
  movement_quantity NUMERIC;
  reject_reason TEXT;
  allocation_row RECORD;
  seen_item_ids UUID[] := ARRAY[]::UUID[];
  rejects_json JSONB := '[]'::JSONB;
BEGIN
  IF actor_role NOT IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role) THEN
    RAISE EXCEPTION 'Hanya Owner/Finance yang dapat mencatat reject invoice';
  END IF;
  IF p_invoice_id IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Pilih minimal satu produk yang direject';
  END IF;

  SELECT * INTO invoice_row FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice tidak ditemukan'; END IF;
  IF invoice_row.status IN ('DRAFT', 'VOID') THEN RAISE EXCEPTION 'Reject hanya dapat dicatat pada invoice terbit'; END IF;
  IF COALESCE(to_jsonb(invoice_row)->>'invoice_type', '') IN ('FACTORY_LOAD', 'REJECT_STOCK_SALE') THEN
    RAISE EXCEPTION 'Reject hanya dapat dicatat untuk invoice penjualan';
  END IF;

  -- Validate every line and cumulative rejected quantity before any mutation.
  FOR item_payload IN SELECT entry.value FROM jsonb_array_elements(p_items) AS entry(value) LOOP
    IF item_payload->>'invoiceItemId' IS NULL THEN RAISE EXCEPTION 'Item invoice tidak valid'; END IF;
    BEGIN
      requested_quantity := ROUND((item_payload->>'quantity')::NUMERIC, 3);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Berat reject tidak valid';
    END;
    reject_reason := BTRIM(COALESCE(item_payload->>'reason', ''));
    IF requested_quantity <= 0 OR reject_reason = '' THEN RAISE EXCEPTION 'Berat dan alasan reject wajib diisi'; END IF;

    SELECT * INTO invoice_item_row FROM public.invoice_items
    WHERE id = (item_payload->>'invoiceItemId')::UUID AND invoice_id = p_invoice_id FOR UPDATE;
    IF NOT FOUND OR invoice_item_row.product_id IS NULL THEN RAISE EXCEPTION 'Produk tidak ditemukan pada invoice'; END IF;
    IF invoice_item_row.id = ANY(seen_item_ids) THEN RAISE EXCEPTION 'Produk yang sama tidak boleh dipilih lebih dari sekali'; END IF;
    seen_item_ids := array_append(seen_item_ids, invoice_item_row.id);
    SELECT COALESCE(SUM(quantity), 0) INTO previously_rejected
    FROM public.invoice_rejects WHERE invoice_item_id = invoice_item_row.id;
    IF requested_quantity + previously_rejected > invoice_item_row.quantity THEN
      RAISE EXCEPTION 'Total berat reject melebihi jumlah invoice untuk %', invoice_item_row.description_snapshot;
    END IF;
  END LOOP;

  FOR item_payload IN SELECT entry.value FROM jsonb_array_elements(p_items) AS entry(value) LOOP
    requested_quantity := ROUND((item_payload->>'quantity')::NUMERIC, 3);
    reject_reason := BTRIM(item_payload->>'reason');
    SELECT * INTO invoice_item_row FROM public.invoice_items
    WHERE id = (item_payload->>'invoiceItemId')::UUID AND invoice_id = p_invoice_id;
    SELECT COALESCE(SUM(quantity), 0) INTO previously_rejected
    FROM public.invoice_rejects WHERE invoice_item_id = invoice_item_row.id;
    remaining_quantity := invoice_item_row.quantity - previously_rejected - requested_quantity;

    INSERT INTO public.invoice_rejects(invoice_id, invoice_item_id, product_id, product_name_snapshot, unit, quantity, reason, return_to_stock, created_by)
    VALUES (p_invoice_id, invoice_item_row.id, invoice_item_row.product_id, invoice_item_row.description_snapshot,
      invoice_item_row.unit, requested_quantity, reject_reason, p_return_to_stock, auth.uid());

    IF p_return_to_stock THEN
      INSERT INTO public.stock_balances(product_id) VALUES (invoice_item_row.product_id) ON CONFLICT (product_id) DO NOTHING;
      SELECT * INTO balance_row FROM public.stock_balances WHERE product_id = invoice_item_row.product_id FOR UPDATE;
      UPDATE public.stock_balances SET
        average_unit_cost = CASE
          WHEN quantity + requested_quantity = 0 THEN average_unit_cost
          ELSE ROUND(((quantity * average_unit_cost) + (requested_quantity * invoice_item_row.purchase_price_snapshot)) / (quantity + requested_quantity), 2)
        END,
        quantity = quantity + requested_quantity,
        updated_at = NOW()
      WHERE product_id = invoice_item_row.product_id RETURNING * INTO balance_row;
      INSERT INTO public.stock_movements(product_id, product_name_snapshot, unit, movement_type, quantity_delta,
        balance_after, customer_id, invoice_id, invoice_item_id, notes, occurred_at, created_by)
      VALUES (invoice_item_row.product_id, invoice_item_row.description_snapshot, invoice_item_row.unit,
        'INVOICE_REJECT_RETURN', requested_quantity, balance_row.quantity, invoice_row.customer_id,
        p_invoice_id, NULL, 'Reject ' || COALESCE(invoice_row.invoice_number, p_invoice_id::TEXT) || ': ' || reject_reason,
        NOW(), auth.uid());
    END IF;

    -- Remove rejected quantity from the original sale allocation so a later
    -- invoice void cannot put rejected units back into stock a second time.
    movement_quantity := requested_quantity;
    FOR allocation_row IN
        SELECT sm.id, sba.batch_id, sba.quantity
        FROM public.stock_movements sm
        JOIN public.stock_batch_allocations sba ON sba.movement_id = sm.id
        WHERE sm.invoice_id = p_invoice_id AND sm.invoice_item_id = invoice_item_row.id
          AND sm.movement_type = 'SALE_OUT'::public.stock_movement_type
        ORDER BY sm.id, sba.batch_id
        FOR UPDATE OF sba
    LOOP
        EXIT WHEN movement_quantity <= 0;
        IF allocation_row.quantity <= movement_quantity THEN
          DELETE FROM public.stock_batch_allocations WHERE movement_id = allocation_row.id AND batch_id = allocation_row.batch_id;
          IF p_return_to_stock THEN
            UPDATE public.stock_batches SET quantity_remaining = quantity_remaining + allocation_row.quantity, status = 'OPEN'
            WHERE id = allocation_row.batch_id;
          END IF;
          movement_quantity := movement_quantity - allocation_row.quantity;
        ELSE
          UPDATE public.stock_batch_allocations SET quantity = quantity - movement_quantity
          WHERE movement_id = allocation_row.id AND batch_id = allocation_row.batch_id;
          IF p_return_to_stock THEN
            UPDATE public.stock_batches SET quantity_remaining = quantity_remaining + movement_quantity, status = 'OPEN'
            WHERE id = allocation_row.batch_id;
          END IF;
          movement_quantity := 0;
        END IF;
    END LOOP;

    IF p_return_to_stock AND movement_quantity > 0 THEN
      INSERT INTO public.stock_batches(product_id, quantity_received, quantity_remaining, unit_cost, received_at, notes)
      SELECT invoice_item_row.product_id, movement_quantity, movement_quantity, invoice_item_row.purchase_price_snapshot,
        NOW(), 'Reject kembali ke stok · ' || reject_reason;
    END IF;

    rejects_json := rejects_json || jsonb_build_array(jsonb_build_object(
      'productName', invoice_item_row.description_snapshot,
      'quantity', requested_quantity,
      'unit', invoice_item_row.unit,
      'remainingQuantity', remaining_quantity,
      'returnedToStock', p_return_to_stock
    ));
  END LOOP;

  INSERT INTO public.audit_logs(user_id, user_name, entity_name, entity_id, action, payload)
  SELECT auth.uid(), COALESCE(full_name, 'User'), 'invoices', p_invoice_id, 'INVOICE_ITEMS_REJECTED',
    jsonb_build_object('invoice_number', invoice_row.invoice_number, 'return_to_stock', p_return_to_stock, 'items', rejects_json)
  FROM public.profiles WHERE id = auth.uid();

  RETURN jsonb_build_object('items', rejects_json, 'returnToStock', p_return_to_stock);
END;
$$;

REVOKE ALL ON FUNCTION public.record_invoice_reject(UUID, JSONB, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_invoice_reject(UUID, JSONB, BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.protect_rejected_invoice_history() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_rejected_invoice_item() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
