"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateExpensePayload {
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
}

export async function createExpenseAction(payload: CreateExpensePayload) {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    revalidatePath("/expenses");
    return { success: true, message: "Pengeluaran berhasil dicatat (Demo Mode)." };
  }

  try {
    const { error } = await supabase.from("expenses").insert({
      category: payload.category,
      description: payload.description,
      amount: payload.amount,
      expense_date: payload.expenseDate,
    });

    if (error) throw error;

    revalidatePath("/expenses");
    return { success: true, message: "Pengeluaran berhasil dicatat." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Gagal mencatat pengeluaran." };
  }
}

export async function getExpensesAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    const { mockExpenses } = await import("@/lib/mock-data");
    return mockExpenses;
  }

  try {
    const supabase = await createClient();
    const { data: expenses, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (error || !expenses) {
      const { mockExpenses } = await import("@/lib/mock-data");
      return mockExpenses;
    }

    return expenses.map((e) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      expenseDate: e.expense_date,
      receiptUrl: e.receipt_url,
      recordedBy: e.recorded_by || "system",
      userName: "Staff Gudang",
      createdAt: e.created_at,
    }));
  } catch {
    const { mockExpenses } = await import("@/lib/mock-data");
    return mockExpenses;
  }
}
