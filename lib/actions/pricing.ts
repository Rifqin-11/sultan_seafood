"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreatePurchasePricePayload {
  productId: string;
  supplierId?: string;
  unitCost: number;
  effectiveAt?: string;
  notes?: string;
}

export async function createPurchasePriceAction(payload: CreatePurchasePricePayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/pricing/purchase");
    return { success: true, message: "Harga beli berhasil disimpan (Mode Demo)." };
  }

  try {
    const { error } = await supabase.from("product_costs").insert({
      product_id: payload.productId,
      supplier_id: payload.supplierId || null,
      unit_cost: payload.unitCost,
      effective_at: payload.effectiveAt || new Date().toISOString(),
      notes: payload.notes || null,
    });

    if (error) throw error;

    revalidatePath("/pricing/purchase");
    return { success: true, message: "Harga beli berhasil ditambahkan." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menambahkan harga beli." };
  }
}

export async function getPurchasePricesAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    const { mockProductCosts } = await import("@/lib/mock-data");
    return mockProductCosts;
  }

  try {
    const supabase = await createClient();
    const { data: costs, error } = await supabase
      .from("product_costs")
      .select(`
        *,
        products ( id, name, default_unit ),
        suppliers ( id, name )
      `)
      .order("effective_at", { ascending: false });

    if (error || !costs) {
      const { mockProductCosts } = await import("@/lib/mock-data");
      return mockProductCosts;
    }

    return costs.map((c) => ({
      id: c.id,
      productId: c.product_id,
      productName: c.products?.name || "Produk",
      unit: c.products?.default_unit || "kg",
      supplierId: c.supplier_id || "",
      supplierName: c.suppliers?.name || "—",
      unitCost: Number(c.unit_cost),
      effectiveAt: c.effective_at,
      endedAt: c.ended_at || undefined,
      notes: c.notes || "",
      createdBy: "System",
      createdAt: c.created_at,
    }));
  } catch {
    const { mockProductCosts } = await import("@/lib/mock-data");
    return mockProductCosts;
  }
}

export interface CreateCustomerPricePayload {
  customerId: string;
  productId: string;
  sellingPrice: number;
}

export async function createCustomerPriceAction(payload: CreateCustomerPricePayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/pricing/selling");
    return { success: true, message: "Harga khusus berhasil disimpan (Mode Demo)." };
  }

  try {
    const { error } = await supabase.from("customer_prices").upsert(
      {
        customer_id: payload.customerId,
        product_id: payload.productId,
        selling_price: payload.sellingPrice,
        effective_at: new Date().toISOString(),
      },
      { onConflict: "customer_id,product_id" }
    );

    if (error) throw error;

    revalidatePath("/pricing/selling");
    return { success: true, message: "Harga khusus restoran berhasil disimpan." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menyimpan harga khusus." };
  }
}

export async function getCustomerPricesAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_prices")
      .select("*");

    if (error || !data) return [];

    return data.map((cp) => ({
      id: cp.id,
      customerId: cp.customer_id,
      productId: cp.product_id,
      sellingPrice: Number(cp.selling_price),
      effectiveAt: cp.effective_at,
    }));
  } catch {
    return [];
  }
}

export async function updatePurchasePriceAction(id: string, unitCost: number, notes?: string) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/pricing/purchase");
    return { success: true, message: "Harga beli diperbarui (Demo)." };
  }

  try {
    const { error } = await supabase
      .from("product_costs")
      .update({ unit_cost: unitCost, notes: notes || null })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/pricing/purchase");
    revalidatePath("/products");
    return { success: true, message: "Harga beli berhasil diperbarui." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal memperbarui harga beli." };
  }
}

export async function deletePurchasePriceAction(id: string) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/pricing/purchase");
    return { success: true, message: "Harga beli dihapus (Demo)." };
  }

  try {
    const { error } = await supabase.from("product_costs").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/pricing/purchase");
    revalidatePath("/products");
    return { success: true, message: "Harga beli berhasil dihapus." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menghapus harga beli." };
  }
}

export async function updateCustomerPriceAction(id: string, sellingPrice: number) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/pricing/selling");
    return { success: true, message: "Harga khusus diperbarui (Demo)." };
  }

  try {
    const { error } = await supabase
      .from("customer_prices")
      .update({ selling_price: sellingPrice })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/pricing/selling");
    return { success: true, message: "Harga khusus berhasil diperbarui." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal memperbarui harga khusus." };
  }
}

export async function deleteCustomerPriceAction(id: string) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/pricing/selling");
    return { success: true, message: "Harga khusus dihapus (Demo)." };
  }

  try {
    const { error } = await supabase.from("customer_prices").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/pricing/selling");
    return { success: true, message: "Harga khusus berhasil dihapus." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menghapus harga khusus." };
  }
}
