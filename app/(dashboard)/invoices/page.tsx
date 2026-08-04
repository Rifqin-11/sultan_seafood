import type { Metadata } from "next";
import { Plus, FileText, Clock, CheckCircle2, AlertTriangle, TrendingUp, Banknote, ReceiptText, WalletCards } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { InvoiceListTable } from "@/components/invoices/invoice-list-table";
import { getInvoicesAction } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { CsvExportButton } from "@/components/ui/csv-export-button";
import { requireApprovedUser } from "@/lib/security/auth";
import { getCompanyProfileAction } from "@/lib/actions/company";

export const metadata: Metadata = {
  title: "Invoice",
};

export default async function InvoicesPage() {
  const [invoices, user, company] = await Promise.all([getInvoicesAction(), requireApprovedUser(), getCompanyProfileAction()]);

  // Filter out VOID (Dibatalkan) invoices from total active billings calculation
  const activeInvoices = invoices.filter((inv) => inv.status !== "VOID");
  const totalInvoiceCount = activeInvoices.length;
  const totalInvoiceAmount = activeInvoices.reduce((acc, inv) => acc + inv.total, 0);

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID" || inv.status === "OVERDUE"
  );
  const unpaidCount = unpaidInvoices.length;
  const totalUnpaidAmount = unpaidInvoices.reduce((acc, inv) => acc + inv.remainingBalance, 0);

  const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
  const paidCount = paidInvoices.length;
  const totalPaidAmount = paidInvoices.reduce((acc, inv) => acc + inv.total, 0);

  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE");
  const overdueCount = overdueInvoices.length;
  const paymentProgress = totalInvoiceAmount > 0 ? Math.min((totalPaidAmount / totalInvoiceAmount) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice"
        description="Kelola invoice dan pembayaran restoran"
      >
        <CsvExportButton filename="invoice.csv" label="Ekspor" headers={["Nomor", "Restoran", "Tanggal", "Status", "Total", "Dibayar", "Sisa"]} rows={invoices.map((invoice) => [invoice.invoiceNumber, invoice.customerName, invoice.issueDate, invoice.status, invoice.total, invoice.totalPaid, invoice.remainingBalance])} />
        <Link href="/invoices/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="w-4 h-4 mr-1" />
          Buat Invoice
        </Link>
      </PageHeader>

      {/* Summary Card — single horizontal card */}
      <div className="bg-white rounded-2xl border border-black/[0.07] shadow-[0_1px_2px_rgba(15,23,42,0.03),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Top section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 pt-5 pb-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400 mb-1">Total Tagihan Aktif</p>
            <p className="text-3xl font-bold tracking-[-0.03em] text-stone-900 tabular-nums truncate">{formatCurrency(totalInvoiceAmount)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex size-9 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
              <ReceiptText className="size-4" />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-stone-800 leading-none">{totalInvoiceCount}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Invoice</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
            {totalInvoiceCount > 0 && (<>
              <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(paidCount / totalInvoiceCount) * 100}%` }} />
              <div className="h-full bg-amber-400 transition-[width] duration-500" style={{ width: `${(unpaidCount / totalInvoiceCount) * 100}%` }} />
              <div className="h-full bg-red-500 transition-[width] duration-500" style={{ width: `${(overdueCount / totalInvoiceCount) * 100}%` }} />
            </>)}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-3 divide-x divide-stone-100 border-t border-stone-100">
          {/* Lunas */}
          <div className="flex flex-col gap-1 px-6 py-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Lunas</span>
            </div>
            <p className="text-base font-bold tabular-nums text-stone-800 truncate">{formatCurrency(totalPaidAmount)}</p>
            <p className="text-xs text-stone-400 tabular-nums">{paidCount} invoice</p>
          </div>

          {/* Belum Lunas */}
          <div className="flex flex-col gap-1 px-6 py-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Belum Lunas</span>
            </div>
            <p className="text-base font-bold tabular-nums text-stone-800 truncate">{formatCurrency(totalUnpaidAmount)}</p>
            <p className="text-xs text-stone-400 tabular-nums">{unpaidCount} invoice</p>
          </div>

          {/* Jatuh Tempo */}
          <div className="flex flex-col gap-1 px-6 py-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Jatuh Tempo</span>
            </div>
            <p className={`text-base font-bold tabular-nums truncate ${overdueCount > 0 ? "text-red-600" : "text-stone-300"}`}>
              {overdueCount > 0 ? formatCurrency(overdueInvoices.reduce((acc, inv) => acc + inv.remainingBalance, 0)) : "—"}
            </p>
            <p className={`text-xs tabular-nums ${overdueCount > 0 ? "text-red-400" : "text-stone-300"}`}>{overdueCount} invoice</p>
          </div>
        </div>
      </div>

      <InvoiceListTable initialInvoices={invoices} role={user.role} company={company} />
    </div>
  );
}
