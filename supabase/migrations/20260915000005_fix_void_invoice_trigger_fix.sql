-- =====================================================
-- FIX #3: Update Trigger untuk Handle Void Invoice dengan Benar
-- =====================================================

-- Update trigger apply_stock_movement_to_batches agar void invoice tidak perlu lookup invoice_item_id
-- Tapi langsung restock ke semua batch yang terpakai dari invoice tersebut
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
  -- VOID INVOICE: Kembalikan stock ke batch yang sebelumnya terpakai
  IF NEW.movement_type = 'INVOICE_VOID_RETURN'::public.stock_movement_type THEN
    -- Cari semua batch_allocations dari SALE_OUT movements invoice yang sama untuk produk ini
    FOR batch_row IN
      SELECT sa.batch_id, SUM(sa.quantity) as total_allocated
      FROM public.stock_batch_allocations sa
      JOIN public.stock_movements sm ON sm.id = sa.movement_id
      WHERE sm.invoice_id = NEW.invoice_id 
        AND sm.product_id = NEW.product_id
        AND sm.movement_type = 'SALE_OUT'::public.stock_movement_type
      GROUP BY sa.batch_id
    LOOP
      -- Kembalikan quantity dan update status kembali OPEN
      UPDATE public.stock_batches AS batch
      SET quantity_remaining = batch.quantity_remaining + batch_row.total_allocated,
          status = 'OPEN'
      WHERE batch.id = batch_row.batch_id;
      
      EXIT WHEN remaining_value <= 0;
      remaining_value := remaining_value - batch_row.total_allocated;
    END LOOP;
    
    RETURN NEW;
  END IF;

  -- ADJUSTMENT_IN: Buat batch baru
  IF NEW.movement_type = 'ADJUSTMENT_IN'::public.stock_movement_type
    AND NEW.receipt_item_id IS NULL THEN
    INSERT INTO public.stock_batches(
      product_id, quantity_received, quantity_remaining, unit_cost,
      received_at, notes
    )
    SELECT balance.product_id, NEW.quantity_delta, NEW.quantity_delta,
      balance.average_unit_cost, NEW.occurred_at,
      'Batch penyesuaian: ' || COALESCE(NEW.notes, 'tanpa catatan')
    FROM public.stock_balances AS balance
    WHERE balance.product_id = NEW.product_id;
    RETURN NEW;
  END IF;

  -- ADJUSTMENT_OUT: Mark batch CANCELLED
  IF NEW.movement_type = 'ADJUSTMENT_OUT'::public.stock_movement_type
    AND NEW.receipt_item_id IS NOT NULL THEN
    UPDATE public.stock_batches AS batch
    SET quantity_remaining = 0,
        status = 'CANCELLED'
    WHERE batch.receipt_item_id = NEW.receipt_item_id;
    RETURN NEW;
  END IF;

  -- Hanya process SALE_OUT dan ADJUSTMENT_OUT (stock depletion)
  IF NEW.movement_type NOT IN (
    'SALE_OUT'::public.stock_movement_type,
    'ADJUSTMENT_OUT'::public.stock_movement_type
  ) THEN
    RETURN NEW;
  END IF;

  -- Cek balance saat ini
  SELECT balance.quantity, balance.average_unit_cost
  INTO balance_quantity_value, legacy_gap_value
  FROM public.stock_balances AS balance
  WHERE balance.product_id = NEW.product_id
  FOR UPDATE;

  -- Hitung total batch OPEN saat ini
  SELECT COALESCE(SUM(batch.quantity_remaining), 0)
  INTO open_batch_quantity_value
  FROM public.stock_batches AS batch
  WHERE batch.product_id = NEW.product_id
    AND batch.status = 'OPEN'
    AND batch.quantity_remaining > 0;

  -- Add only the quantity that existed before this movement but has no batch
  -- representation. This preserves all existing FIFO allocations and avoids
  -- inventing stock when the balance itself is insufficient.
  legacy_gap_value := ROUND(
    GREATEST(
      0,
      (COALESCE(balance_quantity_value, 0) + remaining_value)
      - COALESCE(open_batch_quantity_value, 0)
    ),
    3
  );
  IF legacy_gap_value > 0 THEN
    INSERT INTO public.stock_batches(
      product_id, quantity_received, quantity_remaining, unit_cost,
      received_at, notes
    ) VALUES (
      NEW.product_id,
      legacy_gap_value,
      legacy_gap_value,
      ROUND(COALESCE(legacy_cost_value, 0), 2),
      NEW.occurred_at,
      'Batch migrasi otomatis dari saldo lama'
    );
  END IF;

  -- Allocate from earliest eligible open batch (FIFO/FEFO)
  FOR batch_row IN
    SELECT batch.id, batch.quantity_remaining
    FROM public.stock_batches AS batch
    WHERE batch.product_id = NEW.product_id
      AND batch.status = 'OPEN'
      AND batch.quantity_remaining > 0
    ORDER BY batch.expiry_date NULLS LAST, batch.received_at,
      batch.created_at, batch.id
    FOR UPDATE
  LOOP
    EXIT WHEN remaining_value <= 0;
    allocated_value := LEAST(remaining_value, batch_row.quantity_remaining);
    UPDATE public.stock_batches AS batch
    SET quantity_remaining = batch.quantity_remaining - allocated_value,
        status = CASE
          WHEN batch.quantity_remaining - allocated_value = 0 THEN 'DEPLETED'
          ELSE 'OPEN'
        END
    WHERE batch.id = batch_row.id;
    INSERT INTO public.stock_batch_allocations(batch_id, movement_id, quantity)
    VALUES (batch_row.id, NEW.id, allocated_value);
    remaining_value := remaining_value - allocated_value;
  END LOOP;

  IF remaining_value > 0 THEN
    RAISE EXCEPTION 'Batch stok untuk % tidak cukup. Saldo batch belum sesuai dengan stok tercatat.', NEW.product_name_snapshot;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stock_movement_to_batches() FROM PUBLIC, anon;
