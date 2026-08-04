"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeActionError, requirePermission } from "@/lib/security/auth";
import type { Payment, PaymentMethod } from "@/types";

export interface CreatePaymentPayload {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber?: string;
  proofPath?: string;
  notes?: string;
}

export async function createPaymentAction(payload: CreatePaymentPayload) {
  if (!payload.invoiceId || !Number.isFinite(payload.amount) || payload.amount <= 0) return { error: "Invoice dan jumlah pembayaran wajib valid." };
  try {
    await requirePermission("record_payment");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("record_payment_transaction", {
      p_invoice_id: payload.invoiceId,
      p_amount: payload.amount,
      p_payment_date: payload.paymentDate,
      p_method: payload.method,
      p_reference_number: payload.referenceNumber ?? null,
      p_proof_path: payload.proofPath ?? null,
      p_notes: payload.notes ?? null,
    });
    if (error) throw error;
    revalidatePath("/dashboard");
    revalidatePath("/payments");
    revalidatePath("/invoices");
    return { success: true, paymentId: data as string, message: "Pembayaran berhasil dicatat." };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal mencatat pembayaran.") };
  }
}

export async function getPaymentsAction(): Promise<Payment[]> {
  await requirePermission("record_payment");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, invoice_id, payment_date, amount, method, reference_number, proof_path, notes, recorded_by")
    .order("payment_date", { ascending: false });
  if (error) throw new Error(error.message);

  return Promise.all((data ?? []).map(async (payment) => {
    let proofUrl: string | undefined;
    if (payment.proof_path) {
      const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(payment.proof_path, 900);
      proofUrl = signed?.signedUrl;
    }
    return {
      id: payment.id,
      invoiceId: payment.invoice_id,
      paymentDate: payment.payment_date,
      amount: Number(payment.amount),
      method: payment.method as PaymentMethod,
      referenceNumber: payment.reference_number ?? undefined,
      proofPath: payment.proof_path ?? undefined,
      proofUrl,
      notes: payment.notes ?? undefined,
      createdBy: payment.recorded_by ?? "system",
    };
  }));
}

export async function deletePaymentAction(paymentId: string) {
  try {
    await requirePermission("record_payment");
    const supabase = await createClient();
    const { error } = await supabase.rpc("void_payment_transaction", { p_payment_id: paymentId });
    if (error) throw error;
    revalidatePath("/dashboard");
    revalidatePath("/payments");
    revalidatePath("/invoices");
    return { success: true, message: "Pembayaran berhasil dibatalkan." };
  } catch (error) {
    return { error: normalizeActionError(error, "Gagal membatalkan pembayaran.") };
  }
}
