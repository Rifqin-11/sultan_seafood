import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getDashboardDataAction } from "@/lib/actions/dashboard";
import { formatCurrency, formatDateShort, formatPercent } from "@/lib/utils";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvExportButton } from "@/components/ui/csv-export-button";
import { requireRole } from "@/lib/security/auth";

export const metadata: Metadata = {
  title: "Laporan Penjualan",
};

export default async function SalesReportPage() {
  await requireRole(["OWNER", "FINANCE"]);
  const { invoices, salesData, periodLabel } = await getDashboardDataAction();

  const issuedInvoices = invoices.filter(
    (inv) => inv.status !== "DRAFT" && inv.status !== "VOID"
  );
  const totalRevenue = issuedInvoices.reduce((s, i) => s + i.total, 0);
  const totalProfit = issuedInvoices.reduce((s, i) => s + i.transactionProfit, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Penjualan" description="Analisis penjualan per periode">
        <CsvExportButton filename="laporan-penjualan.csv" headers={["Nomor", "Restoran", "Tanggal", "Pendapatan", "HPP", "Biaya", "Laba", "Margin"]} rows={issuedInvoices.map((invoice) => [invoice.invoiceNumber, invoice.customerName, invoice.issueDate, invoice.total, invoice.totalProductCost, invoice.totalDirectCost, invoice.transactionProfit, invoice.transactionMargin])} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard accent="emerald" title="Total Pendapatan" value={totalRevenue} isCurrency />
        <MetricCard accent="sky" title="Total Invoice" value={issuedInvoices.length} suffix="invoice" />
        <MetricCard accent="blue"
          title="Rata-rata Invoice"
          value={issuedInvoices.length ? totalRevenue / issuedInvoices.length : 0}
          isCurrency
        />
        <MetricCard accent="blue"
          title="Laba Transaksi"
          value={totalProfit}
          isCurrency
          internal
        />
      </div>

      <SalesChart data={salesData} periodLabel={periodLabel} />

      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Daftar Invoice Penjualan</h3>
        </div>
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Nomor</TableHead>
                <TableHead className="text-xs font-semibold">Restoran</TableHead>
                <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold text-right">Pendapatan</TableHead>
                <TableHead className="text-xs font-semibold text-right">HPP</TableHead>
                <TableHead className="text-xs font-semibold text-right">Biaya Langsung</TableHead>
                <TableHead className="text-xs font-semibold text-right">Laba</TableHead>
                <TableHead className="text-xs font-semibold text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuedInvoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/20">
                  <TableCell className="text-xs font-mono font-medium">
                    {inv.invoiceNumber ?? "DRAFT"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {inv.customerName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateShort(inv.issueDate)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                    {formatCurrency(inv.totalProductCost)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                    {formatCurrency(inv.totalDirectCost)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-emerald-600 tabular-nums">
                    {formatCurrency(inv.transactionProfit)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatPercent(inv.transactionMargin)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="divide-y divide-stone-200 sm:hidden">
          {issuedInvoices.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada invoice penjualan pada periode ini.</p>
          ) : (
            issuedInvoices.map((invoice) => (
              <article key={invoice.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-stone-900">{invoice.invoiceNumber ?? "DRAFT"}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{invoice.customerName} · {formatDateShort(invoice.issueDate)}</p>
                  </div>
                  <div className="shrink-0 text-right"><p className="text-[11px] text-stone-500">Pendapatan</p><p className="mt-1 text-sm font-bold tabular-nums text-stone-900">{formatCurrency(invoice.total)}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-stone-50 p-3 text-xs">
                  <div><p className="text-stone-500">HPP</p><p className="mt-1 font-medium tabular-nums text-stone-800">{formatCurrency(invoice.totalProductCost)}</p></div>
                  <div className="border-x border-stone-200 px-2"><p className="text-stone-500">Biaya</p><p className="mt-1 font-medium tabular-nums text-stone-800">{formatCurrency(invoice.totalDirectCost)}</p></div>
                  <div className="text-right"><p className="text-stone-500">Laba</p><p className="mt-1 font-bold tabular-nums text-emerald-600">{formatCurrency(invoice.transactionProfit)}</p></div>
                </div>
                <p className="text-right text-xs text-stone-500">Margin <span className="font-semibold text-stone-800">{formatPercent(invoice.transactionMargin)}</span></p>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
