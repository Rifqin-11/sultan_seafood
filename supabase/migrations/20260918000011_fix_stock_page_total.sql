-- FIX: the stock pagination RPCs returned the page row count as "total",
-- because COUNT(*) was aggregated over the already-limited page subquery.
-- This computes the full matching count separately from the page slice.
-- Caught by self_test_stock_pagination. No data changes.

CREATE OR REPLACE FUNCTION public.get_stock_balances_page(
  p_search TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_stock_status TEXT DEFAULT NULL,
  p_product_status TEXT DEFAULT NULL,
  p_sort_key TEXT DEFAULT 'productName',
  p_sort_dir TEXT DEFAULT 'asc',
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
  sort_key TEXT := COALESCE(NULLIF(p_sort_key, ''), 'productName');
  sort_dir TEXT := CASE WHEN LOWER(COALESCE(p_sort_dir, 'asc')) = 'desc' THEN 'desc' ELSE 'asc' END;
  total_count INTEGER;
  page_rows JSONB;
BEGIN
  IF role_value IS NULL OR role_value NOT IN ('OWNER','FINANCE') THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;
  IF sort_key NOT IN ('productName','category','size','quantity','averageUnitCost','latestPurchaseCost','defaultSellingPrice','stockValue','minimumQuantity','stockStatus') THEN
    sort_key := 'productName';
  END IF;

  WITH base AS (
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
      COALESCE(batch_count.open_batch_count, 0) AS open_batch_count,
      CASE
        WHEN balance.quantity <= 0 THEN 'Habis'
        WHEN balance.minimum_quantity > 0 AND balance.quantity <= balance.minimum_quantity THEN 'Menipis'
        ELSE 'Aman' END AS stock_status
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
  ), filtered AS (
    SELECT * FROM base
  ), counted AS (
    SELECT COUNT(*) AS total FROM filtered
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY
      CASE WHEN sort_dir = 'asc' AND sort_key IN ('productName','category','size','stockStatus') THEN
        CASE sort_key WHEN 'productName' THEN product_name WHEN 'category' THEN category
                      WHEN 'size' THEN COALESCE(size, '') WHEN 'stockStatus' THEN stock_status END
      END ASC NULLS LAST,
      CASE WHEN sort_dir = 'desc' AND sort_key IN ('productName','category','size','stockStatus') THEN
        CASE sort_key WHEN 'productName' THEN product_name WHEN 'category' THEN category
                      WHEN 'size' THEN COALESCE(size, '') WHEN 'stockStatus' THEN stock_status END
      END DESC NULLS LAST,
      CASE WHEN sort_key = 'quantity' THEN quantity END ASC,
      CASE WHEN sort_key = 'quantity' AND sort_dir = 'desc' THEN quantity END DESC,
      CASE WHEN sort_key = 'averageUnitCost' THEN average_unit_cost END ASC,
      CASE WHEN sort_key = 'averageUnitCost' AND sort_dir = 'desc' THEN average_unit_cost END DESC,
      CASE WHEN sort_key = 'latestPurchaseCost' THEN latest_purchase_cost END ASC NULLS LAST,
      CASE WHEN sort_key = 'latestPurchaseCost' AND sort_dir = 'desc' THEN latest_purchase_cost END DESC NULLS LAST,
      CASE WHEN sort_key = 'defaultSellingPrice' THEN default_selling_price END ASC,
      CASE WHEN sort_key = 'defaultSellingPrice' AND sort_dir = 'desc' THEN default_selling_price END DESC,
      CASE WHEN sort_key = 'stockValue' THEN quantity * average_unit_cost END ASC,
      CASE WHEN sort_key = 'stockValue' AND sort_dir = 'desc' THEN quantity * average_unit_cost END DESC,
      CASE WHEN sort_key = 'minimumQuantity' THEN minimum_quantity END ASC,
      CASE WHEN sort_key = 'minimumQuantity' AND sort_dir = 'desc' THEN minimum_quantity END DESC,
      product_name ASC
    LIMIT safe_limit OFFSET safe_offset
  )
  SELECT
    (SELECT total FROM counted),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'productId', paged.product_id,
        'productName', paged.product_name,
        'sku', paged.sku,
        'size', paged.size,
        'unit', paged.unit,
        'category', paged.category,
        'productStatus', paged.product_status,
        'quantity', paged.quantity,
        'minimumQuantity', paged.minimum_quantity,
        'averageUnitCost', paged.average_unit_cost,
        'defaultSellingPrice', paged.default_selling_price,
        'stockValue', paged.quantity * paged.average_unit_cost,
        'latestPurchaseCost', paged.latest_purchase_cost,
        'supplierCount', paged.supplier_count,
        'marginNominal', paged.default_selling_price - paged.average_unit_cost,
        'marginPercentage', CASE WHEN paged.default_selling_price > 0
          THEN ((paged.default_selling_price - paged.average_unit_cost) / paged.default_selling_price) * 100 ELSE 0 END,
        'stockStatus', paged.stock_status,
        'openBatchCount', paged.open_batch_count,
        'updatedAt', paged.updated_at
      ))
      FROM paged
    ), '[]'::jsonb)
  INTO total_count, page_rows;

  RETURN jsonb_build_object('total', total_count, 'rows', page_rows);
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
  total_count INTEGER;
  page_rows JSONB;
