import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { mockInternalCosts, mockMetrics } from "@/lib/mock-data";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { InternalCostCard } from "@/components/dashboard/internal-cost-card";
import { MetricCard } from "@/components/dashboard/metric-card";

export const metadata: Metadata = {
  title: "Biaya Internal",
};

export default function InternalCostsReportPage() {
  const total = mockMetrics.totalDirectCostsThisMonth;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biaya Internal"
        description="Rincian biaya langsung per invoice"
      />

      <MetricCard
        title="Total Biaya Internal"
        value={total}
        isCurrency
        internal
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InternalCostCard costs={mockInternalCosts} total={total} />

        <div className="bg-white rounded-2xl border border-amber-200 shadow-card p-5">
          <h3 className="text-sm font-semibold mb-4 text-amber-800">
            Breakdown Kategori
          </h3>
          <div className="space-y-3">
            {mockInternalCosts.map((c) => {
              const pct = total > 0 ? (c.amount / total) * 100 : 0;
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
