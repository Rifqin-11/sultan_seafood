-- =====================================================
-- Performance: stock page server-side pagination + summary.
-- Summary is computed over ALL rows (no limit). Pages return only the visible
-- slice. No data is modified.
-- =====================================================

-- Stock KPI summary for the stock page cards (all active products).
CREATE OR REPLACE FUNCTION public.get_stock_page_summary()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'activeProductCount', COUNT(*),
    'totalQuantity', COALESCE(SUM(balance.quantity), 0),
    'totalStockValue', COALESCE(SUM(
      CASE
        WHEN batch_value.quantity IS NULL THEN balance.quantity * balance.average_unit_cost
        ELSE batch_value.value + GREATEST(0, balance.quantity - batch_value.quantity) * balance.average_unit_cost
      END
    ), 0),
    'lowStockCount', COUNT(*) FILTER (WHERE balance.minimum_quantity > 0 AND balance.quantity <= balance.minimum_quantity),
    'outOfStockCount', COUNT(*) FILTER (WHERE balance.quantity <= 0)
  )
  FROM public.stock_balances AS balance
  JOIN public.products AS product ON product.id = balance.product_id
  LEFT JOIN LATERAL (
    SELECT SUM(batch.quantity_remaining) AS quantity,
           SUM(batch.quantity_remaining * batch.unit_cost) AS value
    FROM public.stock_batches AS batch
    WHERE batch.product_id = balance.product_id
      AND batch.status = 'OPEN'
      AND batch.quantity_remaining > 0
  ) AS batch_value ON TRUE
  WHERE product.status = 'ACTIVE'
    AND public.current_user_role() IN ('OWNER'::public.user_role, 'FINANCE'::public.user_role);
$$;

CREATE OR REPLACE FUNCTION public.get_stock_balances_page(
  p_search TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_stock_status TEXT DEFAULT NULL,
  p_product_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value public.user_role := public.current_user_role();
  search_value TEXT := NULLIF(BTRIM(p_search), '');
  safe_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 200);
  safe_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
  result_value JSONB;
BEGIN
  IF role_value IS NULL OR role_value NOT IN ('OWNER','FINANCE') THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  SELECT jsonb_build_object('total', COUNT(*), 'rows', COALESCE(jsonb_agg(row_data), '[]'::jsonb))
  INTO result_value
  FROM (
    SELECT jsonb_build_object(
      'productId', base.product_id,
      'productName', base.product_name,
      'sku', base.sku,
      'size', base.size,
      'unit', base.unit,
      'category', base.category,
      'productStatus', base.product_status,
      'quantity', base.quantity,
      'minimumQuantity', base.minimum_quantity,
      'averageUnitCost', base.average_unit_cost,
      'defaultSellingPrice', base.default_selling_price,
      'stockValue', base.quantity * base.average_unit_cost,
      'latestPurchaseCost', base.latest_purchase_cost,
      'supplierCount', base.supplier_count,
      'marginNominal', base.default_selling_price - base.average_unit_cost,
      'marginPercentage', CASE WHEN base.default_selling_price > 0
        THEN ((base.default_selling_price - base.average_unit_cost) / base.default_selling_price) * 100 ELSE 0 END,
      'stockStatus', CASE
        WHEN base.quantity <= 0 THEN 'Habis'
        WHEN base.minimum_quantity > 0 AND base.quantity <= base.minimum_quantity THEN 'Menipis'
        ELSE 'Aman' END,
      'openBatchCount', base.open_batch_count,
      'updatedAt', base.updated_at
    ) AS row_data
    FROM (
      SELECT
        balance.product_id, product.name AS product_name, product.sku, product.size,
        COALESCE(product.default_unit, 'unit') AS unit,
        COALESCE(product.category, 'Tanpa kategori') AS category,
        CASE WHEN product.status = 'INACTIVE' THEN 'INACTIVE' ELSE 'ACTIVE' END AS product_status,
        balance.quantity, balance.minimum_quantity, balance.average_unit_cost,
        COALESCE(product.default_selling_price, 0) AS default_selling_price,
        balance.updated_at,
        purchase_fact.latest_cost AS latest_purchase_cost,
        COALESCE(purchase_fact.supplier_count, 0) AS supplier_count,
        COALESCE(batch_count.open_batch_count, 0) AS open_batch_count
      FROM public.stock_balances AS balance
      JOIN public.products AS product ON product.id = balance.product_id
      LEFT JOIN LATERAL (
        SELECT item.unit_cost AS latest_cost, supplier.supplier_count
        FROM public.stock_receipt_items AS item
        JOIN public.stock_receipts AS receipt ON receipt.id = item.receipt_id
        LEFT JOIN LATERAL (
          SELECT COUNT(DISTINCT r2.supplier_id) AS supplier_count
          FROM public.stock_receipt_items AS i2
          JOIN public.stock_receipts AS r2 ON r2.id = i2.receipt_id
          WHERE i2.product_id = item.product_id AND r2.cancelled_at IS NULL
        ) AS supplier ON TRUE
        WHERE item.product_id = balance.product_id AND receipt.cancelled_at IS NULL
        ORDER BY item.created_at DESC
        LIMIT 1
      ) AS purchase_fact ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS open_batch_count
        FROM public.stock_batches AS batch
        WHERE batch.product_id = balance.product_id AND batch.status = 'OPEN' AND batch.quantity_remaining > 0
      ) AS batch_count ON TRUE
      WHERE (search_value IS NULL
              OR product.name ILIKE '%' || search_value || '%'
              OR COALESCE(product.category, '') ILIKE '%' || search_value || '%')
        AND (p_category IS NULL OR p_category = 'all' OR COALESCE(product.category, 'Tanpa kategori') = p_category)
        AND (p_product_status IS NULL OR p_product_status = 'all' OR product.status::TEXT = p_product_status)
        AND (
          p_stock_status IS NULL OR p_stock_status = 'all'
          OR (p_stock_status = 'Habis' AND balance.quantity <= 0)
          OR (p_stock_status = 'Menipis' AND balance.minimum_quantity > 0 AND balance.quantity <= balance.minimum_quantity AND balance.quantity > 0)
          OR (p_stock_status = 'Aman' AND (balance.minimum_quantity = 0 OR balance.quantity > balance.minimum_quantity) AND balance.quantity > 0)
        )
    ) AS base
    ORDER BY base.product_name ASC
    LIMIT safe_limit OFFSET safe_offset
  ) page_rows;

  RETURN result_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stock_movements_page(
  p_search TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value public.user_role := public.current_user_role();
  search_value TEXT := NULLIF(BTRIM(p_search), '');
  safe_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 200);
  safe_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
  result_value JSONB;
