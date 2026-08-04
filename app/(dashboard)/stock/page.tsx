import type { Metadata } from "next";
import { AlertTriangle, Boxes, PackageCheck, PackageX } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AddStockReceiptDialog } from "@/components/stock/add-stock-receipt-dialog";
import { StockTable } from "@/components/stock/stock-table";
import { getInventoryAction } from "@/lib/actions/inventory";
import { getProductsAction } from "@/lib/actions/products";
import { getSuppliersAction } from "@/lib/actions/suppliers";
import { requireRole } from "@/lib/security/auth";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Stok" };

export default async function StockPage() {
  await requireRole(["OWNER", "FINANCE"]);
  const [{ balances, movements }, products, suppliers] = await Promise.all([
    getInventoryAction(),
    getProductsAction(),
    getSuppliersAction(),
  ]);
  const activeBalances = balances.filter((balance) => products.some((product) => product.id === balance.productId && product.status === "ACTIVE"));
  const lowStock = activeBalances.filter((balance) => balance.minimumQuantity > 0 && balance.quantity <= balance.minimumQuantity);
  const outOfStock = activeBalances.filter((balance) => balance.quantity <= 0);
  const totalUnits = activeBalances.reduce((sum, balance) => sum + balance.quantity, 0);

  return <div className="space-y-6">
    <PageHeader title="Stok" description="Hubungkan penerimaan dari supplier dengan barang keluar ke restoran melalui invoice."><AddStockReceiptDialog products={products} suppliers={suppliers} /></PageHeader>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><MetricCard accent="emerald" title="Produk aktif" value={activeBalances.length} suffix="produk" icon={Boxes} /><MetricCard accent="sky" title="Total unit" value={formatNumber(totalUnits)} suffix="unit" icon={PackageCheck} /><MetricCard accent="amber" title="Stok menipis" value={lowStock.length} suffix="produk" icon={AlertTriangle} /><MetricCard accent="red" title="Stok habis" value={outOfStock.length} suffix="produk" icon={PackageX} /></div>
    <StockTable balances={activeBalances} movements={movements} />
  </div>;
}
