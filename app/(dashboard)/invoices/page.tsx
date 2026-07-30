import type { Metadata } from "next";
import { Plus, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { InvoiceListTable } from "@/components/invoices/invoice-list-table";
import { getInvoicesAction } from "@/lib/actions/invoices";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Invoice",
};

export default async function InvoicesPage() {
  const invoices = await getInvoicesAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice"
        description="Kelola invoice dan pembayaran restoran"
      >
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          Ekspor
        </Button>
        <Link href="/invoices/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="w-4 h-4 mr-1" />
          Buat Invoice
        </Link>
      </PageHeader>

      <InvoiceListTable initialInvoices={invoices} />
    </div>
  );
}