BEGIN
  IF role_value IS NULL OR role_value NOT IN ('OWNER','FINANCE') THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  WITH filtered AS (
    SELECT movement.id, movement.product_id, movement.product_name_snapshot, movement.unit,
           movement.movement_type, movement.quantity_delta, movement.balance_after, movement.notes, movement.occurred_at,
           supplier.name AS supplier_name, customer.name AS customer_name,
           invoice.invoice_number, receipt.receipt_number, receipt.cancelled_at AS receipt_cancelled_at,
           receipt_item.unit_cost, receipt_item.manual_quantity, receipt_item.digital_quantity
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
  ), counted AS (
    SELECT COUNT(*) AS total FROM filtered
  ), paged AS (
    SELECT * FROM filtered ORDER BY occurred_at DESC LIMIT safe_limit OFFSET safe_offset
  )
  SELECT
    (SELECT total FROM counted),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', paged.id,
        'productId', paged.product_id,
        'productName', paged.product_name_snapshot,
        'unit', paged.unit,
        'movementType', paged.movement_type,
        'quantityDelta', paged.quantity_delta,
        'balanceAfter', paged.balance_after,
        'supplierName', paged.supplier_name,
        'customerName', paged.customer_name,
        'invoiceNumber', paged.invoice_number,
        'receiptNumber', paged.receipt_number,
        'receiptCancelledAt', paged.receipt_cancelled_at,
        'purchaseUnitCost', paged.unit_cost,
        'manualQuantity', paged.manual_quantity,
        'digitalQuantity', paged.digital_quantity,
        'weightDifference', CASE WHEN paged.manual_quantity IS NOT NULL AND paged.digital_quantity IS NOT NULL
          THEN paged.digital_quantity - paged.manual_quantity ELSE NULL END,
        'notes', paged.notes,
        'occurredAt', paged.occurred_at
      ))
      FROM paged
    ), '[]'::jsonb)
  INTO total_count, page_rows;

  RETURN jsonb_build_object('total', total_count, 'rows', page_rows);
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
  total_count INTEGER;
  total_difference NUMERIC;
  total_value NUMERIC;
  page_rows JSONB;
BEGIN
  IF role_value IS NULL OR role_value NOT IN ('OWNER','FINANCE') THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  WITH filtered AS (
    SELECT item.id, item.product_id, product.name AS product_name,
           COALESCE(item.unit, product.default_unit, 'unit') AS unit,
           supplier.name AS supplier_name, receipt.receipt_number,
           COALESCE(receipt.received_date, item.created_at::date) AS received_date,
           item.manual_quantity, item.digital_quantity, item.unit_cost,
           item.created_at
    FROM public.stock_receipt_items AS item
    JOIN public.stock_receipts AS receipt ON receipt.id = item.receipt_id
    LEFT JOIN public.products AS product ON product.id = item.product_id
    LEFT JOIN public.suppliers AS supplier ON supplier.id = receipt.supplier_id
    WHERE receipt.cancelled_at IS NULL
      AND item.digital_quantity > item.manual_quantity
  ), counted AS (
    SELECT COUNT(*) AS total,
           COALESCE(SUM(digital_quantity - manual_quantity), 0) AS diff,
           COALESCE(SUM(ROUND((digital_quantity - manual_quantity) * unit_cost)), 0) AS value
    FROM filtered
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC LIMIT safe_limit OFFSET safe_offset
  )
  SELECT
    (SELECT total FROM counted),
    (SELECT diff FROM counted),
    (SELECT value FROM counted),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', paged.id,
        'productId', paged.product_id,
        'productName', paged.product_name,
        'unit', paged.unit,
        'supplierName', paged.supplier_name,
        'receiptNumber', paged.receipt_number,
        'receivedDate', paged.received_date,
        'manualQuantity', paged.manual_quantity,
        'digitalQuantity', paged.digital_quantity,
        'difference', paged.digital_quantity - paged.manual_quantity,
        'unitCost', paged.unit_cost,
        'effectiveUnitCost', CASE WHEN paged.digital_quantity > 0
          THEN ROUND(paged.manual_quantity * paged.unit_cost / paged.digital_quantity, 2) ELSE 0 END,
        'hppReduction', CASE WHEN paged.digital_quantity > 0
          THEN ROUND(GREATEST(paged.unit_cost - (paged.manual_quantity * paged.unit_cost / paged.digital_quantity), 0), 2) ELSE 0 END,
        'estimatedStockValue', ROUND((paged.digital_quantity - paged.manual_quantity) * paged.unit_cost)
      ))
      FROM paged
    ), '[]'::jsonb)
  INTO total_count, total_difference, total_value, page_rows;

  RETURN jsonb_build_object(
    'total', total_count,
    'totalDifference', total_difference,
    'totalEstimatedStockValue', total_value,
    'rows', page_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_stock_balances_page(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_stock_movements_page(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_weight_differences_page(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_balances_page(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_movements_page(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weight_differences_page(INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
