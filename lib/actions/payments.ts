"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@/types";

export interface CreatePaymentPayload {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber?: string;
  proofUrl?: string;
  notes?: string;
}

export async function createPaymentAction(payload: CreatePaymentPayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    const { mockPayments } = await import("@/lib/mock-data");
    mockPayments.unshift({
      id: `pay_${Date.now()}`,
      invoiceId: payload.invoiceId,
      amount: payload.amount,
      paymentDate: payload.paymentDate,
      method: payload.method,
      referenceNumber: payload.referenceNumber,
      proofUrl: payload.proofUrl,
      notes: payload.notes,
      createdBy: "Owner",
    });
    revalidatePath("/payments");
    revalidatePath("/invoices");
    return { success: true, message: "Pembayaran berhasil dicatat (Demo Mode)." };
  }

  try {
    const { error: payError } = await supabase.from("payments").insert({
      invoice_id: payload.invoiceId,
      amount: payload.amount,
      payment_date: payload.paymentDate,
      method: payload.method,
      reference_number: payload.referenceNumber || null,
      proof_url: payload.proofUrl || null,
      notes: payload.notes || null,
    });

    if (payError) throw payError;

    // Fetch current invoice totals to update remaining balance and status
    const { data: inv, error: invFetchErr } = await supabase
      .from("invoices")
      .select("total, total_paid")
      .eq("id", payload.invoiceId)
      .single();

    if (!invFetchErr && inv) {
      const newTotalPaid = Number(inv.total_paid || 0) + payload.amount;
      const newRemaining = Math.max(0, Number(inv.total) - newTotalPaid);
      const newStatus = newRemaining === 0 ? "PAID" : "PARTIALLY_PAID";

      await supabase
        .from("invoices")
        .update({
          total_paid: newTotalPaid,
          remaining_balance: newRemaining,
          status: newStatus,
        })
        .eq("id", payload.invoiceId);
    }

    revalidatePath("/payments");
    revalidatePath("/invoices");
    return { success: true, message: "Pembayaran berhasil dicatat." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal mencatat pembayaran." };
  }
}

export async function getPaymentsAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    const { mockPayments } = await import("@/lib/mock-data");
    return mockPayments;
  }

  try {
    const supabase = await createClient();
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .order("payment_date", { ascending: false });

    if (error || !payments || payments.length === 0) {
      const { mockPayments } = await import("@/lib/mock-data");
      return mockPayments;
    }

    return payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoice_id,
      amount: Number(p.amount),
      paymentDate: p.payment_date,
      method: p.method,
      referenceNumber: p.reference_number,
      proofUrl: p.proof_url || p.proofUrl,
      notes: p.notes,
      createdBy: p.created_by || p.recorded_by || "system",
      createdAt: p.created_at,
    }));
  } catch {
    const { mockPayments } = await import("@/lib/mock-data");
    return mockPayments;
  }
}
