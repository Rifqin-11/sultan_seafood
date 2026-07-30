import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getInvoicesAction } from "@/lib/actions/invoices";
import { mockInvoices, mockInternalCosts } from "@/lib/mock-data";
import { formatCurrency, formatPercent, getDirectCostLabel } from "@/lib/utils";
import { InternalCostCard } from "@/components/dashboard/internal-cost-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import type { DirectCostCategory, InternalCostBreakdown } from "@/types";

export const metadata: Metadata = {
  title: "Biaya Internal",
};

export default async function InternalCostsReportPage() {
  const realInvoices = await getInvoicesAction();
  const invoices = realInvoices && realInvoices.length > 0 ? realInvoices : mockInvoices;

  const issuedInvoices = invoices.filter(
    (inv) => inv.status !== "DRAFT" && inv.status !== "VOID"
  );

  const totalDirectCost = issuedInvoices.reduce((s, i) => s + i.totalDirectCost, 0);

  // Aggregate costs by category
  const categoryMap: Record<string, number> = {};
  issuedInvoices.forEach((inv) => {
    (inv.directCosts || []).forEach((dc) => {
      categoryMap[dc.category] = (categoryMap[dc.category] || 0) + dc.amount;
    });
  });

  const internalCostsList: InternalCostBreakdown[] = Object.keys(categoryMap).length > 0
    ? Object.entries(categoryMap).map(([cat, amt]) => ({
        category: cat as DirectCostCategory,
        label: getDirectCostLabel(cat as DirectCostCategory),
        amount: amt,
      }))
    : mockInternalCosts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biaya Internal"
        description="Rincian biaya langsung per invoice"
      />

      <MetricCard
        title="Total Biaya Internal"
        value={totalDirectCost > 0 ? totalDirectCost : mockInternalCosts.reduce((s, c) => s + c.amount, 0)}
        isCurrency
        internal
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InternalCostCard costs={internalCostsList} total={totalDirectCost > 0 ? totalDirectCost : 4120000} />

        <div className="bg-white rounded-2xl border border-amber-200 shadow-card p-5">
          <h3 className="text-sm font-semibold mb-4 text-amber-800">
            Breakdown Kategori
          </h3>
          <div className="space-y-3">
            {internalCostsList.map((c) => {
              const currentTotal = totalDirectCost > 0 ? totalDirectCost : 4120000;
              const pct = currentTotal > 0 ? (c.amount / currentTotal) * 100 : 0;
              return (
                <div key={c.category} className="flex items-center gap-4">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs font-medium text-foreground">{c.label}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-amber-100 rounded-full">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 w-28">
                    <p className="text-xs font-semibold tabular-nums">
                      {formatCurrency(c.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatPercent(pct)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
