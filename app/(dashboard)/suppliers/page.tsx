import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getSuppliersAction } from "@/lib/actions/suppliers";
import { AddSupplierDialog } from "@/components/suppliers/add-supplier-dialog";
import { SupplierTable } from "@/components/suppliers/supplier-table";

export const metadata: Metadata = {
  title: "Supplier",
};

export default async function SuppliersPage() {
  const suppliers = await getSuppliersAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier"
        description="Kelola daftar supplier seafood dan Nelayan"
      >
        <AddSupplierDialog />
      </PageHeader>

      <SupplierTable suppliers={suppliers} />
    </div>
  );
}
