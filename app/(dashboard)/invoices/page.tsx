import type { Metadata } from "next";
import { Plus, FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { InvoiceListTable } from "@/components/invoices/invoice-list-table";
import { MetricCard } from "@/components/dashboard/metric-card";
import { getInvoicesAction } from "@/lib/actions/invoices";
import Link from "next/link";
import { CsvExportButton } from "@/components/ui/csv-export-button";
import { requireApprovedUser } from "@/lib/security/auth";
import { getCompanyProfileAction } from "@/lib/actions/company";

export const metadata: Metadata = {
  title: "Invoice",
};

export default async function InvoicesPage() {
  const [invoices, user, company] = await Promise.all([getInvoicesAction(), requireApprovedUser(), getCompanyProfileAction()]);

  // Filter out VOID (Dibatalkan) invoices from total active billings calculation
  const activeInvoices = invoices.filter((inv) => inv.status !== "VOID");
  const totalInvoiceCount = activeInvoices.length;
  const totalInvoiceAmount = activeInvoices.reduce((acc, inv) => acc + inv.total, 0);

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID" || inv.status === "OVERDUE"
  );
  const unpaidCount = unpaidInvoices.length;
  const totalUnpaidAmount = unpaidInvoices.reduce((acc, inv) => acc + inv.remainingBalance, 0);

  const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
  const paidCount = paidInvoices.length;
  const totalPaidAmount = paidInvoices.reduce((acc, inv) => acc + inv.total, 0);

  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE");
  const overdueCount = overdueInvoices.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice"
        description="Kelola invoice dan pembayaran restoran"
      >
        <CsvExportButton filename="invoice.csv" label="Ekspor" headers={["Nomor", "Restoran", "Tanggal", "Status", "Total", "Dibayar", "Sisa"]} rows={invoices.map((invoice) => [invoice.invoiceNumber, invoice.customerName, invoice.issueDate, invoice.status, invoice.total, invoice.totalPaid, invoice.remainingBalance])} />
        <Link href="/invoices/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="w-4 h-4 mr-1" />
          Buat Invoice
        </Link>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tagihan"
          value={totalInvoiceAmount}
          isCurrency
          suffix={`(${totalInvoiceCount} inv)`}
          icon={FileText}
        />
        <MetricCard
          title="Belum Lunas (Piutang)"
          value={totalUnpaidAmount}
          isCurrency
          suffix={`(${unpaidCount} inv)`}
          icon={Clock}
        />
        <MetricCard
          title="Sudah Lunas"
          value={totalPaidAmount}
          isCurrency
          suffix={`(${paidCount} inv)`}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Jatuh Tempo"
          value={overdueCount}
          suffix=" invoice"
          icon={AlertTriangle}
        />
      </div>

      <InvoiceListTable initialInvoices={invoices} role={user.role} company={company} />
    </div>
  );
}
