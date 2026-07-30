import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { getPaymentsAction } from "@/lib/actions/payments";
import { getInvoicesAction } from "@/lib/actions/invoices";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CreditCard, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Pembayaran",
};

export default async function PaymentsPage() {
  const methodLabel: Record<string, string> = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
    CHECK: "Cek",
    OTHER: "Lainnya",
  };

  const payments = await getPaymentsAction();
  const invoices = await getInvoicesAction();

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const receivables = invoices
    .filter((i) => i.status !== "VOID" && i.status !== "PAID")
    .reduce((s, i) => s + i.remainingBalance, 0);
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Pembayaran" description="Riwayat pembayaran invoice">
        <RecordPaymentDialog />
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total Piutang"
          value={receivables}
          isCurrency
          icon={AlertCircle}
          href="/reports/receivables"
        />
        <MetricCard
          title="Pembayaran Masuk"
          value={totalPaid}
          isCurrency
          icon={CreditCard}
        />
        <MetricCard
          title="Invoice Overdue"
          value={overdueCount}
          icon={AlertCircle}
          suffix="invoice"
        />
      </div>

      {/* Payments table */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Riwayat Pembayaran</h3>
          <RecordPaymentDialog />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold">Invoice</TableHead>
                <TableHead className="text-xs font-semibold">Metode</TableHead>
                <TableHead className="text-xs font-semibold">Referensi</TableHead>
                <TableHead className="text-xs font-semibold text-right">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => {
                const inv = invoices.find((i) => i.id === p.invoiceId);
                return (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateShort(p.paymentDate)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-mono font-medium">
                          {inv?.invoiceNumber || p.invoiceId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv?.customerName || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {methodLabel[p.method] ?? p.method}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                      {p.referenceNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums text-emerald-600">
                      +{formatCurrency(p.amount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {payments.length} transaksi pembayaran
          </p>
        </div>
      </div>
    </div>
  );
}
