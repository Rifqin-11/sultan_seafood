"use server";

import { createClient } from "@/lib/supabase/server";
import { mockInvoices } from "@/lib/mock-data";
import { calculateInvoice } from "@/lib/utils";
import type { Invoice, DirectCostCategory } from "@/types";
import { revalidatePath } from "next/cache";

export interface CreateInvoicePayload {
  customerId: string;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  discount?: number;
  status: "DRAFT" | "ISSUED";
  items: Array<{
    productId: string;
    description: string;
    quantity: number;
    unit: string;
    sellingPrice: number;
    purchasePrice: number;
  }>;
  costs: Array<{
    category: DirectCostCategory;
    name: string;
    amount: number;
    notes?: string;
  }>;
}

export async function createInvoiceAction(payload: CreateInvoicePayload) {
  const supabase = await createClient();

  // Perform invoice calculations
  const calc = calculateInvoice(
    payload.items.map((i) => ({
      quantity: i.quantity,
      sellingPrice: i.sellingPrice,
      purchasePrice: i.purchasePrice,
    })),
    payload.costs.map((c) => ({ amount: c.amount })),
    payload.discount || 0
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Fallback if Supabase is not configured yet
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    console.log("Supabase env vars not set. Mock save successful:", payload);
    revalidatePath("/invoices");
    return { success: true, message: "Invoice berhasil disimpan (Mode Demo)." };
  }

  try {
    // 1. Insert Invoice Header
    const { data: invData, error: invError } = await supabase
      .from("invoices")
      .insert({
        customer_id: payload.customerId,
        issue_date: payload.issueDate,
        due_date: payload.dueDate || null,
        status: payload.status,
        subtotal: calc.subtotal,
        discount: payload.discount || 0,
        total: calc.revenue,
        remaining_balance: calc.revenue,
        total_product_cost: calc.totalProductCost,
        total_direct_cost: calc.totalDirectCost,
        product_profit: calc.productProfit,
        transaction_profit: calc.transactionProfit,
        transaction_margin: calc.transactionMargin,
        notes: payload.notes || null,
      })
      .select("id, invoice_number")
      .single();

    if (invError) throw invError;
    const invoiceId = invData.id;

    // 2. Insert Line Items
    if (payload.items.length > 0) {
      const itemsToInsert = payload.items.map((item) => {
        const itemSubtotal = item.quantity * item.sellingPrice;
        const itemCost = item.quantity * item.purchasePrice;
        return {
          invoice_id: invoiceId,
          product_id: item.productId,
          description_snapshot: item.description,
          quantity: item.quantity,
          unit: item.unit,
          selling_price_snapshot: item.sellingPrice,
          purchase_price_snapshot: item.purchasePrice,
          subtotal: itemSubtotal,
          product_cost_total: itemCost,
          profit: itemSubtotal - itemCost,
        };
      });

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // 3. Insert Direct Costs
    if (payload.costs.length > 0) {
      const costsToInsert = payload.costs.map((cost) => ({
        invoice_id: invoiceId,
        category: cost.category,
        name: cost.name,
        amount: cost.amount,
        notes: cost.notes || null,
      }));

      const { error: costsError } = await supabase
        .from("invoice_direct_costs")
        .insert(costsToInsert);

      if (costsError) throw costsError;
    }

    revalidatePath("/invoices");
    return {
      success: true,
      invoiceId,
      invoiceNumber: invData.invoice_number,
      message: "Invoice berhasil diterbitkan.",
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Create Invoice Error:", err);
    return { error: err.message || "Gagal menyimpan invoice." };
  }
}

export async function getInvoicesAction(): Promise<Invoice[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return mockInvoices;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        *,
        customers ( name )
      `
      )
      .order("created_at", { ascending: false });

    if (error || !data) return mockInvoices;

    return data.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customer_id,
      customerName: inv.customers?.name || "Restoran",
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      status: inv.status,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      total: Number(inv.total),
      totalPaid: Number(inv.total_paid),
      remainingBalance: Number(inv.remaining_balance),
      totalProductCost: Number(inv.total_product_cost),
      totalDirectCost: Number(inv.total_direct_cost),
      productProfit: Number(inv.product_profit),
      transactionProfit: Number(inv.transaction_profit),
      transactionMargin: Number(inv.transaction_margin),
      items: [],
      directCosts: [],
      notes: inv.notes,
      createdBy: inv.created_by || "system",
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    }));
  } catch {
    return mockInvoices;
  }
}

export async function getInvoiceByIdAction(id: string): Promise<(Invoice & { customerPhone?: string }) | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    const mock = mockInvoices.find((i) => i.id === id);
    if (!mock) return null;
    return { ...mock, customerPhone: "081234567890" };
  }

  try {
    const supabase = await createClient();
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .select(
        `
        *,
        customers ( name, phone ),
        invoice_items ( * ),
        invoice_direct_costs ( * )
      `
      )
      .eq("id", id)
      .single();

    if (invErr || !inv) {
      const mock = mockInvoices.find((i) => i.id === id);
      if (!mock) return null;
      return { ...mock, customerPhone: "081234567890" };
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customer_id,
      customerName: inv.customers?.name || "Restoran",
      customerPhone: inv.customers?.phone || undefined,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      status: inv.status,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      total: Number(inv.total),
      totalPaid: Number(inv.total_paid),
      remainingBalance: Number(inv.remaining_balance),
      totalProductCost: Number(inv.total_product_cost),
      totalDirectCost: Number(inv.total_direct_cost),
      productProfit: Number(inv.product_profit),
      transactionProfit: Number(inv.transaction_profit),
      transactionMargin: Number(inv.transaction_margin),
      items: (inv.invoice_items || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoice_id,
        productId: item.product_id,
        descriptionSnapshot: item.description_snapshot,
        quantity: Number(item.quantity),
        unit: item.unit,
        sellingPriceSnapshot: Number(item.selling_price_snapshot),
        purchasePriceSnapshot: Number(item.purchase_price_snapshot),
        subtotal: Number(item.subtotal),
        productCostTotal: Number(item.product_cost_total),
        profit: Number(item.profit),
      })),
      directCosts: (inv.invoice_direct_costs || []).map((cost: any) => ({
        id: cost.id,
        invoiceId: cost.invoice_id,
        category: cost.category,
        name: cost.name,
        amount: Number(cost.amount),
        notes: cost.notes,
      })),
      notes: inv.notes,
      createdBy: inv.created_by || "system",
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    };
  } catch {
    const mock = mockInvoices.find((i) => i.id === id);
    if (!mock) return null;
    return { ...mock, customerPhone: "081234567890" };
  }
}

