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

  // Map custom prices for quick lookup (key: customerId_productId)
  const priceMap = new Map<string, number>();
  customPrices.forEach((cp) => {
    priceMap.set(`${cp.customerId}_${cp.productId}`, cp.sellingPrice);
  });

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

      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold sticky left-0 bg-muted/30">
                  Produk
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Harga Default
                </TableHead>
                {activeCustomers.map((c) => (
                  <TableHead
                    key={c.id}
                    className="text-xs font-semibold text-right"
                  >
                    {c.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeProducts.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-medium sticky left-0 bg-white">
                    <div>
                      <p>{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        per {p.defaultUnit}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-medium">
                    {p.defaultSellingPrice
                      ? formatCurrency(p.defaultSellingPrice)
                      : "—"}
                  </TableCell>
                  {activeCustomers.map((c) => {
                    const customPrice = priceMap.get(`${c.id}_${p.id}`);
                    return (
                      <TableCell
                        key={c.id}
                        className="text-right text-sm tabular-nums"
                      >
                        {customPrice ? (
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(customPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
