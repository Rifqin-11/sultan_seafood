-- Repair migration for environments where 20260902000000 was recorded in the
-- migration history but its receipt-item columns are not present. This is
-- intentionally additive and safe to run whether or not the columns exist.

ALTER TABLE public.stock_receipt_items
  ADD COLUMN IF NOT EXISTS manual_quantity NUMERIC(14, 3),
  ADD COLUMN IF NOT EXISTS digital_quantity NUMERIC(14, 3);

UPDATE public.stock_receipt_items
SET manual_quantity = COALESCE(manual_quantity, quantity),
    digital_quantity = COALESCE(digital_quantity, quantity)
WHERE manual_quantity IS NULL OR digital_quantity IS NULL;

ALTER TABLE public.stock_receipt_items
  ALTER COLUMN manual_quantity SET NOT NULL,
  ALTER COLUMN digital_quantity SET NOT NULL;

ALTER TABLE public.stock_receipt_items
  DROP CONSTRAINT IF EXISTS stock_receipt_items_manual_quantity_check,
  DROP CONSTRAINT IF EXISTS stock_receipt_items_digital_quantity_check;

ALTER TABLE public.stock_receipt_items
  ADD CONSTRAINT stock_receipt_items_manual_quantity_check CHECK (manual_quantity > 0),
  ADD CONSTRAINT stock_receipt_items_digital_quantity_check CHECK (digital_quantity > 0);

-- Ask PostgREST to discard its cached table definition immediately after the
-- migration, so inventory reads can see the newly-added columns.
NOTIFY pgrst, 'reload schema';
