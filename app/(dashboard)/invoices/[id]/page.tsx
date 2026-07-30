import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mockInvoices } from "@/lib/mock-data";
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatPercent,
} from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoicePdfDownload } from "@/components/invoices/invoice-pdf-download";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ArrowLeft,
  Copy,
  Lock,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Detail Invoice",
};

export default async function InvoiceDetailPage(props: PageProps<"/invoices/[id]">) {
  const { id } = await props.params;
  const invoice = mockInvoices.find((inv) => inv.id === id);
  if (!invoice) notFound();

  const isInternal =
    invoice.status !== "VOID" && invoice.status !== "DRAFT";

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                {invoice.invoiceNumber ?? "Draft"}
              </h2>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.customerName} · {formatDate(invoice.issueDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm">
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Duplikasi
          </Button>
          <InvoicePdfDownload invoice={invoice} />
          {(invoice.status === "ISSUED" ||
            invoice.status === "PARTIALLY_PAID" ||
            invoice.status === "OVERDUE") && (
            <RecordPaymentDialog defaultInvoiceId={invoice.id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer info */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-5">
            <h3 className="text-sm font-semibold mb-4">Informasi Pelanggan</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Restoran</p>
                <p className="font-medium">{invoice.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Tanggal Invoice</p>
                <p className="font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              {invoice.dueDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Jatuh Tempo</p>
                  <p
                    className={`font-medium ${invoice.status === "OVERDUE" ? "text-red-600" : ""}`}
                  >
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              )}
              {invoice.invoiceNumber && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Nomor Invoice</p>
                  <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">Item Produk</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-2.5">
                      Produk
                    </th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2.5">
                      Qty
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2.5">
                      Satuan
                    </th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2.5">
                      Harga Jual
                    </th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-2.5">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-medium">
                        {item.descriptionSnapshot}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {item.unit}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatCurrency(item.sellingPriceSnapshot)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border">
                  {invoice.discount > 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-2 text-right text-sm text-muted-foreground"
                      >
                        Diskon
                      </td>
                      <td className="px-5 py-2 text-right text-sm text-red-600 font-medium tabular-nums">
                        -{formatCurrency(invoice.discount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-3 text-right font-semibold"
                    >
                      Total
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-lg tabular-nums">
                      {formatCurrency(invoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Internal costs */}
          {invoice.directCosts.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-200 bg-amber-50/50">
                <Lock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">
                  Biaya Internal
                </h3>
                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200">
                  Internal
                </span>
              </div>
              <div className="divide-y divide-border">
                {invoice.directCosts.map((cost) => (
                  <div
                    key={cost.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{cost.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cost.category}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(cost.amount)}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-amber-50/30">
                  <p className="text-sm font-semibold text-amber-800">
                    Total Biaya Internal
                  </p>
                  <p className="text-sm font-bold text-amber-800 tabular-nums">
                    {formatCurrency(invoice.totalDirectCost)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Payment status */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-5">
            <h3 className="text-sm font-semibold mb-4">Status Pembayaran</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total tagihan</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sudah dibayar</span>
                <span className="font-semibold text-emerald-600 tabular-nums">
                  {formatCurrency(invoice.totalPaid)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-bold">
                <span>Sisa tagihan</span>
                <span
                  className={
                    invoice.remainingBalance > 0
                      ? "text-foreground tabular-nums"
                      : "text-emerald-600 tabular-nums"
                  }
                >
                  {invoice.remainingBalance > 0
                    ? formatCurrency(invoice.remainingBalance)
                    : "Lunas"}
                </span>
              </div>
              {invoice.total > 0 && (
                <div className="h-2 bg-muted rounded-full mt-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min((invoice.totalPaid / invoice.total) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Internal profit summary */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-card p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Ringkasan Internal
              </h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pendapatan</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>HPP Produk</span>
                <span className="tabular-nums">
                  {formatCurrency(invoice.totalProductCost)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Biaya Internal</span>
                <span className="tabular-nums">
                  {formatCurrency(invoice.totalDirectCost)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Laba Transaksi</span>
                <span className="tabular-nums">
                  {formatCurrency(invoice.transactionProfit)}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 mb-0.5">Margin</p>
                <p className="text-xl font-bold text-emerald-700">
                  {formatPercent(invoice.transactionMargin)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
