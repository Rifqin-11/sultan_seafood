import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getPurchasePricesAction } from "@/lib/actions/pricing";
import { getProductsAction } from "@/lib/actions/products";
import { getSuppliersAction } from "@/lib/actions/suppliers";
import { AddPurchasePriceDialog } from "@/components/pricing/add-purchase-price-dialog";

import { PurchasePriceTable } from "@/components/pricing/purchase-price-table";

export const metadata: Metadata = {
  title: "Harga Beli",
};

export default async function PurchasePricingPage() {
  const [costs, products, suppliers] = await Promise.all([
    getPurchasePricesAction(),
    getProductsAction(),
    getSuppliersAction(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Harga Beli"
        description="Riwayat harga beli produk dari supplier"
      >
        <AddPurchasePriceDialog products={products} suppliers={suppliers} />
      </PageHeader>

      <PurchasePriceTable costs={costs} products={products} suppliers={suppliers} />
    </div>
  );
}
