import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getDashboardDataAction } from "@/lib/actions/dashboard";
import { formatCurrency, formatPercent, getDirectCostLabel } from "@/lib/utils";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { InternalCostCard } from "@/components/dashboard/internal-cost-card";
import type { DirectCostCategory, InternalCostBreakdown } from "@/types";
import { requireRole } from "@/lib/security/auth";

export const metadata: Metadata = {
  title: "Laporan Laba",
};

export default async function ProfitReportPage() {
  await requireRole(["OWNER", "FINANCE"]);
  const { invoices, profitData, periodLabel } = await getDashboardDataAction();

  const issuedInvoices = invoices.filter(
    (inv) => inv.status !== "DRAFT" && inv.status !== "VOID"
  );

  const totalRevenue = issuedInvoices.reduce((s, i) => s + i.total, 0);
  const totalHPP = issuedInvoices.reduce((s, i) => s + i.totalProductCost, 0);
  const totalDirectCost = issuedInvoices.reduce((s, i) => s + i.totalDirectCost, 0);
  const totalProfit = issuedInvoices.reduce((s, i) => s + i.transactionProfit, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

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
        description="Analisis laba dan margin per periode"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard accent="sky" title="Pendapatan" value={totalRevenue} isCurrency />
        <MetricCard accent="amber" title="HPP Produk" value={totalHPP} isCurrency internal />
        <MetricCard accent="orange"
          title="Biaya Langsung"
          value={totalDirectCost}
          isCurrency
          internal
        />
        <MetricCard accent="emerald" title="Laba Transaksi" value={totalProfit} isCurrency internal />
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
      <div className="bg-white rounded-2xl border border-border shadow-card p-5">
        <h3 className="text-sm font-semibold mb-4">Ringkasan Laba</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Pendapatan", value: formatCurrency(totalRevenue) },
            { label: "HPP Produk", value: formatCurrency(totalHPP), internal: true },
            { label: "Biaya Langsung", value: formatCurrency(totalDirectCost), internal: true },
            { label: "Laba Produk", value: formatCurrency(totalRevenue - totalHPP), internal: true },
            { label: "Laba Transaksi", value: formatCurrency(totalProfit), internal: true, highlight: true },
            { label: "Margin Rata-rata", value: formatPercent(avgMargin), internal: true, highlight: true },
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
    </div>
  );
}
