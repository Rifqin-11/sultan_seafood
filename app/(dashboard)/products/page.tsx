import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { ProductTable } from "@/components/products/product-table";
import { AddProductDialog } from "@/components/products/add-product-dialog";
import { getProductsAction } from "@/lib/actions/products";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Produk",
};

export default async function ProductsPage() {
  const products = await getProductsAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        description="Kelola produk seafood dan harga jual default"
      >
        <Link
          href="/pricing/purchase"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Tag className="w-4 h-4 mr-1" />
          Harga Beli
        </Link>
        <AddProductDialog />
      </PageHeader>

      <ProductTable initialProducts={products} />
    </div>
  );
}
