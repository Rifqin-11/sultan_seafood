import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getCustomersAction } from "@/lib/actions/customers";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { CustomerTable } from "@/components/customers/customer-table";

export const metadata: Metadata = {
  title: "Restoran / Pelanggan",
};

export default async function CustomersPage() {
  const customers = await getCustomersAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restoran / Pelanggan"
        description="Kelola daftar restoran pelanggan dan termin pembayaran"
      >
        <AddCustomerDialog />
      </PageHeader>

      <CustomerTable customers={customers} />
    </div>
  );
}
