-- =====================================================
-- DEBUG SCRIPT: Stock Issue untuk Udang Bago 15-20
-- =====================================================

-- 1. Cek produk udang bago 15-20 (ganti dengan ID yang benar jika berbeda)
SELECT 
  id,
  name,
  sku,
  size,
  category,
  default_selling_price
FROM products 
WHERE name ILIKE '%udang%' AND size = 'bago-15-20';

-- 2. Cek stock_balance untuk produk tersebut
SELECT 
  sb.product_id,
  p.name as product_name,
  p.size,
  sb.quantity,
  sb.minimum_quantity,
  sb.average_unit_cost,
  sb.updated_at
FROM stock_balances sb
JOIN products p ON p.id = sb.product_id
WHERE p.name ILIKE '%udang%' AND p.size = 'bago-15-20';

-- 3. Cek semua batch untuk produk tersebut
SELECT 
  sb.id,
  sb.supplier_id,
  s.name as supplier_name,
  sb.quantity_received,
  sb.quantity_remaining,
  sb.unit_cost,
  sb.status,
  sb.received_at,
  sb.notes,
  CASE 
    WHEN sb.status = 'OPEN' AND sb.quantity_remaining > 0 THEN '✅ OPEN + ada sisa'
    WHEN sb.status = 'DEPLETED' AND sb.quantity_remaining = 0 THEN '❌ DEPLETED habis'
    WHEN sb.status = 'CANCELLED' THEN '🚫 CANCELLED dibatalkan'
    ELSE '⚠️ UNKNOWN status'
  END as status_detail
FROM stock_batches sb
LEFT JOIN suppliers s ON s.id = sb.supplier_id
WHERE sb.product_id = '[GANTI_DENGAN_PRODUCT_ID_UDANG_BAGO]'; -- GANTI DI SINI!

-- 4. Hitung total batch OPEN vs stock balance
WITH balance_check AS (
  SELECT 
    quantity,
    average_unit_cost
  FROM stock_balances
  WHERE product_id = '[GANTI_DENGAN_PRODUCT_ID_UDANG_BAGO]'
),
batch_sum AS (
  SELECT 
    COALESCE(SUM(quantity_remaining), 0) as open_batch_total
  FROM stock_batches
  WHERE product_id = '[GANTI_DENGAN_PRODUCT_ID_UDANG_BAGO]'
    AND status = 'OPEN'
    AND quantity_remaining > 0
),
gap_calc AS (
  SELECT 
    bc.quantity as actual_stock,
    bs.open_batch_total as open_batch_stock,
    bc.quantity - bs.open_batch_total as gap,
    CASE 
      WHEN bc.quantity > bs.open_batch_total THEN '⚠️ GAP POSITIF: Batch kurang dari stock!'
      WHEN bc.quantity < bs.open_batch_total THEN '⚠️ GAP NEGATIF: Batch lebih dari stock (mustahil!)'
      ELSE '✅ MATCH sempurna'
    END as conclusion
  FROM balance_check bc
  CROSS JOIN batch_sum bs
)
SELECT * FROM gap_calc;

-- 5. Cek riwayat penerimaan (stock_receipts) untuk produk ini
SELECT 
  sr.id,
  sr.receipt_number,
  sr.supplier_id,
  s.name as supplier_name,
  sr.received_date,
  sr.total_cost,
  sr.cancelled_at,
  COUNT(sri.id) as item_count
FROM stock_receipts sr
LEFT JOIN suppliers s ON s.id = sr.supplier_id
LEFT JOIN stock_receipt_items sri ON sri.receipt_id = sr.id
WHERE sri.product_id = '[GANTI_DENGAN_PRODUCT_ID_UDANG_BAGO]'
GROUP BY sr.id, sr.receipt_number, sr.supplier_id, s.name, sr.received_date, sr.total_cost, sr.cancelled_at
ORDER BY sr.received_date DESC;

-- 6. Cek stock_movements (penerimaan & penjualan) terakhir
SELECT 
  sm.movement_type,
  sm.quantity_delta,
  sm.balance_after,
  sm.occurred_at,
  sr.receipt_number,
  i.invoice_number,
  p.name as movement_product_name
FROM stock_movements sm
LEFT JOIN stock_receipts sr ON sr.id = sm.receipt_id
LEFT JOIN invoices i ON i.id = sm.invoice_id
JOIN products p ON p.id = sm.product_id
WHERE p.name ILIKE '%udang%' AND p.size = 'bago-15-20'
ORDER BY sm.occurred_at DESC
LIMIT 20;

-- 7. Cek apakah ada penyesuaian stok (ADJUSTMENT_IN/OUT)
SELECT 
  sm.movement_type,
  sm.quantity_delta,
  sm.balance_after,
  sm.occurred_at,
  sm.notes
FROM stock_movements sm
WHERE sm.product_id = '[GANTI_DENGAN_PRODUCT_ID_UDANG_BAGO]'
  AND sm.movement_type IN ('ADJUSTMENT_IN', 'ADJUSTMENT_OUT')
ORDER BY sm.occurred_at DESC;

-- 8. Cek invoice items yang pakai produk ini (apakah pernah jual?)
SELECT 
  inv.invoice_number,
  ii.selling_price_snapshot,
  ii.quantity,
  ii.margin_quantity,
  ii.subtotal,
  ii.total_purchase_cost
FROM invoice_items ii
JOIN invoices inv ON inv.id = ii.invoice_id
WHERE ii.product_id = '[GANTI_DENGAN_PRODUCT_ID_UDANG_BAGO]'
ORDER BY inv.issue_date DESC;
