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
        <MetricCard title="Total Pendapatan" value={totalRevenue} isCurrency />
        <MetricCard title="Total Invoice" value={issuedInvoices.length} suffix="invoice" />
        <MetricCard
          title="Rata-rata Invoice"
          value={issuedInvoices.length ? totalRevenue / issuedInvoices.length : 0}
          isCurrency
        />
        <MetricCard
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
        <div className="overflow-x-auto">
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
      </div>
    </div>
  );
}
