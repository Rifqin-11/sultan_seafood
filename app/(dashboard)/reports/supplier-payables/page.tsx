import type { Metadata } from "next";
import { AlertTriangle, Landmark, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AddSupplierBillDialog } from "@/components/payables/add-supplier-bill-dialog";
import { SupplierPayablesTable } from "@/components/payables/supplier-payables-table";
import { getSupplierPayablesAction } from "@/lib/actions/supplier-payables";
import { getSuppliersAction } from "@/lib/actions/suppliers";
import { requireRole } from "@/lib/security/auth";

export const metadata: Metadata = { title: "Hutang Supplier" };

export default async function SupplierPayablesPage() {
  await requireRole(["OWNER", "FINANCE"]);
  const [bills, suppliers] = await Promise.all([getSupplierPayablesAction(), getSuppliersAction()]);
  const outstanding = bills.filter((bill) => bill.status !== "PAID" && bill.status !== "VOID");
  const totalPayables = outstanding.reduce((sum, bill) => sum + bill.remainingBalance, 0);
  const overdue = outstanding.filter((bill) => bill.status === "OVERDUE");
  const overdueAmount = overdue.reduce((sum, bill) => sum + bill.remainingBalance, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Hutang Supplier" description="Pantau tagihan pembelian dan pembayaran yang harus diselesaikan ke supplier.">
        <AddSupplierBillDialog suppliers={suppliers} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard title="Total Hutang" value={totalPayables} isCurrency icon={Landmark} />
        <MetricCard title="Tagihan Jatuh Tempo" value={overdue.length} suffix="tagihan" icon={AlertTriangle} />
        <MetricCard title="Nilai Jatuh Tempo" value={overdueAmount} isCurrency icon={ReceiptText} />
      </div>

      <SupplierPayablesTable bills={bills} />
    </div>
  );
}
