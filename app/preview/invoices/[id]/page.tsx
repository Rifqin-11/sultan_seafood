import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInvoiceByIdAction } from "@/lib/actions/invoices";
import { formatCurrency, formatDate, parseProductDescription } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoicePdfDownload } from "@/components/invoices/invoice-pdf-download";
import { CreditCard, ShieldCheck, CheckCircle2, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Official Invoice — Sultan Seafood",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerInvoicePreviewPage({ params }: PageProps) {
  const { id } = await params;
  const invoice = await getInvoiceByIdAction(id);
  if (!invoice) notFound();

  return (
    <div className="min-h-screen bg-slate-950 py-6 sm:py-12 px-3 sm:px-6 font-sans antialiased text-slate-900 selection:bg-blue-500 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Top Floating Control Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-lg shrink-0">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">Sultan Seafood</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                  OFFICIAL INVOICE
                </span>
              </div>
              <p className="text-xs text-slate-400">Pemasok Seafood Berkualitas untuk Restoran</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
            <InvoicePdfDownload invoice={invoice} />
          </div>
        </div>

        {/* Invoice Paper Document Container */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
          
          {/* Top Decorative Blue Accent Bar */}
          <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800" />

          <div className="p-6 sm:p-10 space-y-8">
            
            {/* Header: Company & Invoice Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="text-xl font-black text-slate-900 tracking-tight">SULTAN SEAFOOD</span>
                </div>
                <p className="text-xs text-slate-500">Jl. Pemasok Seafood No. 1, Jakarta Utara</p>
                <p className="text-xs text-slate-500">Telp: 021-XXXXXXXX · Email: info@sultansf.id</p>
              </div>

              <div className="sm:text-right space-y-1.5 w-full sm:w-auto bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">INVOICE</span>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                <p className="text-xl sm:text-2xl font-mono font-black text-slate-900 tracking-tight">
                  {invoice.invoiceNumber ?? "DRAFT"}
                </p>
                <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                  <p>Tanggal: <span className="font-bold text-slate-900">{formatDate(invoice.issueDate)}</span></p>
                  {invoice.dueDate && (
                    <p>Jatuh Tempo: <span className="font-bold text-red-600">{formatDate(invoice.dueDate)}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To Customer Section */}
            <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200/80 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  TAGIHAN KEPADA (PELANGGAN)
                </p>
                <h2 className="text-base font-extrabold text-slate-900">{invoice.customerName}</h2>
                {invoice.customerPhone && (
                  <p className="text-xs font-mono text-slate-600 mt-0.5">
                    WhatsApp: {invoice.customerPhone}
                  </p>
                )}
              </div>
              <div className="sm:text-right flex items-center sm:justify-end">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Invoice Record</span>
                </div>
              </div>
            </div>

            {/* Products & Items Table */}
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-4">Deskripsi Produk</th>
                      <th className="py-3 px-3">Ukuran / Size</th>
                      <th className="py-3 px-3 text-right">Qty</th>
                      <th className="py-3 px-3">Satuan</th>
                      <th className="py-3 px-4 text-right">Harga Jual</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {invoice.items.map((item, idx) => {
                      const { name, size } = parseProductDescription(
                        item.descriptionSnapshot,
                        (item as unknown as { size?: string }).size
                      );
                      return (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors even:bg-slate-50/40">
                          <td className="py-3.5 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                            {name}
                          </td>
                          <td className="py-3.5 px-3">
                            {size !== "—" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono font-bold text-xs border border-blue-200 shadow-2xs">
                                {size}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                            {item.quantity}
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-slate-500">{item.unit}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                            {formatCurrency(item.sellingPriceSnapshot)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-950 text-sm">
                            {formatCurrency(item.subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Invoice Total Summary Block */}
              <div className="flex flex-col sm:flex-row justify-end items-end pt-2">
                <div className="w-full sm:w-80 bg-slate-900 text-white rounded-xl p-5 shadow-lg space-y-3">
                  {invoice.discount > 0 && (
                    <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                      <span className="text-slate-400 font-medium">Diskon Tambahan:</span>
                      <span className="font-mono font-bold text-red-400">-{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Tagihan:</span>
                    <span className="text-xl sm:text-2xl font-mono font-black text-blue-400 tracking-tight">
                      {formatCurrency(invoice.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Instructions & Bank Details Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-extrabold tracking-wide uppercase">Informasi Pembayaran Transfer Bank</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> Rekening Resmi
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Bank Tujuan:</p>
                  <p className="text-base font-extrabold text-white">
                    Bank BCA: <span className="font-mono text-blue-400 text-lg font-black tracking-wider">1234567890</span>
                  </p>
                  <p className="text-xs text-slate-300">
                    Atas Nama: <span className="font-bold text-white">Sultan Seafood</span>
                  </p>
                </div>
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 text-xs space-y-1 text-slate-300">
                  <p className="font-bold text-white flex items-center gap-1">
                    💡 Catatan Pembayaran:
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Mohon sertakan nomor invoice <span className="font-mono text-blue-300 font-bold">{invoice.invoiceNumber ?? "DRAFT"}</span> pada berita transfer.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Document Footer */}
          <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500 font-medium flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>© {new Date().getFullYear()} Sultan Seafood ERP · Document generated officially</span>
            <span className="font-mono text-[11px] text-slate-400">ID: {invoice.id}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
