"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateCustomerPayload {
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  billingAddress: string;
  shippingAddress?: string;
  paymentTermDays: number;
}

export interface UpdateCustomerPayload extends CreateCustomerPayload {
  id: string;
  status?: "ACTIVE" | "INACTIVE";
}

export async function createCustomerAction(payload: CreateCustomerPayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/customers");
    return { success: true, message: "Restoran berhasil ditambahkan (Demo Mode)." };
  }

  try {
    const { error } = await supabase.from("customers").insert({
      name: payload.name,
      contact_name: payload.contactName,
      phone: payload.phone,
      email: payload.email || null,
      billing_address: payload.billingAddress,
      shipping_address: payload.shippingAddress || payload.billingAddress,
      payment_term_days: payload.paymentTermDays,
      status: "ACTIVE",
    });

    if (error) throw error;

    revalidatePath("/customers");
    return { success: true, message: "Restoran berhasil ditambahkan." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menambahkan restoran." };
  }
}

export async function updateCustomerAction(payload: UpdateCustomerPayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/customers");
    return { success: true, message: "Restoran berhasil diperbarui." };
  }

  try {
    const { error } = await supabase
      .from("customers")
      .update({
        name: payload.name,
        contact_name: payload.contactName,
        phone: payload.phone,
        email: payload.email || null,
        billing_address: payload.billingAddress,
        shipping_address: payload.shippingAddress || payload.billingAddress,
        payment_term_days: payload.paymentTermDays,
        status: payload.status,
      })
      .eq("id", payload.id);

    if (error) throw error;

    revalidatePath("/customers");
    return { success: true, message: "Restoran berhasil diperbarui." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal memperbarui data restoran." };
  }
}

export async function toggleCustomerStatusAction(id: string, currentStatus: "ACTIVE" | "INACTIVE") {
  const supabase = await createClient();
  const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/customers");
    return { success: true, message: `Status restoran diubah ke ${newStatus}.` };
  }

  try {
    const { error } = await supabase
      .from("customers")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/customers");
    return { success: true, message: `Status restoran diubah ke ${newStatus}.` };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal mengubah status restoran." };
  }
}

export async function deleteCustomerAction(id: string) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/customers");
    return { success: true, message: "Restoran berhasil dihapus." };
  }

  try {
    await supabase.from("customer_prices").delete().eq("customer_id", id);
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        await supabase.from("customers").update({ status: "INACTIVE" }).eq("id", id);
        revalidatePath("/customers");
        return { success: true, message: "Restoran memiliki invoice. Status diubah ke Nonaktif." };
      }
      throw error;
    }

    revalidatePath("/customers");
    return { success: true, message: "Restoran berhasil dihapus." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal menghapus restoran." };
  }
}

export async function getCustomersAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    const { mockCustomers } = await import("@/lib/mock-data");
    return mockCustomers;
  }

  try {
    const supabase = await createClient();
    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !customers) {
      const { mockCustomers } = await import("@/lib/mock-data");
      return mockCustomers;
    }

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      contactName: c.contact_name,
      phone: c.phone,
      email: c.email,
      billingAddress: c.billing_address,
      shippingAddress: c.shipping_address,
      paymentTermDays: c.payment_term_days,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  } catch {
    const { mockCustomers } = await import("@/lib/mock-data");
    return mockCustomers;
  }
}
