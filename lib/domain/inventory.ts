export interface StockReceiptItemInput {
  productId: string;
  /** Berat yang menjadi dasar pembayaran ke supplier (timbangan pasar/manual). */
  manualQuantity?: number;
  /** Berat aktual yang masuk ke gudang (timbangan digital). */
  digitalQuantity?: number;
  /** Backward-compatible alias for older callers. */
  quantity?: number;
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

export interface StockSettingsInput {
  productId: string;
  targetQuantity: number;
  minimumQuantity: number;
  notes?: string;
}

export function calculateWeightedAverageCost(
  currentQuantity: number,
  currentAverageCost: number,
  incomingQuantity: number,
  incomingUnitCost: number,
) {
  const quantityAfter = currentQuantity + incomingQuantity;
  if (quantityAfter <= 0) return 0;
  return ((currentQuantity * currentAverageCost) + (incomingQuantity * incomingUnitCost)) / quantityAfter;
}

export function calculateWeightDifference(manualQuantity: number, digitalQuantity: number) {
  return Math.round((digitalQuantity - manualQuantity) * 1000) / 1000;
}

export function resolveReceiptQuantities(item: Pick<StockReceiptItemInput, "manualQuantity" | "digitalQuantity" | "quantity">) {
  const fallback = item.quantity;
  const manualQuantity = item.manualQuantity ?? fallback ?? 0;
  const digitalQuantity = item.digitalQuantity ?? fallback ?? manualQuantity;
  return { manualQuantity, digitalQuantity, difference: calculateWeightDifference(manualQuantity, digitalQuantity) };
}

export function calculateMargin(sellingPrice: number, averageCost: number) {
  const nominal = sellingPrice - averageCost;
  return { nominal, percentage: sellingPrice > 0 ? (nominal / sellingPrice) * 100 : 0 };
}

export function getStockStatus(quantity: number, minimumQuantity: number) {
  if (quantity <= 0) return "Habis";
  if (minimumQuantity > 0 && quantity <= minimumQuantity) return "Menipis";
  return "Aman";
}

export function validateStockReceiptPayload(payload: StockReceiptInput): string | null {
  if (!payload || !payload.supplierId || !payload.receivedDate || !Array.isArray(payload.items) || payload.items.length === 0) {
    return "Supplier, tanggal penerimaan, dan minimal satu produk wajib diisi.";
  }
  if (payload.dueDate && payload.dueDate < payload.receivedDate) {
    return "Jatuh tempo tidak boleh sebelum tanggal penerimaan.";
  }
  if (payload.items.some((item) => {
    if (!item) return true;
    const quantities = resolveReceiptQuantities(item);
    return !item || !item.productId
      || !Number.isFinite(quantities.manualQuantity) || quantities.manualQuantity <= 0
      || !Number.isFinite(quantities.digitalQuantity) || quantities.digitalQuantity <= 0
      || !Number.isFinite(item.unitCost) || item.unitCost <= 0;
  })) {
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

export function validateStockReceiptCancellation(receiptId: string, reason: string): string | null {
  if (!receiptId) return "Penerimaan stok tidak valid.";
  if (typeof reason !== "string" || !reason.trim()) return "Alasan pembatalan wajib diisi.";
  return null;
}

export function validateStockSettings(payload: StockSettingsInput): string | null {
  if (!payload?.productId) return "Produk wajib dipilih.";
  if (!Number.isFinite(payload.targetQuantity) || payload.targetQuantity < 0) return "Stok aktual tidak valid.";
  if (!Number.isFinite(payload.minimumQuantity) || payload.minimumQuantity < 0) return "Batas minimum stok tidak valid.";
  if (payload.notes !== undefined && typeof payload.notes !== "string") return "Alasan penyesuaian stok tidak valid.";
  return null;
}

export function getStockMovementLabel(type: string) {
  const labels: Record<string, string> = {
    PURCHASE_IN: "Barang masuk",
    SALE_OUT: "Keluar untuk invoice",
    INVOICE_VOID_RETURN: "Pengembalian invoice",
    ADJUSTMENT_IN: "Penyesuaian masuk",
    ADJUSTMENT_OUT: "Penyesuaian keluar",
    RETURN_TO_SUPPLIER: "Retur ke supplier",
    CUSTOMER_RETURN_IN: "Retur pelanggan",
    DAMAGED_OUT: "Produk rusak",
    EXPIRED_OUT: "Produk kedaluwarsa",
    INTERNAL_USE_OUT: "Pemakaian internal",
  };
  return labels[type] ?? type;
}
