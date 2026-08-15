import type { Metadata } from "next";
import { AlertTriangle, Boxes, PackageCheck, PackageX, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AddCustomerPriceDialog } from "@/components/pricing/add-customer-price-dialog";
import { AddPurchasePriceDialog } from "@/components/pricing/add-purchase-price-dialog";
import { PurchasePriceTable } from "@/components/pricing/purchase-price-table";
import { SellingPriceTable } from "@/components/pricing/selling-price-table";
import { AddStockReceiptDialog } from "@/components/stock/add-stock-receipt-dialog";
import { StockTable } from "@/components/stock/stock-table";
import { getCustomersAction } from "@/lib/actions/customers";
import { getInventoryAction } from "@/lib/actions/inventory";
import { getCustomerPricesAction, getPurchasePricesAction } from "@/lib/actions/pricing";
import { getProductsAction } from "@/lib/actions/products";
import { getSuppliersAction } from "@/lib/actions/suppliers";
import { requireRole } from "@/lib/security/auth";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Stok, Harga & Modal" };

export default async function StockPage() {
  await requireRole(["OWNER", "FINANCE"]);
  const [{ balances, movements }, products, suppliers, customers, purchaseCosts, customerPrices] = await Promise.all([
    getInventoryAction(),
    getProductsAction(),
    getSuppliersAction(),
    getCustomersAction(),
    getPurchasePricesAction(),
    getCustomerPricesAction(),
  ]);
  const activeBalances = balances.filter((balance) => products.some((product) => product.id === balance.productId && product.status === "ACTIVE"));
  const lowStock = activeBalances.filter((balance) => balance.minimumQuantity > 0 && balance.quantity <= balance.minimumQuantity);
  const outOfStock = activeBalances.filter((balance) => balance.quantity <= 0);
  const totalUnits = activeBalances.reduce((sum, balance) => sum + balance.quantity, 0);
  const totalStockValue = activeBalances.reduce((sum, balance) => sum + balance.stockValue, 0);
  const activeProducts = products.filter((product) => product.status === "ACTIVE");
  const activeCustomers = customers.filter((customer) => customer.status === "ACTIVE");

  return <div className="space-y-6">
    <PageHeader title="Stok, Harga & Modal" description="Kelola stok, harga beli rata-rata, harga jual restoran, dan modal persediaan dalam satu halaman.">
      <AddPurchasePriceDialog products={activeProducts} suppliers={suppliers} />
      <AddCustomerPriceDialog products={activeProducts} customers={activeCustomers} />
      <AddStockReceiptDialog products={products} suppliers={suppliers} />
    </PageHeader>
    <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 xl:grid-cols-5 xl:gap-4"><MetricCard accent="emerald" title="Produk aktif" value={activeBalances.length} suffix="produk" icon={Boxes} /><MetricCard accent="sky" title="Total unit" value={formatNumber(totalUnits)} suffix="unit" icon={PackageCheck} /><MetricCard accent="violet" title="Modal stok" value={totalStockValue} isCurrency internal icon={WalletCards} /><MetricCard accent="amber" title="Stok menipis" value={lowStock.length} suffix="produk" icon={AlertTriangle} /><MetricCard accent="red" title="Stok habis" value={outOfStock.length} suffix="produk" icon={PackageX} /></div>
    <StockTable balances={activeBalances} movements={movements} />
    <section className="space-y-3">
      <div><h2 className="text-lg font-bold tracking-tight text-stone-900">Riwayat Harga Beli</h2><p className="mt-1 text-sm text-stone-500">Riwayat HPP rata-rata setelah penerimaan dari supplier atau penyesuaian manual.</p></div>
      <PurchasePriceTable costs={purchaseCosts} products={activeProducts} suppliers={suppliers} />
    </section>
    <section className="space-y-3">
      <div><h2 className="text-lg font-bold tracking-tight text-stone-900">Harga Jual Restoran</h2><p className="mt-1 text-sm text-stone-500">Harga default produk dan harga khusus untuk setiap restoran.</p></div>
      <SellingPriceTable products={activeProducts} customers={activeCustomers} customPrices={customerPrices} />
    </section>
  </div>;
}
