-- Add server-side sorting to the stock balances page so sorting covers all
-- rows, not just the current page. Whitelisted keys only; no dynamic SQL.
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
  result_value JSONB;
BEGIN
  IF role_value IS NULL OR role_value NOT IN ('OWNER','FINANCE') THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;
  IF sort_key NOT IN ('productName','category','size','quantity','averageUnitCost','latestPurchaseCost','defaultSellingPrice','stockValue','minimumQuantity','stockStatus') THEN
    sort_key := 'productName';
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
      'stockStatus', base.stock_status,
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
        COALESCE(batch_count.open_batch_count, 0) AS open_batch_count,
        CASE
          WHEN balance.quantity <= 0 THEN 'Habis'
          WHEN balance.minimum_quantity > 0 AND balance.quantity <= balance.minimum_quantity THEN 'Menipis'
          ELSE 'Aman' END AS stock_status,
        COALESCE(product.category, 'Tanpa kategori') AS sort_category,
        COALESCE(product.size, '') AS sort_size
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
    ORDER BY
      CASE WHEN sort_dir = 'asc' THEN
        CASE sort_key
          WHEN 'productName' THEN base.product_name
          WHEN 'category' THEN base.sort_category
          WHEN 'size' THEN base.sort_size
          WHEN 'stockStatus' THEN base.stock_status
        END
      END ASC NULLS LAST,
      CASE WHEN sort_dir = 'desc' THEN
        CASE sort_key
          WHEN 'productName' THEN base.product_name
          WHEN 'category' THEN base.sort_category
          WHEN 'size' THEN base.sort_size
          WHEN 'stockStatus' THEN base.stock_status
        END
      END DESC NULLS LAST,
      CASE WHEN sort_key = 'quantity' THEN base.quantity END ASC,
      CASE WHEN sort_key = 'quantity' AND sort_dir = 'desc' THEN base.quantity END DESC,
      CASE WHEN sort_key = 'averageUnitCost' THEN base.average_unit_cost END ASC,
      CASE WHEN sort_key = 'averageUnitCost' AND sort_dir = 'desc' THEN base.average_unit_cost END DESC,
      CASE WHEN sort_key = 'latestPurchaseCost' THEN base.latest_purchase_cost END ASC NULLS LAST,
      CASE WHEN sort_key = 'latestPurchaseCost' AND sort_dir = 'desc' THEN base.latest_purchase_cost END DESC NULLS LAST,
      CASE WHEN sort_key = 'defaultSellingPrice' THEN base.default_selling_price END ASC,
      CASE WHEN sort_key = 'defaultSellingPrice' AND sort_dir = 'desc' THEN base.default_selling_price END DESC,
      CASE WHEN sort_key = 'stockValue' THEN base.quantity * base.average_unit_cost END ASC,
      CASE WHEN sort_key = 'stockValue' AND sort_dir = 'desc' THEN base.quantity * base.average_unit_cost END DESC,
      CASE WHEN sort_key = 'minimumQuantity' THEN base.minimum_quantity END ASC,
      CASE WHEN sort_key = 'minimumQuantity' AND sort_dir = 'desc' THEN base.minimum_quantity END DESC,
      base.product_name ASC
    LIMIT safe_limit OFFSET safe_offset
  ) page_rows;

  RETURN result_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_stock_balances_page(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stock_balances_page(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

DROP FUNCTION IF EXISTS public.get_stock_balances_page(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER);

NOTIFY pgrst, 'reload schema';
