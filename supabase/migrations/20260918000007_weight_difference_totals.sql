-- Weight-difference totals must reflect ALL rows, not just the current page.
CREATE OR REPLACE FUNCTION public.get_weight_differences_page(
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value public.user_role := public.current_user_role();
  safe_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 200);
  safe_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
  result_value JSONB;
BEGIN
  IF role_value IS NULL OR role_value NOT IN ('OWNER','FINANCE') THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'totalDifference', COALESCE(SUM(GREATEST(item.digital_quantity - item.manual_quantity, 0)), 0),
    'totalEstimatedStockValue', COALESCE(SUM(
      ROUND(GREATEST(item.digital_quantity - item.manual_quantity, 0) * item.unit_cost)
    ), 0),
    'rows', COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  )
  INTO result_value
  FROM (
    SELECT
      jsonb_build_object(
        'id', item.id,
        'productId', item.product_id,
        'productName', product.name,
        'unit', COALESCE(item.unit, product.default_unit, 'unit'),
        'supplierName', supplier.name,
        'receiptNumber', receipt.receipt_number,
        'receivedDate', COALESCE(receipt.received_date, item.created_at),
        'manualQuantity', item.manual_quantity,
        'digitalQuantity', item.digital_quantity,
        'difference', item.digital_quantity - item.manual_quantity,
        'unitCost', item.unit_cost,
        'effectiveUnitCost', CASE WHEN item.digital_quantity > 0
          THEN ROUND(item.manual_quantity * item.unit_cost / item.digital_quantity, 2) ELSE 0 END,
        'hppReduction', CASE WHEN item.digital_quantity > 0
          THEN ROUND(GREATEST(item.unit_cost - (item.manual_quantity * item.unit_cost / item.digital_quantity), 0), 2) ELSE 0 END,
        'estimatedStockValue', ROUND(GREATEST(item.digital_quantity - item.manual_quantity, 0) * item.unit_cost)
      ) AS row_data,
      item.digital_quantity,
      item.manual_quantity,
      item.unit_cost
    FROM public.stock_receipt_items AS item
    JOIN public.stock_receipts AS receipt ON receipt.id = item.receipt_id
    LEFT JOIN public.products AS product ON product.id = item.product_id
    LEFT JOIN public.suppliers AS supplier ON supplier.id = receipt.supplier_id
    WHERE receipt.cancelled_at IS NULL
      AND item.digital_quantity > item.manual_quantity
    ORDER BY item.created_at DESC
    LIMIT safe_limit OFFSET safe_offset
  ) page_rows;

  RETURN result_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_weight_differences_page(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weight_differences_page(INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
