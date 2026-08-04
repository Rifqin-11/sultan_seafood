import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getInvoicesAction } from "@/lib/actions/invoices";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { MetricCard } from "@/components/dashboard/metric-card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { requireRole } from "@/lib/security/auth";

export const metadata: Metadata = {
  title: "Piutang",
};

export default async function ReceivablesPage() {
  await requireRole(["OWNER", "FINANCE"]);
  const invoices = await getInvoicesAction();

  const unpaid = invoices.filter(
    (inv) =>
      inv.status === "ISSUED" ||
      inv.status === "PARTIALLY_PAID" ||
      inv.status === "OVERDUE"
  );

  const totalReceivables = unpaid.reduce((s, i) => s + i.remainingBalance, 0);
  const overdueCount = unpaid.filter((i) => i.status === "OVERDUE").length;
  const overdueAmount = unpaid
    .filter((i) => i.status === "OVERDUE")
    .reduce((s, i) => s + i.remainingBalance, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Piutang" description="Daftar invoice yang belum lunas" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard accent="amber"
          title="Total Piutang"
          value={totalReceivables}
          isCurrency
          icon={AlertCircle}
        />
        <MetricCard accent="blue"
          title="Invoice Overdue"
          value={overdueCount}
          suffix="invoice"
        />
        <MetricCard accent="blue"
          title="Nilai Overdue"
          value={overdueAmount}
          isCurrency
        />
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Nomor Invoice</TableHead>
                <TableHead className="text-xs font-semibold">Restoran</TableHead>
                <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold">Jatuh Tempo</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                <TableHead className="text-xs font-semibold text-right">Dibayar</TableHead>
                <TableHead className="text-xs font-semibold text-right">Sisa</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaid.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    Tidak ada piutang outstanding. Semua invoice telah lunas!
                  </TableCell>
                </TableRow>
              ) : (
                unpaid.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-mono font-medium">
                      {inv.invoiceNumber ?? "DRAFT"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {inv.customerName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateShort(inv.issueDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={
                          inv.status === "OVERDUE"
                            ? "text-red-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {inv.dueDate ? formatDateShort(inv.dueDate) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(inv.total)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-600 tabular-nums">
                      {inv.totalPaid > 0 ? formatCurrency(inv.totalPaid) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold tabular-nums">
                      <span
                        className={inv.status === "OVERDUE" ? "text-red-600" : ""}
                      >
                        {formatCurrency(inv.remainingBalance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="divide-y divide-stone-200 sm:hidden">
          {unpaid.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm leading-6 text-muted-foreground">
              Tidak ada piutang outstanding. Semua invoice telah lunas!
            </p>
          ) : (
            unpaid.map((invoice) => (
              <article key={invoice.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-stone-900">{invoice.invoiceNumber ?? "DRAFT"}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{invoice.customerName}</p>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                <div className="flex items-end justify-between rounded-xl bg-stone-50 p-3">
                  <div>
                    <p className="text-[11px] text-stone-500">Sisa tagihan</p>
                    <p className={`mt-1 text-base font-bold tabular-nums ${invoice.status === "OVERDUE" ? "text-red-600" : "text-stone-900"}`}>
                      {formatCurrency(invoice.remainingBalance)}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-stone-500">Jatuh tempo</p>
                    <p className={`mt-1 font-medium ${invoice.status === "OVERDUE" ? "text-red-600" : "text-stone-800"}`}>
                      {invoice.dueDate ? formatDateShort(invoice.dueDate) : "—"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-stone-500">Total invoice</p><p className="mt-1 font-medium tabular-nums text-stone-800">{formatCurrency(invoice.total)}</p></div>
                  <div className="border-l border-stone-200 pl-3"><p className="text-stone-500">Sudah dibayar</p><p className="mt-1 font-medium tabular-nums text-emerald-600">{formatCurrency(invoice.totalPaid)}</p></div>
                </div>
              </article>
            ))
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {unpaid.length} invoice belum lunas
          </p>
          <p className="text-sm font-bold">
            Total: {formatCurrency(totalReceivables)}
          </p>
        </div>
      </div>
    </div>
  );
}
