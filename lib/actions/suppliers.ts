"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateSupplierPayload {
  name: string;
  contactName: string;
  phone: string;
  address: string;
}

export interface UpdateSupplierPayload extends CreateSupplierPayload {
  id: string;
  status?: "ACTIVE" | "INACTIVE";
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

export async function updateSupplierAction(payload: UpdateSupplierPayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/suppliers");
    return { success: true, message: "Supplier berhasil diperbarui." };
  }

  try {
    const { error } = await supabase
      .from("suppliers")
      .update({
        name: payload.name,
        contact_name: payload.contactName,
        phone: payload.phone,
        address: payload.address,
        status: payload.status,
      })
      .eq("id", payload.id);

    if (error) throw error;

    revalidatePath("/suppliers");
    return { success: true, message: "Supplier berhasil diperbarui." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal memperbarui data supplier." };
  }
}

export async function toggleSupplierStatusAction(id: string, currentStatus: "ACTIVE" | "INACTIVE") {
  const supabase = await createClient();
  const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/suppliers");
    return { success: true, message: `Status supplier diubah ke ${newStatus}.` };
  }

  try {
    const { error } = await supabase
      .from("suppliers")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/suppliers");
    return { success: true, message: `Status supplier diubah ke ${newStatus}.` };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal mengubah status supplier." };
  }
}

export async function deleteSupplierAction(id: string) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/suppliers");
    return { success: true, message: "Supplier berhasil dihapus." };
  }

  try {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        await supabase.from("suppliers").update({ status: "INACTIVE" }).eq("id", id);
        revalidatePath("/suppliers");
        return { success: true, message: "Supplier memiliki riwayat data. Status diubah ke Nonaktif." };
      }
      throw error;
    }

    revalidatePath("/suppliers");
    return { success: true, message: "Supplier berhasil dihapus." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menghapus supplier." };
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
