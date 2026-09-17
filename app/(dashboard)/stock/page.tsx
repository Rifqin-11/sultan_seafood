import type { Metadata } from "next";
import { AlertTriangle, Boxes, PackageCheck, PackageX, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StockTabs, type StockTab } from "@/components/stock/stock-tabs";
import { getCustomersAction } from "@/lib/actions/customers";
import {
  getStockBalancesPageAction,
  getStockMovementsPageAction,
  getStockPageSummaryAction,
  getWeightDifferencesPageAction,
} from "@/lib/actions/inventory";
import { getCustomerPricesAction } from "@/lib/actions/pricing";
import { getProductsAction } from "@/lib/actions/products";
import { getSuppliersAction } from "@/lib/actions/suppliers";
import { requireRole } from "@/lib/security/auth";
import { formatNumber } from "@/lib/utils";
import { normalizeSortDirection } from "@/lib/report-sort";

export const metadata: Metadata = { title: "Stok, Harga & Modal" };

const PAGE_SIZE = 25;
const VALID_TABS: StockTab[] = ["stock", "movements", "weight-differences", "selling-prices"];

function firstParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole(["OWNER", "FINANCE"]);
  const params = await searchParams;
  const tabParam = firstParam(params.tab) as StockTab;
  const activeTab: StockTab = VALID_TABS.includes(tabParam) ? tabParam : "stock";
  const page = Math.max(1, Number(firstParam(params.page)) || 1);
  const query = firstParam(params.q);
  const stockStatus = firstParam(params.stockStatus) || "all";
  const productStatus = firstParam(params.productStatus) || "all";
  const sortKey = firstParam(params.sort) || "productName";
  const sortDir = normalizeSortDirection(firstParam(params.dir) || "asc");

  // Only fetch what the active tab renders. Cards use small aggregate RPCs.
  const [summary, balancesPage, movementsPage, weightPage, products, suppliers, customers, customerPrices] = await Promise.all([
    getStockPageSummaryAction(),
    activeTab === "stock" ? getStockBalancesPageAction({ search: query, stockStatus, productStatus, sortKey, sortDir, page, pageSize: PAGE_SIZE }) : Promise.resolve({ total: 0, rows: [] }),
    activeTab === "movements" ? getStockMovementsPageAction({ page, pageSize: PAGE_SIZE }) : Promise.resolve({ total: 0, rows: [] }),
    activeTab === "weight-differences" ? getWeightDifferencesPageAction({ page, pageSize: PAGE_SIZE }) : Promise.resolve({ total: 0, totalDifference: 0, totalEstimatedStockValue: 0, rows: [] }),
    activeTab === "stock" ? getProductsAction() : Promise.resolve([]),
    activeTab === "stock" ? getSuppliersAction() : Promise.resolve([]),
    activeTab === "selling-prices" ? getCustomersAction() : Promise.resolve([]),
    activeTab === "selling-prices" ? getCustomerPricesAction() : Promise.resolve([]),
  ]);

  return <div className="space-y-6">
    <PageHeader title="Stok, Harga & Modal" description="Kelola produk, stok, biaya, dan harga jual dari satu modul." />
    <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 xl:grid-cols-5 xl:gap-4">
      <MetricCard accent="emerald" title="Produk aktif" value={summary.activeProductCount} suffix="produk" icon={Boxes} />
      <MetricCard accent="sky" title="Total unit" value={formatNumber(summary.totalQuantity)} suffix="unit" icon={PackageCheck} />
      <MetricCard accent="violet" title="Nilai persediaan" value={summary.totalStockValue} isCurrency internal icon={WalletCards} />
      <MetricCard accent="amber" title="Stok menipis" value={summary.lowStockCount} suffix="produk" icon={AlertTriangle} />
      <MetricCard accent="red" title="Stok habis" value={summary.outOfStockCount} suffix="produk" icon={PackageX} />
    </div>
    {summary.lowStockCount > 0 && <section className="grid gap-3" aria-label="Peringatan stok">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-950">
        <p className="font-semibold">Stok menipis</p>
        <p className="mt-1 text-xs leading-5">Ada {summary.lowStockCount} produk pada atau di bawah batas minimum.</p>
      </div>
    </section>}
    <StockTabs
      activeTab={activeTab}
      balances={balancesPage.rows}
      balancesTotal={balancesPage.total}
      movements={movementsPage.rows}
      movementsTotal={movementsPage.total}
      weightDifferences={weightPage.rows}
      weightDifferencesTotal={weightPage.total}
      weightDifferencesTotalDifference={weightPage.totalDifference}
      weightDifferencesTotalValue={weightPage.totalEstimatedStockValue}
      products={products}
      suppliers={suppliers}
      customers={customers}
      customerPrices={customerPrices}
      page={page}
      pageSize={PAGE_SIZE}
      query={query}
      stockStatus={stockStatus}
      productStatus={productStatus}
      sortKey={sortKey}
      sortDir={sortDir}
    />
  </div>;
}
