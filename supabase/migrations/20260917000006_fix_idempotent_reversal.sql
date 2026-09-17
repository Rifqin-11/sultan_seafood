-- =====================================================
-- Fix idempotency of the deferred invoice stock trigger and make batch
-- restoration precise per invoice item.
--
-- Problem 1: the deployed apply_invoice_stock_change has no RETURN guard, so
-- void_invoice (which already restored stock via restore_invoice_stock) would
-- hit the unique index (invoice_item_id, movement_type) and abort.
--
-- Problem 2: the deployed batch trigger restores batches per product/invoice,
-- so an invoice with multiple lines for the same product double-restores.
-- restore_invoice_stock preserves invoice_item_id, so we restore precisely by
-- invoice_item_id, with a legacy fallback for old null-item returns.
--
-- No historical data is modified by this migration.
-- =====================================================

-- 1) Deferred invoice trigger: add idempotency guards, preserve invoice_type skip.
CREATE OR REPLACE FUNCTION public.apply_invoice_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE item_row RECORD; balance_row public.stock_balances%ROWTYPE; requested NUMERIC; available NUMERIC; product_name_value TEXT; actor_name TEXT; direction TEXT;
BEGIN
  -- Portable check: this repository's migrations do not define invoice_type,
  -- while some deployed databases add it. to_jsonb keeps both working.
  IF COALESCE(to_jsonb(NEW)->>'invoice_type', '') IN ('FACTORY_LOAD', 'REJECT_STOCK_SALE') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') THEN direction := 'OUT';
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'DRAFT' AND NEW.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') THEN direction := 'OUT';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'VOID' AND OLD.status NOT IN ('DRAFT', 'VOID') THEN direction := 'RETURN';
  ELSE RETURN NEW; END IF;

  IF direction = 'OUT' THEN
    IF EXISTS (SELECT 1 FROM public.stock_movements WHERE invoice_id = NEW.id AND movement_type = 'SALE_OUT') THEN RETURN NEW; END IF;
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

-- 2) Batch trigger: restore precisely by invoice_item_id, legacy fallback otherwise.
CREATE OR REPLACE FUNCTION public.apply_stock_movement_to_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_value NUMERIC := ABS(NEW.quantity_delta);
  batch_row RECORD;
  allocated_value NUMERIC;
  balance_quantity_value NUMERIC;
  open_batch_quantity_value NUMERIC;
  legacy_gap_value NUMERIC;
  legacy_cost_value NUMERIC;
