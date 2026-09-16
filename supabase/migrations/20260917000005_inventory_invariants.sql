-- =====================================================
-- Database invariants for inventory integrity.
-- Constraints are added NOT VALID so existing historical data is never
-- rejected or modified. They apply to all new inserts/updates immediately.
-- Run audit functions before VALIDATE CONSTRAINT if you want strict history.
-- =====================================================

-- stock_batches: remaining can never exceed received.
DO $$ BEGIN
  ALTER TABLE public.stock_batches
    ADD CONSTRAINT stock_batches_remaining_le_received
    CHECK (quantity_remaining <= quantity_received);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- stock_batches: status must be consistent with quantity_remaining.
DO $$ BEGIN
  ALTER TABLE public.stock_batches
    ADD CONSTRAINT stock_batches_status_quantity_consistent
    CHECK (
      (status = 'OPEN' AND quantity_remaining > 0)
      OR (status IN ('DEPLETED', 'CANCELLED') AND quantity_remaining = 0)
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- stock_movements: movement direction must match its type.
DO $$ BEGIN
  ALTER TABLE public.stock_movements
    ADD CONSTRAINT stock_movements_direction_consistent
    CHECK (
      (movement_type IN ('PURCHASE_IN', 'INVOICE_VOID_RETURN', 'ADJUSTMENT_IN') AND quantity_delta > 0)
      OR (movement_type IN ('SALE_OUT', 'ADJUSTMENT_OUT') AND quantity_delta < 0)
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
