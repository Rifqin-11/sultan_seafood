import type { Metadata } from "next";
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { InternalCostCard } from "@/components/dashboard/internal-cost-card";
import { OutstandingInvoiceCard } from "@/components/dashboard/outstanding-invoice-card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { getDashboardDataAction } from "@/lib/actions/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { invoices, metrics: m, salesData, profitData, internalCosts, periodLabel, user } = await getDashboardDataAction();
  const canViewInternal = user.role !== "STAFF";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Ringkasan performa bisnis Sultan Seafood
        </p>
      </div>

      {/* Row 1 — Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {canViewInternal && <MetricCard
          title="Order Hari Ini"
          value={m.ordersToday}
          icon={ShoppingBag}
          change={m.ordersTodayChange}
          changeLabel="vs kemarin"
          href="/invoices?filter=today"
        />}
        <MetricCard
          title="Order Minggu Ini"
          value={m.ordersThisWeek}
          icon={ShoppingBag}
          change={m.ordersThisWeekChange}
          changeLabel="vs minggu lalu"
          href="/invoices?filter=week"
        />
        <MetricCard
          title="Pendapatan Bulan Ini"
          value={m.revenueThisMonth}
          isCurrency
          icon={DollarSign}
          change={m.revenueThisMonthChange}
          changeLabel="vs bulan lalu"
          href="/reports/sales"
        />
        <MetricCard
          title="Laba Transaksi"
          value={m.transactionProfitThisMonth}
          isCurrency
          icon={TrendingUp}
          change={m.transactionMarginThisMonth}
          changeLabel="margin"
          href="/reports/profit"
          internal
        />
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesChart data={salesData} periodLabel={periodLabel} />
        {canViewInternal && <ProfitChart data={profitData} periodLabel={periodLabel} />}
      </div>

      {/* Row 3 — Internal Costs + Piutang summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {canViewInternal && <InternalCostCard
          costs={internalCosts}
          total={m.totalDirectCostsThisMonth}
        />}

        {/* Receivables summary */}
        {canViewInternal && <div className="bg-white rounded-2xl border border-border p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Status Piutang
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total piutang
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(m.receivables)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-sm text-red-600">Jatuh tempo</span>
              </div>
              <span className="text-sm font-semibold text-red-600">
                {m.overdueCount} invoice
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              {invoices
                .filter((inv) => inv.status === "OVERDUE")
                .slice(0, 2)
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {inv.customerName}
                    </span>
                    <span className="text-xs font-medium text-red-600">
                      {formatCurrency(inv.remainingBalance)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>}

        {/* Quick stats */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Ringkasan Keuangan
          </p>
          <div className="space-y-3">
            {[
              {
                label: "Pendapatan",
                value: formatCurrency(m.revenueThisMonth),
              },
              {
                label: "HPP Produk",
                value: formatCurrency(m.revenueThisMonth - m.transactionProfitThisMonth - m.totalDirectCostsThisMonth),
                internal: true,
              },
              {
                label: "Biaya Internal",
                value: formatCurrency(m.totalDirectCostsThisMonth),
                internal: true,
              },
              {
                label: "Laba Transaksi",
                value: formatCurrency(m.transactionProfitThisMonth),
                highlight: true,
                internal: true,
              },
              {
                label: "Margin",
                value: formatPercent(m.transactionMarginThisMonth),
                highlight: true,
                internal: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">
                    {row.label}
                  </span>
                  {row.internal && (
                    <span className="text-[9px] font-medium px-1 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                      Int
                    </span>
                  )}
                </div>
                <span
                  className={
                    row.highlight
                      ? "text-sm font-bold text-foreground"
                      : "text-sm font-medium text-foreground"
                  }
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4 — Outstanding Invoices */}
      <OutstandingInvoiceCard invoices={invoices} />
    </div>
  );
}
