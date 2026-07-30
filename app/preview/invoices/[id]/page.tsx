import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInvoiceByIdAction } from "@/lib/actions/invoices";
import { formatCurrency, formatDate, parseProductDescription } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoicePdfDownload } from "@/components/invoices/invoice-pdf-download";
import { Building2, CreditCard, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Preview Invoice — Sultan Seafood",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerInvoicePreviewPage({ params }: PageProps) {
  const { id } = await params;
  const invoice = await getInvoiceByIdAction(id);
  if (!invoice) notFound();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">Sultan Seafood</h1>
                <BadgeOnline />
              </div>
              <p className="text-xs text-muted-foreground">Supplier Seafood Segar & Berkualitas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <InvoicePdfDownload invoice={invoice} />
          </div>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6 sm:p-8 space-y-8">
          {/* Invoice Header Details */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 border-b border-border pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Ditujukan Kepada:
              </p>
              <h2 className="text-lg font-bold text-foreground">{invoice.customerName}</h2>
              {invoice.customerPhone && (
                <p className="text-xs text-muted-foreground mt-1">
                  Telp: {invoice.customerPhone}
                </p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <div className="inline-flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">INVOICE</span>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <p className="text-lg font-mono font-bold text-blue-600">
                {invoice.invoiceNumber ?? "Draft"}
              </p>
              <p className="text-xs text-muted-foreground">
                Tanggal: <span className="font-medium text-foreground">{formatDate(invoice.issueDate)}</span>
              </p>
              {invoice.dueDate && (
                <p className="text-xs text-muted-foreground">
                  Jatuh Tempo: <span className="font-semibold text-amber-700">{formatDate(invoice.dueDate)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                  <th className="text-left py-3 px-2">No</th>
                  <th className="text-left py-3 px-4">Deskripsi Produk</th>
                  <th className="text-left py-3 px-3">Ukuran / Size</th>
                  <th className="text-right py-3 px-3">Qty</th>
                  <th className="text-left py-3 px-3">Satuan</th>
                  <th className="text-right py-3 px-3">Harga Jual</th>
                  <th className="text-right py-3 px-4">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.items.map((item, idx) => {
                  const { name, size } = parseProductDescription(item.descriptionSnapshot);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-2 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {name}
                      </td>
                      <td className="py-3 px-3 text-xs font-medium">
                        {size !== "—" ? (
                          <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200">
                            {size}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-medium">{item.quantity}</td>
                      <td className="py-3 px-3 text-muted-foreground">{item.unit}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(item.sellingPriceSnapshot)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-900">
                {invoice.discount > 0 && (
                  <tr>
                    <td colSpan={6} className="py-2 px-4 text-right text-xs text-muted-foreground font-medium">Diskon:</td>
                    <td className="py-2 px-4 text-right text-xs font-semibold text-red-600 tabular-nums">-{formatCurrency(invoice.discount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={6} className="py-4 px-4 text-right text-base font-bold text-slate-900">Total Tagihan:</td>
                  <td className="py-4 px-4 text-right text-xl font-extrabold text-blue-600 tabular-nums">{formatCurrency(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Info */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Informasi Pembayaran Transfer Bank
              </div>
              <p className="text-sm font-semibold text-slate-900">Bank BCA: 1234567890</p>
              <p className="text-xs text-muted-foreground">Atas Nama: <span className="font-semibold text-slate-800">Sultan Seafood</span></p>
            </div>
            <div className="space-y-1 sm:text-right flex flex-col justify-center">
              <div className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-end">
                <ShieldCheck className="w-3.5 h-3.5" /> Invoice Resmi & Sah
              </div>
              <p className="text-[11px] text-muted-foreground">Terima kasih atas kerja samanya!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sultan Seafood ERP · All Rights Reserved
        </div>
      </div>
    </div>
  );
}

function BadgeOnline() {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
      ONLINE PREVIEW
    </span>
  );
}
