"use client";

import { Scale, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import type { StockWeightDifference } from "@/types";

interface StockWeightDifferenceTableProps {
  rows: StockWeightDifference[];
}

export function StockWeightDifferenceTable({ rows }: StockWeightDifferenceTableProps) {
  const positiveRows = rows.filter((row) => row.difference > 0);
  const supplierRows = positiveRows.filter((row) => row.source === "SUPPLIER_RECEIPT");
  const invoiceMarginRows = positiveRows.filter((row) => row.source === "INVOICE_MARGIN");
  const totalDifference = positiveRows.reduce((sum, row) => sum + row.difference, 0);
  const totalEstimatedStockValue = supplierRows.reduce((sum, row) => sum + row.estimatedStockValue, 0);
  const totalAdditionalInvoiceValue = invoiceMarginRows.reduce((sum, row) => sum + row.additionalInvoiceValue, 0);

  return (
    <section className="erp-surface overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Scale className="size-4" /></div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Selisih timbangan</h2>
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-stone-500">Satu daftar untuk membedakan tambahan berat dari supplier dan tambahan tagihan dari margin invoice.</p>
          </div>
        </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[30rem] sm:grid-cols-3">
           <div className="rounded-xl bg-amber-50/70 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">Total selisih</p><p className="mt-1 text-sm font-bold tabular-nums text-amber-950">{totalDifference.toFixed(1)} unit</p></div>
           <div className="rounded-xl bg-emerald-50/70 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">Tambahan stok</p><p className="mt-1 text-sm font-bold tabular-nums text-emerald-950">{formatCurrency(totalEstimatedStockValue)}</p></div>
           <div className="rounded-xl bg-sky-50/70 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-sky-700">Tambahan invoice</p><p className="mt-1 text-sm font-bold tabular-nums text-sky-950">{formatCurrency(totalAdditionalInvoiceValue)}</p></div>
        </div>
      </div>
      {positiveRows.length === 0 ? <EmptyState icon={Scale} title="Belum ada selisih timbangan" description="Penerimaan dengan berat digital lebih besar dari berat manual akan tercatat di sini." /> : (
        <div className="erp-table-wrap overflow-x-auto">
          <table className="erp-table w-full min-w-[920px] text-sm">
             <thead><tr className="border-b border-stone-200 bg-stone-50/80"><th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">Tanggal / referensi</th><th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">Jenis</th><th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">Produk</th><th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">Relasi</th><th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Berat awal</th><th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Berat akhir</th><th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Selisih</th><th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Dampak</th></tr></thead>
             <tbody className="divide-y divide-stone-100">{positiveRows.map((row) => { const isInvoiceMargin = row.source === "INVOICE_MARGIN"; return <tr key={row.id} className="hover:bg-stone-50/60"><td className="px-5 py-3"><p className="font-medium text-stone-800">{formatDateShort(row.receivedDate)}</p><p className="mt-1 text-xs text-stone-400">{isInvoiceMargin ? row.invoiceNumber || "Invoice" : row.receiptNumber || "Penerimaan stok"}</p></td><td className="px-3 py-3"><span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${isInvoiceMargin ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{isInvoiceMargin ? "Margin invoice" : "Barang masuk"}</span></td><td className="px-3 py-3"><p className="font-semibold text-stone-900">{row.productName}</p><p className="mt-1 text-xs text-stone-500">{isInvoiceMargin ? "Tambahan berat tertagih" : `Harga supplier ${formatCurrency(row.unitCost)}/${row.unit}`}</p></td><td className="px-3 py-3 text-stone-600">{isInvoiceMargin ? row.customerName || "—" : row.supplierName || "—"}</td><td className="px-3 py-3 text-right tabular-nums text-stone-600">{row.manualQuantity.toFixed(1)} {row.unit}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-stone-900">{row.digitalQuantity.toFixed(1)} {row.unit}</td><td className={`px-3 py-3 text-right font-semibold tabular-nums ${isInvoiceMargin ? "text-sky-700" : "text-emerald-700"}`}>+{row.difference.toFixed(1)} {row.unit}</td><td className="px-5 py-3 text-right">{isInvoiceMargin ? <><p className="font-semibold tabular-nums text-sky-700">+{formatCurrency(row.additionalInvoiceValue)}</p><p className="mt-1 text-[11px] text-stone-500">Tambahan tagihan</p></> : <><p className="font-semibold tabular-nums text-emerald-700">Turun {formatCurrency(row.hppReduction)}/{row.unit}</p><p className="mt-1 text-[11px] tabular-nums text-stone-500">HPP menjadi {formatCurrency(row.effectiveUnitCost)}/{row.unit}</p></>}</td></tr>; })}</tbody>
          </table>
        </div>
      )}
       <div className="flex items-start gap-2 border-t border-stone-200 bg-stone-50/60 px-5 py-3 text-[11px] leading-5 text-stone-500"><TrendingUp className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /><p><strong>Barang masuk</strong> menambah stok dan menurunkan HPP efektif. <strong>Margin invoice</strong> hanya menambah berat yang ditagihkan dan nilai invoice, tidak mengurangi stok.</p></div>
    </section>
  );
}
