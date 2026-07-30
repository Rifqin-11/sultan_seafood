"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateProductPayload {
  sku?: string;
  name: string;
  category: string;
  size?: string;
  defaultUnit: string;
  defaultSellingPrice?: number;
  activeCost?: number;
}

export interface UpdateProductPayload extends CreateProductPayload {
  id: string;
  status?: "ACTIVE" | "INACTIVE";
}

export async function createProductAction(payload: CreateProductPayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/products");
    return { success: true, message: "Produk berhasil ditambahkan (Demo Mode)." };
  }

  try {
    // 1. Insert into products table
    const productPayload: Record<string, any> = {
      sku: payload.sku || null,
      name: payload.name,
      category: payload.category,
      size: payload.size || null,
      default_unit: payload.defaultUnit,
      default_selling_price: payload.defaultSellingPrice || 0,
      status: "ACTIVE",
    };

    if (payload.activeCost && payload.activeCost > 0) {
      productPayload.active_cost = payload.activeCost;
    }

    let productId = "";

    try {
      const { data: product, error } = await supabase
        .from("products")
        .insert(productPayload)
        .select("id")
        .single();
      if (error) throw error;
      productId = product.id;
    } catch {
      // Fallback without active_cost column if schema lacks it
      delete productPayload.active_cost;
      const { data: product, error } = await supabase
        .from("products")
        .insert(productPayload)
        .select("id")
        .single();
      if (error) throw error;
      productId = product.id;
    }

    // 2. Insert into product_costs table
    if (payload.activeCost && payload.activeCost > 0 && productId) {
      try {
        await supabase.from("product_costs").insert({
          product_id: productId,
          unit_cost: payload.activeCost,
          effective_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Could not insert product_cost:", err);
      }
    }

    revalidatePath("/products");
    revalidatePath("/pricing/purchase");
    return { success: true, message: "Produk berhasil ditambahkan." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menambahkan produk." };
  }
}

export async function updateProductAction(payload: UpdateProductPayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/products");
    return { success: true, message: "Produk berhasil diperbarui." };
  }

  try {
    const updateData: Record<string, any> = {
      sku: payload.sku || null,
      name: payload.name,
      category: payload.category,
      size: payload.size || null,
      default_unit: payload.defaultUnit,
      default_selling_price: payload.defaultSellingPrice || 0,
      status: payload.status,
    };

    if (payload.activeCost !== undefined) {
      updateData.active_cost = payload.activeCost;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", payload.id);
      if (error) throw error;
    } catch {
      delete updateData.active_cost;
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", payload.id);
      if (error) throw error;
    }

    if (payload.activeCost !== undefined && payload.activeCost > 0) {
      try {
        await supabase.from("product_costs").insert({
          product_id: payload.id,
          unit_cost: payload.activeCost,
          effective_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Could not insert product_cost:", err);
      }
    }

    revalidatePath("/products");
    revalidatePath("/pricing/purchase");
    revalidatePath("/reports/profit");
    return { success: true, message: "Produk & harga beli berhasil diperbarui." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal memperbarui produk." };
  }
}

export async function toggleProductStatusAction(id: string, currentStatus: "ACTIVE" | "INACTIVE") {
  const supabase = await createClient();
  const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/products");
    return { success: true, message: `Status produk diubah ke ${newStatus}.` };
  }

  try {
    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/products");
    return { success: true, message: `Status produk diubah ke ${newStatus}.` };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal mengubah status produk." };
  }
}

export async function deleteProductAction(id: string) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/products");
    return { success: true, message: "Produk berhasil dihapus." };
  }

  try {
    // Clean up all foreign key dependencies first so product can be deleted
    await supabase.from("customer_prices").delete().eq("product_id", id);
    await supabase.from("product_costs").delete().eq("product_id", id);
    await supabase.from("invoice_items").delete().eq("product_id", id);

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/products");
    return { success: true, message: "Produk berhasil dihapus secara permanen." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menghapus produk." };
  }
}

export async function getProductsAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    const { mockProducts } = await import("@/lib/mock-data");
    return mockProducts;
  }

  try {
    const supabase = await createClient();
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        *,
        product_costs (
          unit_cost,
          effective_at,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error || !products) {
      console.error("Supabase fetch products error:", error);
      const { mockProducts } = await import("@/lib/mock-data");
      return mockProducts;
    }

    return products.map((p) => {
      let latestCost = 0;

      if (p.product_costs && p.product_costs.length > 0) {
        const sortedCosts = [...p.product_costs].sort((a, b) => {
          const timeA = new Date(a.effective_at || a.created_at || 0).getTime();
          const timeB = new Date(b.effective_at || b.created_at || 0).getTime();
          return timeB - timeA;
        });
        latestCost = Number(sortedCosts[0].unit_cost || 0);
      }

      if (!latestCost && p.active_cost) {
        latestCost = Number(p.active_cost);
      }

      const sellingPrice = Number(p.default_selling_price || 0);
      const margin = sellingPrice > 0 && latestCost > 0
        ? ((sellingPrice - latestCost) / sellingPrice) * 100
        : undefined;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        size: p.size || undefined,
        defaultUnit: p.default_unit,
        defaultSellingPrice: sellingPrice,
        activeCost: latestCost,
        estimatedMargin: margin ? Number(margin.toFixed(1)) : undefined,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    });
  } catch (err) {
    console.error("Catch error fetching products:", err);
    const { mockProducts } = await import("@/lib/mock-data");
    return mockProducts;
  }
}
