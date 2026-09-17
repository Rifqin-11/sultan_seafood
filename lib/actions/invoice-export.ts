"use server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedUser } from "@/lib/security/auth";
import type { Invoice } from "@/types";
import { sanitizeInvoiceForRole } from "@/lib/domain/invoices";

export interface InvoiceExportRow {
  invoiceNumber?: string;
  customerName: string;
  issueDate: string;
  status: string;
  total: number;
  totalPaid: number;
  remainingBalance: number;
}

/**
 * Loads every matching invoice header for CSV export, on demand only.
 * Never included in the initial page payload.
 */
export async function getInvoiceExportRowsAction(): Promise<InvoiceExportRow[]> {
  const user = await requireApprovedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invoices_secure_range", {
    p_start_date: null,
    p_end_date: null,
    p_limit: 5000,
    p_include_items: false,
    p_include_direct_costs: false,
  });
  if (error) throw new Error(error.message);
  const rows = (Array.isArray(data) ? (data as Invoice[]) : []).map((invoice) =>
    sanitizeInvoiceForRole(invoice, user.role !== "STAFF")
  );
  return rows.map((invoice) => ({
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    issueDate: invoice.issueDate,
    status: invoice.status,
    total: invoice.total,
    totalPaid: invoice.totalPaid,
    remainingBalance: invoice.remainingBalance,
  }));
}
