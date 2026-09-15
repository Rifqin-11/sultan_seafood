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
  const totalDifference = positiveRows.reduce((sum, row) => sum + row.difference, 0);
  const totalEstimatedStockValue = positiveRows.reduce((sum, row) => sum + row.estimatedStockValue, 0);

  return (
    <section className="erp-surface overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Scale className="size-4" /></div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Selisih timbangan</h2>
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-stone-500">Selisih tetap masuk ke stok. HPP dihitung dari total pembayaran supplier dibagi berat digital.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-72">
          <div className="rounded-xl bg-amber-50/70 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">Total selisih</p><p className="mt-1 text-sm font-bold tabular-nums text-amber-950">{totalDifference.toFixed(1)} unit</p></div>
          <div className="rounded-xl bg-emerald-50/70 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">Nilai tambahan stok</p><p className="mt-1 text-sm font-bold tabular-nums text-emerald-950">{formatCurrency(totalEstimatedStockValue)}</p></div>
        </div>
      </div>
      {positiveRows.length === 0 ? <EmptyState icon={Scale} title="Belum ada selisih timbangan" description="Penerimaan dengan berat digital lebih besar dari berat manual akan tercatat di sini." /> : (
        <div className="erp-table-wrap overflow-x-auto">
          <table className="erp-table w-full min-w-[920px] text-sm">
            <thead><tr className="border-b border-stone-200 bg-stone-50/80"><th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">Tanggal / penerimaan</th><th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">Produk</th><th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">Supplier</th><th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Manual</th><th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Digital / stok</th><th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Selisih</th><th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Dampak ke HPP</th><th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Nilai tambahan stok</th></tr></thead>
            <tbody className="divide-y divide-stone-100">{positiveRows.map((row) => <tr key={row.id} className="hover:bg-stone-50/60"><td className="px-5 py-3"><p className="font-medium text-stone-800">{formatDateShort(row.receivedDate)}</p><p className="mt-1 text-xs text-stone-400">{row.receiptNumber || "Penerimaan stok"}</p></td><td className="px-3 py-3"><p className="font-semibold text-stone-900">{row.productName}</p><p className="mt-1 text-xs text-stone-500">Harga supplier {formatCurrency(row.unitCost)}/{row.unit}</p></td><td className="px-3 py-3 text-stone-600">{row.supplierName || "—"}</td><td className="px-3 py-3 text-right tabular-nums text-stone-600">{row.manualQuantity.toFixed(1)} {row.unit}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-stone-900">{row.digitalQuantity.toFixed(1)} {row.unit}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">+{row.difference.toFixed(1)} {row.unit}</td><td className="px-3 py-3 text-right"><p className="font-semibold tabular-nums text-emerald-700">Turun {formatCurrency(row.hppReduction)}/{row.unit}</p><p className="mt-1 text-[11px] tabular-nums text-stone-500">HPP menjadi {formatCurrency(row.effectiveUnitCost)}/{row.unit}</p></td><td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-700">{formatCurrency(row.estimatedStockValue)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="flex items-start gap-2 border-t border-stone-200 bg-stone-50/60 px-5 py-3 text-[11px] leading-5 text-stone-500"><TrendingUp className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /><p>Nilai selisih menjadi bagian dari stok, bukan laba final invoice. Invoice tetap memakai snapshot HPP saat diterbitkan.</p></div>
    </section>
  );
}
