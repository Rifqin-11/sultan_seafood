"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeActionError, requireApprovedUser, requirePermission } from "@/lib/security/auth";
import { isPublicInvoice, sanitizeInvoiceForRole } from "@/lib/domain/invoices";
import type { DirectCostCategory, Invoice, PublicInvoice } from "@/types";

export interface CreateInvoicePayload {
  customerId: string;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  discount?: number;
  status: "DRAFT" | "ISSUED";
  items: Array<{
    productId: string;
    description?: string;
    quantity: number;
    unit?: string;
    sellingPrice?: number;
    purchasePrice?: number;
  }>;
  costs: Array<{ category: DirectCostCategory; name: string; amount: number; notes?: string }>;
}

function validateCreatePayload(payload: CreateInvoicePayload) {
  if (!payload.customerId || !payload.issueDate || payload.items.length === 0) return "Restoran, tanggal, dan item invoice wajib diisi.";
  if (payload.items.some((item) => !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0)) return "Semua item harus memiliki produk dan jumlah yang valid.";
  if ((payload.discount ?? 0) < 0) return "Diskon tidak boleh negatif.";
  if (payload.costs.some((cost) => !cost.name.trim() || !Number.isFinite(cost.amount) || cost.amount <= 0)) return "Biaya internal tidak valid.";
  return null;
}

export async function createInvoiceAction(payload: CreateInvoicePayload) {
  const validationError = validateCreatePayload(payload);
  if (validationError) return { error: validationError };

  try {
    const user = await requirePermission("create_invoice_draft");
    if (payload.status === "ISSUED" && user.role === "STAFF") return { error: "Staff hanya dapat menyimpan invoice sebagai draft." };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_invoice_transaction", { p_payload: payload });
    if (error) throw error;
    const result = data as { invoiceId: string; invoiceNumber?: string; publicToken: string };
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    return { success: true, ...result, message: payload.status === "ISSUED" ? "Invoice berhasil diterbitkan." : "Draft invoice berhasil disimpan." };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal menyimpan invoice.") };
  }
}

export async function getInvoicesAction(): Promise<Invoice[]> {
  const user = await requireApprovedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invoices_secure", { p_invoice_id: null });
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data as Invoice[] : [];
  return rows.map((invoice) => sanitizeInvoiceForRole(invoice, user.role !== "STAFF"));
}

export async function getInvoiceByIdAction(id: string): Promise<(Invoice & { customerPhone?: string }) | null> {
  const user = await requireApprovedUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invoices_secure", { p_invoice_id: id });
  if (error) throw new Error(error.message);
  const invoice = Array.isArray(data) ? data[0] as (Invoice & { customerPhone?: string }) | undefined : undefined;
  return invoice ? sanitizeInvoiceForRole(invoice, user.role !== "STAFF") : null;
}

export async function getPublicInvoiceAction(token: string): Promise<PublicInvoice | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_invoice", { p_token: token });
  if (error) throw new Error(error.message);
  return isPublicInvoice(data) ? data : null;
}

export async function deleteInvoiceAction(id: string) {
  try {
    await requirePermission("create_invoice_draft");
    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_draft_invoice", { p_invoice_id: id });
    if (error) throw error;
    revalidatePath("/invoices");
    return { success: true, message: "Draft invoice berhasil dihapus." };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal menghapus draft invoice.") };
  }
}

export async function voidInvoiceAction(id: string, reason?: string) {
  try {
    await requirePermission("void_invoice");
    const supabase = await createClient();
    const { error } = await supabase.rpc("void_invoice", { p_invoice_id: id, p_reason: reason ?? null });
    if (error) throw error;
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    return { success: true, message: "Invoice berhasil dibatalkan tanpa menghapus riwayat." };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal membatalkan invoice.") };
  }
}

export async function issueInvoiceAction(id: string) {
  try {
    await requirePermission("issue_invoice");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("issue_invoice", { p_invoice_id: id });
    if (error) throw error;
    revalidatePath("/dashboard"); revalidatePath("/invoices"); revalidatePath(`/invoices/${id}`);
    return { success: true, invoiceNumber: data as string, message: "Draft berhasil diterbitkan." };
  } catch (error) { return { error: normalizeActionError(error, "Gagal menerbitkan draft.") }; }
}
