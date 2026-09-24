import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getExpenseDailyTotalsAction } from "@/lib/actions/expenses";
import { getInvoicesAction } from "@/lib/actions/invoices";
import { calculateInvoiceMarginValue } from "@/lib/domain/invoices";
import { formatCurrency, formatDateShort, formatPercent, getDirectCostLabel } from "@/lib/utils";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { InternalCostCard } from "@/components/dashboard/internal-cost-card";
import type { DirectCostCategory, InternalCostBreakdown } from "@/types";
import { requireRole } from "@/lib/security/auth";
import { ReportPeriodTabs } from "@/components/reports/report-period-tabs";
import { getReportPeriodRange, getTodayJakarta, normalizeReportPeriod } from "@/lib/report-period";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Laporan Laba",
};

export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole(["OWNER", "FINANCE"]);
  const params = await searchParams;
  const period = normalizeReportPeriod(typeof params.period === "string" ? params.period : undefined);
  const customStartDate = typeof params.startDate === "string" ? params.startDate : undefined;
  const customEndDate = typeof params.endDate === "string" ? params.endDate : undefined;
  const range = getReportPeriodRange(period, getTodayJakarta(), [], customStartDate, customEndDate);
  const [invoices, periodExpenses] = await Promise.all([
    getInvoicesAction(period === "all" ? undefined : range.startDate, period === "all" ? undefined : range.endDate, true, true),
    getExpenseDailyTotalsAction(period === "all" ? undefined : range.startDate, period === "all" ? undefined : range.endDate),
  ]);
  const issuedInvoices = invoices.filter((invoice) => invoice.status !== "DRAFT" && invoice.status !== "VOID");
  const daily = new Map<string, { profit: number; revenue: number }>();
  issuedInvoices.forEach((invoice) => {
    const value = daily.get(invoice.issueDate) ?? { profit: 0, revenue: 0 };
    value.profit += invoice.transactionProfit;
    value.revenue += invoice.total;
    daily.set(invoice.issueDate, value);
  });
  periodExpenses.forEach((expense) => {
    const value = daily.get(expense.expenseDate) ?? { profit: 0, revenue: 0 };
    value.profit -= expense.total;
    daily.set(expense.expenseDate, value);
  });
  const profitData = [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({
    date: new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit" }),
    profit: value.profit,
    margin: value.revenue > 0 ? (value.profit / value.revenue) * 100 : 0,
  }));
  const periodLabel = range.label;

  const totalRevenue = issuedInvoices.reduce((s, i) => s + i.total, 0);
  const totalHPP = issuedInvoices.reduce((s, i) => s + i.totalProductCost, 0);
  const totalDirectCost = issuedInvoices.reduce((s, i) => s + i.totalDirectCost, 0);
  const totalProfit = issuedInvoices.reduce((s, i) => s + i.transactionProfit, 0);
  const totalOperatingExpenses = periodExpenses.reduce((sum, expense) => sum + expense.total, 0);
  const netProfit = totalProfit - totalOperatingExpenses;
  const totalScaleMargin = issuedInvoices.reduce((sum, invoice) => sum + (invoice.marginValue ?? calculateInvoiceMarginValue(invoice.items)), 0);
  const netProfitBeforeScaleMargin = netProfit - totalScaleMargin;
  const avgMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Build internal costs breakdown from real invoices
  const costCategoryMap: Record<string, number> = {};
  issuedInvoices.forEach((inv) => {
    (inv.directCosts || []).forEach((dc) => {
      costCategoryMap[dc.category] = (costCategoryMap[dc.category] || 0) + dc.amount;
    });
  });

  const internalCosts: InternalCostBreakdown[] = Object.entries(costCategoryMap).map(([cat, amt]) => ({
    category: cat as DirectCostCategory,
    label: getDirectCostLabel(cat as DirectCostCategory),
    amount: amt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Laba"
        description={`Omzet dikurangi HPP, biaya langsung, dan pengeluaran operasional · ${periodLabel}`}
      >
        <ReportPeriodTabs path="/reports/profit" activePeriod={period} startDate={customStartDate} endDate={customEndDate} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        <MetricCard accent="sky" title="Omzet" value={totalRevenue} isCurrency />
        <MetricCard accent="amber" title="HPP Produk" value={totalHPP} isCurrency internal />
        <MetricCard accent="emerald" title="Laba Kotor" value={totalRevenue - totalHPP} isCurrency internal />
        <MetricCard accent="orange" title="Biaya Langsung" value={totalDirectCost} isCurrency internal />
        <MetricCard accent="red" title="Pengeluaran" value={totalOperatingExpenses} isCurrency internal />
        <div className="rounded-[18px] border border-violet-200 bg-card p-4 shadow-card sm:p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Laba Bersih</p>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">Internal</span>
            </div>
            <Lock className="size-4 text-amber-500" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-0">
            <div className="sm:border-r sm:border-border sm:pr-5">
              <p className="text-xs text-muted-foreground">Laba</p>
              <p className="mt-1 text-xl font-bold tracking-[-0.035em] text-foreground tabular-nums">{formatCurrency(netProfitBeforeScaleMargin)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Setelah pengeluaran operasional</p>
            </div>
            <div className="sm:pl-5">
              <p className="text-xs text-muted-foreground">Margin timbangan</p>
              <p className="mt-1 text-xl font-bold tracking-[-0.035em] text-sky-700 tabular-nums">{formatCurrency(totalScaleMargin)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Tambahan dari selisih timbangan</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-violet-200 pt-3">
            <span className="text-sm font-semibold text-violet-900">Total laba + margin timbangan</span>
            <span className="text-xl font-bold tracking-[-0.035em] text-violet-800 tabular-nums">{formatCurrency(netProfitBeforeScaleMargin + totalScaleMargin)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ProfitChart data={profitData} periodLabel={periodLabel} />
        </div>
        <InternalCostCard
          costs={internalCosts.length > 0 ? internalCosts : []}
          total={totalDirectCost}
        />
      </div>

      {/* Summary card */}
      <div className="erp-surface p-5">
        <h3 className="text-sm font-semibold mb-4">Ringkasan Laba</h3>
        <div className="grid grid-cols-1 gap-5 min-[430px]:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {[
            { label: "Omzet", value: formatCurrency(totalRevenue) },
            { label: "HPP Produk", value: formatCurrency(totalHPP), internal: true },
            { label: "Biaya Langsung", value: formatCurrency(totalDirectCost), internal: true },
            { label: "Laba Produk", value: formatCurrency(totalRevenue - totalHPP), internal: true },
            { label: "Laba Transaksi", value: formatCurrency(totalProfit), internal: true },
            { label: "Pengeluaran Operasional", value: formatCurrency(totalOperatingExpenses), internal: true },
            { label: "Laba Bersih", value: formatCurrency(netProfit), internal: true, highlight: true },
            { label: "Margin Bersih", value: formatPercent(avgMargin), internal: true, highlight: true },
          ].map((row) => (
            <div key={row.label}>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                {row.label}
                {row.internal && (
                  <span className="text-[9px] px-1 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                    Int
                  </span>
                )}
              </p>
              <p
                className={`text-lg font-bold ${row.highlight ? "text-emerald-600" : "text-foreground"} tabular-nums`}
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="erp-surface overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Rincian laba per invoice</h3>
              <p className="mt-1 text-xs text-muted-foreground">Laba dipisahkan dari tambahan margin timbangan pada periode ini.</p>
            </div>
            <Lock className="mt-0.5 size-4 shrink-0 text-amber-500" />
          </div>
        </div>
        {issuedInvoices.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada invoice pada periode ini.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                    <th className="px-5 py-3">Invoice</th>
                    <th className="px-3 py-3">Restoran</th>
                    <th className="px-3 py-3">Tanggal</th>
                    <th className="px-3 py-3 text-right">Laba</th>
                    <th className="px-3 py-3 text-right">Margin timbangan</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {issuedInvoices.map((invoice) => {
                    const scaleMargin = invoice.marginValue ?? calculateInvoiceMarginValue(invoice.items);
                    const invoiceProfit = invoice.transactionProfit - scaleMargin;
                    return (
                      <tr key={invoice.id} className="hover:bg-muted/20">
                        <td className="px-5 py-3 font-mono text-xs font-medium">{invoice.invoiceNumber ?? "DRAFT"}</td>
                        <td className="px-3 py-3 text-sm font-medium">{invoice.customerName}</td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{formatDateShort(invoice.issueDate)}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">{formatCurrency(invoiceProfit)}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-sky-700">{formatCurrency(scaleMargin)}</td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums text-violet-800">{formatCurrency(invoiceProfit + scaleMargin)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border lg:hidden">
              {issuedInvoices.map((invoice) => {
                const scaleMargin = invoice.marginValue ?? calculateInvoiceMarginValue(invoice.items);
                const invoiceProfit = invoice.transactionProfit - scaleMargin;
                return (
                  <article key={invoice.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold">{invoice.invoiceNumber ?? "DRAFT"}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{invoice.customerName} · {formatDateShort(invoice.issueDate)}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-violet-800">{formatCurrency(invoiceProfit + scaleMargin)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/45 p-3 text-xs">
                      <div><p className="text-muted-foreground">Laba</p><p className="mt-1 font-semibold tabular-nums text-emerald-700">{formatCurrency(invoiceProfit)}</p></div>
                      <div className="border-l border-border pl-3"><p className="text-muted-foreground">Margin timbangan</p><p className="mt-1 font-semibold tabular-nums text-sky-700">{formatCurrency(scaleMargin)}</p></div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
