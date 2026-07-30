import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProductsAction } from "@/lib/actions/products";
import { getCustomersAction } from "@/lib/actions/customers";
import { getCustomerPricesAction } from "@/lib/actions/pricing";
import { AddCustomerPriceDialog } from "@/components/pricing/add-customer-price-dialog";

import { SellingPriceTable } from "@/components/pricing/selling-price-table";

export const metadata: Metadata = {
  title: "Harga Jual Restoran",
};

export default async function SellingPricingPage() {
  const [products, customers, customPrices] = await Promise.all([
    getProductsAction(),
    getCustomersAction(),
    getCustomerPricesAction(),
  ]);

  const activeProducts = products.filter((p) => p.status === "ACTIVE");
  const activeCustomers = customers.filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Harga Jual Restoran"
        description="Harga khusus per produk untuk setiap restoran"
      >
        <AddCustomerPriceDialog
          customers={activeCustomers}
          products={activeProducts}
        />
      </PageHeader>

      <SellingPriceTable
        products={activeProducts}
        customers={activeCustomers}
        customPrices={customPrices}
      />
    </div>
  );
}
