"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeActionError, requireRole } from "@/lib/security/auth";
import { validateStockAdjustment, validateStockReceiptCancellation, validateStockReceiptPayload, validateStockSettings, type StockReceiptInput, type StockSettingsInput } from "@/lib/domain/inventory";
import type { StockBalance, StockBatch, StockMovement, StockMovementType, StockWeightDifference } from "@/types";

export async function getInventorySummaryAction(): Promise<number> {
  await requireRole(["OWNER", "FINANCE"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_inventory_summary");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export interface DashboardStockSummary {
  totalStockValue: number;
  activeProductCount: number;
  totalQuantity: number;
}

/**
 * Small aggregate for dashboard KPI cards. Computed over ALL active products in
 * the database, so the value stays accurate without loading inventory rows.
 */
export async function getDashboardStockSummaryAction(): Promise<DashboardStockSummary> {
  await requireRole(["OWNER", "FINANCE"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_stock_summary");
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    totalStockValue: Number(row.totalStockValue ?? 0),
    activeProductCount: Number(row.activeProductCount ?? 0),
    totalQuantity: Number(row.totalQuantity ?? 0),
  };
}

export interface StockPageSummary {
  activeProductCount: number;
  totalQuantity: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockListParams {
  search?: string;
  category?: string;
  stockStatus?: string;
  productStatus?: string;
  type?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface StockListPage<T> {
  total: number;
  rows: T[];
}

export interface WeightDifferencePage extends StockListPage<StockWeightDifference> {
  totalDifference: number;
  totalEstimatedStockValue: number;
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getStockPageSummaryAction(): Promise<StockPageSummary> {
  await requireRole(["OWNER", "FINANCE"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_stock_page_summary");
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    activeProductCount: toNumber(row.activeProductCount),
    totalQuantity: toNumber(row.totalQuantity),
    totalStockValue: toNumber(row.totalStockValue),
    lowStockCount: toNumber(row.lowStockCount),
    outOfStockCount: toNumber(row.outOfStockCount),
  };
}

/** One page of stock balances; summary cards use getStockPageSummaryAction. */
export async function getStockBalancesPageAction(params: StockListParams = {}): Promise<StockListPage<StockBalance>> {
  await requireRole(["OWNER", "FINANCE"]);
  const supabase = await createClient();
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 200);
  const page = Math.max(params.page ?? 1, 1);
  const { data, error } = await supabase.rpc("get_stock_balances_page", {
    p_search: params.search?.trim() || null,
    p_category: params.category && params.category !== "all" ? params.category : null,
    p_stock_status: params.stockStatus && params.stockStatus !== "all" ? params.stockStatus : null,
    p_product_status: params.productStatus && params.productStatus !== "all" ? params.productStatus : null,
    p_sort_key: params.sortKey ?? "productName",
    p_sort_dir: params.sortDir ?? "asc",
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as { total?: number; rows?: Array<Record<string, unknown>> };
  return {
    total: toNumber(payload.total),
    rows: (payload.rows ?? []).map((row) => ({
      productId: String(row.productId),
      productName: String(row.productName ?? "Produk tidak tersedia"),
      sku: row.sku ? String(row.sku) : undefined,
      size: row.size ? String(row.size) : undefined,
      unit: String(row.unit ?? "unit"),
      category: row.category ? String(row.category) : "Tanpa kategori",
      productStatus: row.productStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      quantity: toNumber(row.quantity),
      minimumQuantity: toNumber(row.minimumQuantity),
      averageUnitCost: toNumber(row.averageUnitCost),
      defaultSellingPrice: toNumber(row.defaultSellingPrice),
      stockValue: toNumber(row.stockValue),
      latestPurchaseCost: row.latestPurchaseCost === null || row.latestPurchaseCost === undefined ? undefined : toNumber(row.latestPurchaseCost),
      supplierCount: toNumber(row.supplierCount),
      marginNominal: toNumber(row.marginNominal),
      marginPercentage: toNumber(row.marginPercentage),
      stockStatus: (row.stockStatus as StockBalance["stockStatus"]) ?? "Aman",
      openBatchCount: toNumber(row.openBatchCount),
      updatedAt: String(row.updatedAt ?? ""),
    })),
  };
}

export async function getStockMovementsPageAction(params: StockListParams = {}): Promise<StockListPage<StockMovement>> {
  await requireRole(["OWNER", "FINANCE"]);
  const supabase = await createClient();
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 200);
  const page = Math.max(params.page ?? 1, 1);
  const { data, error } = await supabase.rpc("get_stock_movements_page", {
    p_search: params.search?.trim() || null,
    p_type: params.type && params.type !== "all" ? params.type : null,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as { total?: number; rows?: Array<Record<string, unknown>> };
  return {
    total: toNumber(payload.total),
    rows: (payload.rows ?? []).map((row) => ({
      id: String(row.id),
      productId: String(row.productId),
      productName: String(row.productName),
      unit: String(row.unit),
      movementType: row.movementType as StockMovementType,
      quantityDelta: toNumber(row.quantityDelta),
      balanceAfter: toNumber(row.balanceAfter),
      supplierName: row.supplierName ? String(row.supplierName) : undefined,
      customerName: row.customerName ? String(row.customerName) : undefined,
      invoiceNumber: row.invoiceNumber ? String(row.invoiceNumber) : undefined,
      receiptNumber: row.receiptNumber ? String(row.receiptNumber) : undefined,
      receiptCancelledAt: row.receiptCancelledAt ? String(row.receiptCancelledAt) : undefined,
      purchaseUnitCost: row.purchaseUnitCost === null || row.purchaseUnitCost === undefined ? undefined : toNumber(row.purchaseUnitCost),
      manualQuantity: row.manualQuantity === null || row.manualQuantity === undefined ? undefined : toNumber(row.manualQuantity),
      digitalQuantity: row.digitalQuantity === null || row.digitalQuantity === undefined ? undefined : toNumber(row.digitalQuantity),
      weightDifference: row.weightDifference === null || row.weightDifference === undefined ? undefined : toNumber(row.weightDifference),
      notes: row.notes ? String(row.notes) : undefined,
      occurredAt: String(row.occurredAt),
    })),
  };
}

export async function getWeightDifferencesPageAction(params: StockListParams = {}): Promise<WeightDifferencePage> {
  await requireRole(["OWNER", "FINANCE"]);
  const supabase = await createClient();
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 200);
  const page = Math.max(params.page ?? 1, 1);
  const { data, error } = await supabase.rpc("get_weight_differences_page", {
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as { total?: number; totalDifference?: number; totalEstimatedStockValue?: number; rows?: Array<Record<string, unknown>> };
  return {
    total: toNumber(payload.total),
    totalDifference: toNumber(payload.totalDifference),
    totalEstimatedStockValue: toNumber(payload.totalEstimatedStockValue),
    rows: (payload.rows ?? []).map((row) => ({
      id: String(row.id),
      productId: String(row.productId),
      productName: String(row.productName ?? "Produk tidak tersedia"),
      unit: String(row.unit ?? "unit"),
      supplierName: row.supplierName ? String(row.supplierName) : undefined,
      receiptNumber: row.receiptNumber ? String(row.receiptNumber) : undefined,
      receivedDate: String(row.receivedDate),
      manualQuantity: toNumber(row.manualQuantity),
      digitalQuantity: toNumber(row.digitalQuantity),
      difference: toNumber(row.difference),
      unitCost: toNumber(row.unitCost),
      effectiveUnitCost: toNumber(row.effectiveUnitCost),
      hppReduction: toNumber(row.hppReduction),
      estimatedStockValue: toNumber(row.estimatedStockValue),
    })),
  };
}

export interface ProductSupplierPurchases {
  purchases: StockMovement[];
  batches: StockBatch[];
}

/** Loaded only when the supplier-purchases sheet is opened for one product. */
export async function getProductSupplierPurchasesAction(productId: string): Promise<ProductSupplierPurchases> {
  await requireRole(["OWNER", "FINANCE"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_product_supplier_purchases", { p_product_id: productId });
  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as { purchases?: Array<Record<string, unknown>>; batches?: Array<Record<string, unknown>> };
  return {
    purchases: (payload.purchases ?? []).map((row) => ({
      id: String(row.id),
      productId,
      productName: "",
      unit: String(row.unit ?? "unit"),
      movementType: "PURCHASE_IN" as StockMovementType,
      quantityDelta: toNumber(row.quantityDelta),
      balanceAfter: 0,
      supplierName: row.supplierName ? String(row.supplierName) : undefined,
      receiptId: row.receiptId ? String(row.receiptId) : undefined,
      receiptNumber: row.receiptNumber ? String(row.receiptNumber) : undefined,
      purchaseUnitCost: toNumber(row.purchaseUnitCost),
      manualQuantity: row.manualQuantity === null || row.manualQuantity === undefined ? undefined : toNumber(row.manualQuantity),
      digitalQuantity: row.digitalQuantity === null || row.digitalQuantity === undefined ? undefined : toNumber(row.digitalQuantity),
      occurredAt: String(row.occurredAt),
    })),
    batches: (payload.batches ?? []).map((row) => ({
      id: String(row.id),
      productId,
      supplierId: row.supplierId ? String(row.supplierId) : undefined,
      supplierName: row.supplierName ? String(row.supplierName) : undefined,
      quantityReceived: toNumber(row.quantityReceived),
      quantityRemaining: toNumber(row.quantityRemaining),
      unitCost: toNumber(row.unitCost),
      receivedAt: String(row.receivedAt),
      expiryDate: row.expiryDate ? String(row.expiryDate) : undefined,
      status: String(row.status),
      notes: row.notes ? String(row.notes) : undefined,
    })),
  };
}

export async function createStockReceiptAction(payload: StockReceiptInput) {
  const validationError = validateStockReceiptPayload(payload);
  if (validationError) return { error: validationError };
  try {
    await requireRole(["OWNER", "FINANCE"]);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_stock_receipt_transaction", { p_payload: payload });
    if (error) throw error;
    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath("/pricing/purchase");
    revalidatePath("/reports/supplier-payables");
    revalidatePath("/dashboard");
    return { success: true, ...(data as { receiptId: string; receiptNumber: string; supplierBillId?: string; total: number }), message: "Penerimaan stok berhasil dicatat." };
  } catch (error) {
    return {
      error: normalizeActionError(
        error,
        "Gagal mencatat penerimaan stok. Pastikan migration inventory_management sudah diterapkan ke Supabase.",
      ),
    };
  }
}

export async function cancelStockReceiptAction(receiptId: string, reason: string) {
  const validationError = validateStockReceiptCancellation(receiptId, reason);
  if (validationError) return { error: validationError };
  try {
    await requireRole(["OWNER", "FINANCE"]);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cancel_stock_receipt_transaction", {
      p_receipt_id: receiptId,
      p_reason: reason.trim(),
    });
    if (error) throw error;
    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath("/reports/supplier-payables");
    revalidatePath("/dashboard");
    return { success: true, ...(data as { receiptNumber: string; supplierBillVoided: boolean }), message: "Penerimaan stok berhasil dibatalkan." };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal membatalkan penerimaan stok.") };
  }
}

export async function forceDeleteStockReceiptAction(receiptId: string) {
  if (!receiptId) return { error: "Penerimaan stok tidak valid." };
  try {
    await requireRole(["OWNER"]);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("force_delete_stock_receipt", { p_receipt_id: receiptId });
    if (error) throw error;
    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/reports/supplier-payables");
    return { success: true, ...(data as { receiptNumber: string; invoiceHistoryPreserved: boolean }), message: "Pembelian supplier dan data stok terkait berhasil dihapus." };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal menghapus pembelian supplier secara permanen.") };
  }
}

export async function adjustStockAction(productId: string, quantityDelta: number, notes: string) {
  const validationError = validateStockAdjustment(productId, quantityDelta, notes);
  if (validationError) return { error: validationError };
  try {
    await requireRole(["OWNER", "FINANCE"]);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("adjust_stock_transaction", { p_product_id: productId, p_quantity_delta: quantityDelta, p_notes: notes });
    if (error) throw error;
    revalidatePath("/stock");
    revalidatePath("/products");
    return { success: true, quantity: Number(data), message: "Stok berhasil disesuaikan." };
  } catch (error) {
    return {
      error: normalizeActionError(
        error,
        "Gagal menyesuaikan stok. Pastikan migration inventory_management sudah diterapkan ke Supabase.",
      ),
    };
  }
}

export async function updateStockSettingsAction(payload: StockSettingsInput) {
  const validationError = validateStockSettings(payload);
  if (validationError) return { error: validationError };
  try {
    await requireRole(["OWNER", "FINANCE"]);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_stock_count_transaction", {
      p_product_id: payload.productId,
      p_target_quantity: payload.targetQuantity,
      p_minimum_quantity: payload.minimumQuantity,
      p_notes: payload.notes?.trim() || null,
    });
    if (error) throw error;
    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return {
      success: true,
      ...(data as { quantity: number; minimumQuantity: number; quantityDelta: number }),
      message: "Stok aktual dan batas minimum berhasil disimpan.",
    };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal menyimpan stok aktual.") };
  }
}

export async function setStockMinimumAction(productId: string, minimumQuantity: number) {
  if (!productId || !Number.isFinite(minimumQuantity) || minimumQuantity < 0) return { error: "Batas minimum stok tidak valid." };
  try {
    await requireRole(["OWNER", "FINANCE"]);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_stock_minimum", { p_product_id: productId, p_minimum_quantity: minimumQuantity });
    if (error) throw error;
    revalidatePath("/stock");
    return { success: true, minimumQuantity: Number(data), message: "Batas minimum stok berhasil disimpan." };
  } catch (error) {
    return {
      error: normalizeActionError(
        error,
        "Gagal menyimpan batas minimum stok. Pastikan migration inventory_management sudah diterapkan ke Supabase.",
      ),
    };
  }
}