BEGIN
  -- VOID INVOICE RETURN
  IF NEW.movement_type = 'INVOICE_VOID_RETURN'::public.stock_movement_type THEN
    IF NEW.invoice_item_id IS NOT NULL THEN
      -- Precise restoration for the exact sale item (idempotent via unique index).
      FOR batch_row IN
        SELECT allocation.batch_id, allocation.quantity
        FROM public.stock_batch_allocations AS allocation
        JOIN public.stock_movements AS sale ON sale.id = allocation.movement_id
        WHERE sale.invoice_item_id = NEW.invoice_item_id
          AND sale.movement_type = 'SALE_OUT'::public.stock_movement_type
      LOOP
        UPDATE public.stock_batches AS batch
        SET quantity_remaining = batch.quantity_remaining + batch_row.quantity,
            status = 'OPEN'
        WHERE batch.id = batch_row.batch_id;
      END LOOP;
    ELSE
      -- Legacy fallback for historical returns without an invoice item.
      FOR batch_row IN
        SELECT sa.batch_id, SUM(sa.quantity) AS total_allocated
        FROM public.stock_batch_allocations AS sa
        JOIN public.stock_movements AS sm ON sm.id = sa.movement_id
        WHERE sm.invoice_id = NEW.invoice_id
          AND sm.product_id = NEW.product_id
          AND sm.movement_type = 'SALE_OUT'::public.stock_movement_type
        GROUP BY sa.batch_id
      LOOP
        UPDATE public.stock_batches AS batch
        SET quantity_remaining = batch.quantity_remaining + batch_row.total_allocated,
            status = 'OPEN'
        WHERE batch.id = batch_row.batch_id;
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;

  -- ADJUSTMENT_IN: create a new batch
  IF NEW.movement_type = 'ADJUSTMENT_IN'::public.stock_movement_type
    AND NEW.receipt_item_id IS NULL THEN
    INSERT INTO public.stock_batches(product_id, quantity_received, quantity_remaining, unit_cost, received_at, notes)
    SELECT balance.product_id, NEW.quantity_delta, NEW.quantity_delta, balance.average_unit_cost, NEW.occurred_at,
      'Batch penyesuaian: ' || COALESCE(NEW.notes, 'tanpa catatan')
    FROM public.stock_balances AS balance
    WHERE balance.product_id = NEW.product_id;
    RETURN NEW;
  END IF;

  -- ADJUSTMENT_OUT linked to a receipt: cancel that receipt batch
  IF NEW.movement_type = 'ADJUSTMENT_OUT'::public.stock_movement_type
    AND NEW.receipt_item_id IS NOT NULL THEN
    UPDATE public.stock_batches AS batch
    SET quantity_remaining = 0, status = 'CANCELLED'
    WHERE batch.receipt_item_id = NEW.receipt_item_id;
    RETURN NEW;
  END IF;

  IF NEW.movement_type NOT IN ('SALE_OUT'::public.stock_movement_type, 'ADJUSTMENT_OUT'::public.stock_movement_type) THEN RETURN NEW; END IF;

  SELECT balance.quantity, balance.average_unit_cost
  INTO balance_quantity_value, legacy_cost_value
  FROM public.stock_balances AS balance
  WHERE balance.product_id = NEW.product_id
  FOR UPDATE;

  SELECT COALESCE(SUM(batch.quantity_remaining), 0)
  INTO open_batch_quantity_value
  FROM public.stock_batches AS batch
  WHERE batch.product_id = NEW.product_id AND batch.status = 'OPEN' AND batch.quantity_remaining > 0;

  legacy_gap_value := ROUND(GREATEST(0, (COALESCE(balance_quantity_value, 0) + remaining_value) - COALESCE(open_batch_quantity_value, 0)), 3);
  IF legacy_gap_value > 0 THEN
    INSERT INTO public.stock_batches(product_id, quantity_received, quantity_remaining, unit_cost, received_at, notes)
    VALUES (NEW.product_id, legacy_gap_value, legacy_gap_value, ROUND(COALESCE(legacy_cost_value, 0), 2), NEW.occurred_at, 'Batch migrasi otomatis dari saldo lama');
  END IF;

  FOR batch_row IN
    SELECT batch.id, batch.quantity_remaining
    FROM public.stock_batches AS batch
    WHERE batch.product_id = NEW.product_id AND batch.status = 'OPEN' AND batch.quantity_remaining > 0
    ORDER BY batch.expiry_date NULLS LAST, batch.received_at, batch.created_at, batch.id
    FOR UPDATE
  LOOP
    EXIT WHEN remaining_value <= 0;
    allocated_value := LEAST(remaining_value, batch_row.quantity_remaining);
    UPDATE public.stock_batches AS batch
    SET quantity_remaining = batch.quantity_remaining - allocated_value,
        status = CASE WHEN batch.quantity_remaining - allocated_value = 0 THEN 'DEPLETED' ELSE 'OPEN' END
    WHERE batch.id = batch_row.id;
    INSERT INTO public.stock_batch_allocations(batch_id, movement_id, quantity)
    VALUES (batch_row.id, NEW.id, allocated_value);
    remaining_value := remaining_value - allocated_value;
  END LOOP;

  IF remaining_value > 0 THEN
    RAISE EXCEPTION 'Batch stok untuk % tidak cukup. Saldo batch belum sesuai dengan stok tercatat.', NEW.product_name_snapshot;
  END IF;
  RETURN NEW;
END; $$;
