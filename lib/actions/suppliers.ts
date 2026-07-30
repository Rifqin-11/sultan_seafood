"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateSupplierPayload {
  name: string;
  contactName: string;
  phone: string;
  address: string;
}

export async function createSupplierAction(payload: CreateSupplierPayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/suppliers");
    return { success: true, message: "Supplier berhasil ditambahkan (Demo Mode)." };
  }

  try {
    const { error } = await supabase.from("suppliers").insert({
      name: payload.name,
      contact_name: payload.contactName,
      phone: payload.phone,
      address: payload.address,
      status: "ACTIVE",
    });

    if (error) throw error;

    revalidatePath("/suppliers");
    return { success: true, message: "Supplier berhasil ditambahkan." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menambahkan supplier." };
  }
}

export async function getSuppliersAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    const { mockSuppliers } = await import("@/lib/mock-data");
    return mockSuppliers;
  }

  try {
    const supabase = await createClient();
    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !suppliers) {
      const { mockSuppliers } = await import("@/lib/mock-data");
      return mockSuppliers;
    }

    return suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactName: s.contact_name,
      phone: s.phone,
      address: s.address,
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  } catch {
    const { mockSuppliers } = await import("@/lib/mock-data");
    return mockSuppliers;
  }
}
