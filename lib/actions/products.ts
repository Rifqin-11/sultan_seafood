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

export async function createProductAction(payload: CreateProductPayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/products");
    return { success: true, message: "Produk berhasil ditambahkan (Demo Mode)." };
  }

  try {
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        sku: payload.sku || null,
        name: payload.name,
        category: payload.category,
        size: payload.size || null,
        default_unit: payload.defaultUnit,
        default_selling_price: payload.defaultSellingPrice || 0,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (error) throw error;

    if (payload.activeCost && payload.activeCost > 0) {
      await supabase.from("product_costs").insert({
        product_id: product.id,
        unit_cost: payload.activeCost,
        effective_at: new Date().toISOString(),
      });
    }

    revalidatePath("/products");
    return { success: true, message: "Produk berhasil ditambahkan." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menambahkan produk." };
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
          unit_cost
        )
      `)
      .order("created_at", { ascending: false });

    if (error || !products) {
      console.error("Supabase fetch products error:", error);
      const { mockProducts } = await import("@/lib/mock-data");
      return mockProducts;
    }

    return products.map((p) => {
      const latestCost = p.product_costs && p.product_costs.length > 0
        ? Number(p.product_costs[p.product_costs.length - 1].unit_cost)
        : 0;

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
