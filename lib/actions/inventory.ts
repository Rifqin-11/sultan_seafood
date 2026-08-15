"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeActionError, requireRole } from "@/lib/security/auth";
import { validateStockAdjustment, validateStockReceiptPayload, validateStockSettings, type StockReceiptInput, type StockSettingsInput } from "@/lib/domain/inventory";
import type { StockBalance, StockMovement, StockMovementType } from "@/types";

export interface InventorySnapshot {
  balances: StockBalance[];
  movements: StockMovement[];
}

function relatedRow(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return value[0] as Record<string, unknown> | undefined;
  return value as Record<string, unknown> | undefined;
}

export async function getInventoryAction(): Promise<InventorySnapshot> {
  await requireRole(["OWNER", "FINANCE"]);
  const supabase = await createClient();
  const [balanceResult, movementResult] = await Promise.all([
    supabase.from("stock_balances").select("product_id,quantity,minimum_quantity,average_unit_cost,updated_at,products(name,sku,size,default_unit,default_selling_price)").order("updated_at", { ascending: false }),
    supabase.from("stock_movements").select("id,product_id,product_name_snapshot,unit,movement_type,quantity_delta,balance_after,supplier_id,customer_id,invoice_id,receipt_id,receipt_item_id,notes,occurred_at,suppliers(name),customers(name),invoices(invoice_number),stock_receipts(receipt_number),stock_receipt_items(unit_cost)").order("occurred_at", { ascending: false }).limit(100),
  ]);
  if (balanceResult.error) throw new Error(balanceResult.error.message);
  if (movementResult.error) throw new Error(movementResult.error.message);

  const balances = (balanceResult.data ?? []).map((row) => {
    const value = row as Record<string, unknown>;
    const product = relatedRow(value.products) ?? {};
    const quantity = Number(value.quantity ?? 0);
    const averageUnitCost = Number(value.average_unit_cost ?? 0);
    return {
      productId: String(value.product_id),
      productName: String(product.name ?? "Produk tidak tersedia"),
      sku: product.sku ? String(product.sku) : undefined,
      size: product.size ? String(product.size) : undefined,
      unit: String(product.default_unit ?? "unit"),
      quantity,
      minimumQuantity: Number(value.minimum_quantity ?? 0),
      averageUnitCost,
      defaultSellingPrice: Number(product.default_selling_price ?? 0),
      stockValue: quantity * averageUnitCost,
      updatedAt: String(value.updated_at),
    } satisfies StockBalance;
  });

  const movements = (movementResult.data ?? []).map((row) => {
    const value = row as Record<string, unknown>;
    const supplier = relatedRow(value.suppliers);
    const customer = relatedRow(value.customers);
    const invoice = relatedRow(value.invoices);
    const receipt = relatedRow(value.stock_receipts);
    const receiptItem = relatedRow(value.stock_receipt_items);
    return {
      id: String(value.id),
      productId: String(value.product_id),
      productName: String(value.product_name_snapshot),
      unit: String(value.unit),
      movementType: value.movement_type as StockMovementType,
      quantityDelta: Number(value.quantity_delta ?? 0),
      balanceAfter: Number(value.balance_after ?? 0),
      supplierName: supplier?.name ? String(supplier.name) : undefined,
      customerName: customer?.name ? String(customer.name) : undefined,
      invoiceNumber: invoice?.invoice_number ? String(invoice.invoice_number) : undefined,
      receiptNumber: receipt?.receipt_number ? String(receipt.receipt_number) : undefined,
      purchaseUnitCost: receiptItem?.unit_cost ? Number(receiptItem.unit_cost) : undefined,
      notes: value.notes ? String(value.notes) : undefined,
      occurredAt: String(value.occurred_at),
    } satisfies StockMovement;
  });
  return { balances, movements };
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
