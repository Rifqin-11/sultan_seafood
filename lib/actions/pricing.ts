"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeActionError, requireApprovedUser, requirePermission } from "@/lib/security/auth";

export interface CreatePurchasePricePayload {
  productId: string;
  supplierId?: string;
  unitCost: number;
  effectiveAt?: string;
  notes?: string;
}

export async function createPurchasePriceAction(payload: CreatePurchasePricePayload) {
  try {
    await requirePermission("manage_purchase_price");
    if (!payload.productId || !Number.isFinite(payload.unitCost) || payload.unitCost <= 0) return { error: "Produk dan harga beli wajib valid." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_product_average_cost", {
      p_product_id: payload.productId,
      p_supplier_id: payload.supplierId || null,
      p_unit_cost: payload.unitCost,
      p_effective_at: payload.effectiveAt || new Date().toISOString(),
      p_notes: payload.notes || null,
    });
    if (error) throw error;
    revalidatePath("/stock"); revalidatePath("/pricing/purchase"); revalidatePath("/products"); revalidatePath("/reports/profit");
    return { success: true, message: "Harga beli rata-rata berhasil diperbarui." };
  } catch (error) { return { error: normalizeActionError(error, "Gagal menyimpan harga beli.") }; }
}

export async function getPurchasePricesAction() {
  await requirePermission("view_purchase_price");
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_costs").select("id,product_id,supplier_id,unit_cost,effective_at,ended_at,notes,created_at,products(name,default_unit),suppliers(name)").order("effective_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((cost) => {
    const product = Array.isArray(cost.products) ? cost.products[0] : cost.products;
    const supplier = Array.isArray(cost.suppliers) ? cost.suppliers[0] : cost.suppliers;
    return {
    id: cost.id, productId: cost.product_id, productName: product?.name ?? "Produk", unit: product?.default_unit ?? "kg",
    supplierId: cost.supplier_id ?? "", supplierName: supplier?.name ?? "-", unitCost: Number(cost.unit_cost),
    effectiveAt: cost.effective_at, endedAt: cost.ended_at ?? undefined, notes: cost.notes ?? "", createdBy: "system", createdAt: cost.created_at,
  }});
}

export interface CreateCustomerPricePayload { customerId: string; productId: string; sellingPrice: number }

export async function createCustomerPriceAction(payload: CreateCustomerPricePayload) {
  try {
    await requirePermission("manage_selling_price");
    if (!payload.customerId || !payload.productId || !Number.isFinite(payload.sellingPrice) || payload.sellingPrice <= 0) return { error: "Restoran, produk, dan harga jual wajib valid." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_customer_price", { p_customer_id: payload.customerId, p_product_id: payload.productId, p_selling_price: payload.sellingPrice, p_effective_at: new Date().toISOString() });
    if (error) throw error;
    revalidatePath("/pricing/selling");
    revalidatePath("/stock");
    return { success: true, message: "Harga khusus restoran berhasil disimpan." };
  } catch (error) { return { error: normalizeActionError(error, "Gagal menyimpan harga khusus.") }; }
}

export async function getCustomerPricesAction() {
  await requireApprovedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_prices").select("id,customer_id,product_id,selling_price,effective_at,ended_at,products(name,default_selling_price)").is("ended_at", null).order("effective_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((price) => {
    const product = Array.isArray(price.products) ? price.products[0] : price.products;
    return {
    id: price.id, customerId: price.customer_id, productId: price.product_id, productName: product?.name ?? "Produk",
    sellingPrice: Number(price.selling_price), defaultPrice: Number(product?.default_selling_price ?? 0), effectiveAt: price.effective_at,
    endedAt: price.ended_at ?? undefined,
  }});
}

export async function updatePurchasePriceAction(id: string, unitCost: number, notes?: string) {
  try {
    await requirePermission("manage_purchase_price");
    const supabase = await createClient();
    const { data: current, error: fetchError } = await supabase.from("product_costs").select("product_id,supplier_id").eq("id", id).single();
    if (fetchError) throw fetchError;
    return createPurchasePriceAction({ productId: current.product_id, supplierId: current.supplier_id ?? undefined, unitCost, notes });
  } catch (error) { return { error: normalizeActionError(error, "Gagal memperbarui harga beli.") }; }
}

export async function deletePurchasePriceAction(id: string) {
  try {
    await requirePermission("manage_purchase_price");
    const supabase = await createClient();
    const { error } = await supabase.from("product_costs").update({ ended_at: new Date().toISOString() }).eq("id", id).is("ended_at", null);
    if (error) throw error;
    revalidatePath("/stock"); revalidatePath("/pricing/purchase"); revalidatePath("/products");
    return { success: true, message: "Harga beli dinonaktifkan tanpa menghapus riwayat." };
  } catch (error) { return { error: normalizeActionError(error, "Gagal menonaktifkan harga beli.") }; }
}

export async function updateCustomerPriceAction(id: string, sellingPrice: number) {
  try {
    await requirePermission("manage_selling_price");
    const supabase = await createClient();
    const { data: current, error } = await supabase.from("customer_prices").select("customer_id,product_id").eq("id", id).single();
    if (error) throw error;
    return createCustomerPriceAction({ customerId: current.customer_id, productId: current.product_id, sellingPrice });
  } catch (error) { return { error: normalizeActionError(error, "Gagal memperbarui harga khusus.") }; }
}

export async function deleteCustomerPriceAction(id: string) {
  try {
    await requirePermission("manage_selling_price");
    const supabase = await createClient();
    const { error } = await supabase.from("customer_prices").update({ ended_at: new Date().toISOString() }).eq("id", id).is("ended_at", null);
    if (error) throw error;
    revalidatePath("/pricing/selling"); revalidatePath("/stock");
    return { success: true, message: "Harga khusus dinonaktifkan; harga default kembali digunakan." };
  } catch (error) { return { error: normalizeActionError(error, "Gagal menonaktifkan harga khusus.") }; }
}
