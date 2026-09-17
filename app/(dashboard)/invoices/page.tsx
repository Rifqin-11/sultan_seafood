import type { Metadata } from "next";
import { Plus, ReceiptText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { InvoiceListTable } from "@/components/invoices/invoice-list-table";
import { getInvoiceSummaryAction, getInvoicesPageAction } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { InvoiceExportButton } from "@/components/invoices/invoice-export-button";
import { requireApprovedUser } from "@/lib/security/auth";
import { getCompanyProfileAction } from "@/lib/actions/company";

export const metadata: Metadata = {
  title: "Invoice",
};

const PAGE_SIZE = 20;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);
  const search = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "ALL";

  const user = await requireApprovedUser();
  // KPI summary and the visible page load independently and only the current
  // page of invoice headers is transferred (no invoice items/costs).
  const [summary, pageResult, company] = await Promise.all([
    getInvoiceSummaryAction({ search, status }),
    getInvoicesPageAction({ search, status, page, pageSize: PAGE_SIZE }),
    getCompanyProfileAction(),
  ]);

  const totalInvoiceCount = summary.totalInvoiceCount;
  const totalInvoiceAmount = summary.totalInvoiceAmount;
  const paidCount = summary.paidCount;
  const totalPaidAmount = summary.totalPaidAmount;
  const unpaidCount = summary.unpaidCount;
  const totalUnpaidAmount = summary.totalUnpaidAmount;
  const overdueCount = summary.overdueCount;
  const totalOverdueAmount = summary.totalOverdueAmount;
  const paymentProgress = totalInvoiceAmount > 0 ? Math.min((totalPaidAmount / totalInvoiceAmount) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice"
        description="Kelola invoice dan pembayaran restoran"
      >
        <InvoiceExportButton />
        <Link href="/invoices/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="w-4 h-4 mr-1" />
          Buat Invoice
        </Link>
      </PageHeader>

      <section className="erp-surface overflow-hidden" aria-labelledby="invoice-summary-title">
        {/* Top section */}
        <div className="flex flex-col gap-4 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p id="invoice-summary-title" className="mb-1 text-xs font-medium text-muted-foreground">Total tagihan aktif</p>
            <p className="break-words text-[clamp(1.55rem,4vw,2rem)] font-bold leading-tight tracking-[-0.04em] text-foreground tabular-nums">{formatCurrency(totalInvoiceAmount)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/9 text-primary">
              <ReceiptText className="size-4" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none text-foreground tabular-nums">{totalInvoiceCount}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Invoice</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-5 sm:px-6">
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Progres pembayaran invoice"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(paymentProgress)}
          >
            {totalInvoiceCount > 0 && (<>
              <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(paidCount / totalInvoiceCount) * 100}%` }} />
              <div className="h-full bg-amber-400 transition-[width] duration-500" style={{ width: `${(unpaidCount / totalInvoiceCount) * 100}%` }} />
              <div className="h-full bg-red-500 transition-[width] duration-500" style={{ width: `${(overdueCount / totalInvoiceCount) * 100}%` }} />
            </>)}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-1 border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
          {/* Lunas */}
          <div className="flex flex-row items-center justify-between gap-4 border-b border-border px-5 py-4 sm:block sm:border-b-0 sm:px-6">
            <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Lunas</span>
            </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">{paidCount} invoice</p>
            </div>
            <p className="text-right text-sm font-bold text-foreground tabular-nums sm:mt-2 sm:text-left sm:text-base">{formatCurrency(totalPaidAmount)}</p>
          </div>

          {/* Belum Lunas */}
          <div className="flex flex-row items-center justify-between gap-4 border-b border-border px-5 py-4 sm:block sm:border-b-0 sm:px-6">
            <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Belum Lunas</span>
            </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">{unpaidCount} invoice</p>
            </div>
            <p className="text-right text-sm font-bold text-foreground tabular-nums sm:mt-2 sm:text-left sm:text-base">{formatCurrency(totalUnpaidAmount)}</p>
          </div>

          {/* Jatuh Tempo */}
          <div className="flex flex-row items-center justify-between gap-4 px-5 py-4 sm:block sm:px-6">
            <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Jatuh Tempo</span>
            </div>
              <p className={`mt-1 text-xs tabular-nums ${overdueCount > 0 ? "text-red-500" : "text-muted-foreground/50"}`}>{overdueCount} invoice</p>
            </div>
            <p className={`text-right text-sm font-bold tabular-nums sm:mt-2 sm:text-left sm:text-base ${overdueCount > 0 ? "text-red-600" : "text-muted-foreground/40"}`}>
              {overdueCount > 0 ? formatCurrency(totalOverdueAmount) : "—"}
            </p>
          </div>
        </div>
      </section>

      <InvoiceListTable
        key={`${page}|${search}|${status}`}
        invoices={pageResult.invoices}
        role={user.role}
        company={company}
        total={pageResult.total}
        page={page}
        pageSize={PAGE_SIZE}
        statusCounts={summary.statusCounts}
        search={search}
        status={status}
      />
    </div>
  );
}