BEGIN
  IF role_value IS NULL OR role_value NOT IN ('OWNER','FINANCE') THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  SELECT jsonb_build_object('total', COUNT(*), 'rows', COALESCE(jsonb_agg(row_data), '[]'::jsonb))
  INTO result_value
  FROM (
    SELECT jsonb_build_object(
      'id', movement.id,
      'productId', movement.product_id,
      'productName', movement.product_name_snapshot,
      'unit', movement.unit,
      'movementType', movement.movement_type,
      'quantityDelta', movement.quantity_delta,
      'balanceAfter', movement.balance_after,
      'supplierName', supplier.name,
      'customerName', customer.name,
      'invoiceNumber', invoice.invoice_number,
      'receiptNumber', receipt.receipt_number,
      'receiptCancelledAt', receipt.cancelled_at,
      'purchaseUnitCost', receipt_item.unit_cost,
      'manualQuantity', receipt_item.manual_quantity,
      'digitalQuantity', receipt_item.digital_quantity,
      'weightDifference', CASE WHEN receipt_item.manual_quantity IS NOT NULL AND receipt_item.digital_quantity IS NOT NULL
        THEN receipt_item.digital_quantity - receipt_item.manual_quantity ELSE NULL END,
      'notes', movement.notes,
      'occurredAt', movement.occurred_at
    ) AS row_data
    FROM public.stock_movements AS movement
    LEFT JOIN public.suppliers AS supplier ON supplier.id = movement.supplier_id
    LEFT JOIN public.customers AS customer ON customer.id = movement.customer_id
    LEFT JOIN public.invoices AS invoice ON invoice.id = movement.invoice_id
    LEFT JOIN public.stock_receipts AS receipt ON receipt.id = movement.receipt_id
    LEFT JOIN public.stock_receipt_items AS receipt_item ON receipt_item.id = movement.receipt_item_id
    WHERE movement.movement_type <> 'PURCHASE_IN'
      AND (p_type IS NULL OR p_type = 'all' OR movement.movement_type::TEXT = p_type)
      AND (search_value IS NULL
            OR movement.product_name_snapshot ILIKE '%' || search_value || '%'
            OR COALESCE(invoice.invoice_number, '') ILIKE '%' || search_value || '%')
    ORDER BY movement.occurred_at DESC
    LIMIT safe_limit OFFSET safe_offset
  ) page_rows;

  RETURN result_value;
END;
$$;

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

  SELECT jsonb_build_object('total', COUNT(*), 'rows', COALESCE(jsonb_agg(row_data), '[]'::jsonb))
  INTO result_value
  FROM (
    SELECT jsonb_build_object(
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
    ) AS row_data
    FROM public.stock_receipt_items AS item
    JOIN public.stock_receipts AS receipt ON receipt.id = item.receipt_id
    LEFT JOIN public.products AS product ON product.id = item.product_id
    LEFT JOIN public.suppliers AS supplier ON supplier.id = receipt.supplier_id
    WHERE receipt.cancelled_at IS NULL
    ORDER BY item.created_at DESC
    LIMIT safe_limit OFFSET safe_offset
  ) page_rows;

  RETURN result_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_stock_page_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_stock_balances_page(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_stock_movements_page(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_weight_differences_page(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_page_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_balances_page(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_movements_page(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weight_differences_page(INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
