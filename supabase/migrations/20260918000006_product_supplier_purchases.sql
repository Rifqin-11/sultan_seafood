-- Product supplier purchase history, fetched on demand when a user opens the
-- "Lihat pembelian supplier" sheet. Replaces passing every movement/batch row
-- to every product row.
CREATE OR REPLACE FUNCTION public.get_product_supplier_purchases(p_product_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'purchases', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', movement.id,
        'supplierName', supplier.name,
        'occurredAt', movement.occurred_at,
        'receiptNumber', receipt.receipt_number,
        'receiptId', movement.receipt_id,
        'quantityDelta', movement.quantity_delta,
        'purchaseUnitCost', receipt_item.unit_cost,
        'manualQuantity', receipt_item.manual_quantity,
        'digitalQuantity', receipt_item.digital_quantity,
        'unit', movement.unit
      ) ORDER BY movement.occurred_at DESC)
      FROM public.stock_movements AS movement
      LEFT JOIN public.suppliers AS supplier ON supplier.id = movement.supplier_id
      LEFT JOIN public.stock_receipts AS receipt ON receipt.id = movement.receipt_id
      LEFT JOIN public.stock_receipt_items AS receipt_item ON receipt_item.id = movement.receipt_item_id
      WHERE movement.product_id = p_product_id
        AND movement.movement_type = 'PURCHASE_IN'
        AND receipt.cancelled_at IS NULL
    ), '[]'::jsonb),
    'batches', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', batch.id,
        'supplierId', batch.supplier_id,
        'supplierName', supplier.name,
        'quantityReceived', batch.quantity_received,
        'quantityRemaining', batch.quantity_remaining,
        'unitCost', batch.unit_cost,
        'receivedAt', batch.received_at,
        'expiryDate', batch.expiry_date,
        'status', batch.status,
        'notes', batch.notes
      ) ORDER BY batch.received_at DESC)
      FROM public.stock_batches AS batch
      LEFT JOIN public.suppliers AS supplier ON supplier.id = batch.supplier_id
      WHERE batch.product_id = p_product_id
    ), '[]'::jsonb)
  )
  WHERE public.current_user_role() IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role);
$$;

REVOKE ALL ON FUNCTION public.get_product_supplier_purchases(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_product_supplier_purchases(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
