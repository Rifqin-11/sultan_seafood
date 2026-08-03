export interface StockReceiptItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface StockReceiptInput {
  supplierId: string;
  receivedDate: string;
  dueDate?: string;
  supplierReference?: string;
  createPayable?: boolean;
  notes?: string;
  items: StockReceiptItemInput[];
}

export function validateStockReceiptPayload(payload: StockReceiptInput): string | null {
  if (!payload || !payload.supplierId || !payload.receivedDate || !Array.isArray(payload.items) || payload.items.length === 0) {
    return "Supplier, tanggal penerimaan, dan minimal satu produk wajib diisi.";
  }
  if (payload.dueDate && payload.dueDate < payload.receivedDate) {
    return "Jatuh tempo tidak boleh sebelum tanggal penerimaan.";
  }
  if (payload.items.some((item) => !item || !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitCost) || item.unitCost <= 0)) {
    return "Semua produk harus memiliki jumlah dan harga beli yang valid.";
  }
  if (new Set(payload.items.map((item) => item.productId)).size !== payload.items.length) {
    return "Produk yang sama cukup dicatat satu kali dalam satu penerimaan.";
  }
  return null;
}

export function validateStockAdjustment(productId: string, quantityDelta: number, notes: string): string | null {
  if (!productId || !Number.isFinite(quantityDelta) || quantityDelta === 0) return "Produk dan perubahan stok wajib valid.";
  if (typeof notes !== "string" || !notes.trim()) return "Alasan penyesuaian stok wajib diisi.";
  return null;
}

export function getStockMovementLabel(type: string) {
  const labels: Record<string, string> = {
    PURCHASE_IN: "Barang masuk",
    SALE_OUT: "Keluar untuk invoice",
    INVOICE_VOID_RETURN: "Pengembalian invoice",
    ADJUSTMENT_IN: "Penyesuaian masuk",
    ADJUSTMENT_OUT: "Penyesuaian keluar",
  };
  return labels[type] ?? type;
}
