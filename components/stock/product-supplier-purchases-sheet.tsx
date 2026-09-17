"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, TrendingUp } from "lucide-react";
import { CancelStockReceiptDialog } from "@/components/stock/cancel-stock-receipt-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency, formatDatetime, formatNumber } from "@/lib/utils";
import { getProductSupplierPurchasesAction, type ProductSupplierPurchases } from "@/lib/actions/inventory";
import type { StockBalance } from "@/types";

interface ProductSupplierPurchasesSheetProps {
  balance: StockBalance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductSupplierPurchasesSheet({ balance, open, onOpenChange }: ProductSupplierPurchasesSheetProps) {
  const [data, setData] = useState<ProductSupplierPurchases | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetched on demand so the stock list never ships every movement/batch row.
  // This component is mounted per open product, so state starts at "loading".
  useEffect(() => {
    if (!open) return;
    let active = true;
    getProductSupplierPurchasesAction(balance.productId)
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, balance.productId]);

  const purchases = data?.purchases ?? [];
  const productBatches = data?.batches ?? [];
  const suppliers = new Map<string, { name: string; quantity: number; total: number; latestCost: number; latestAt: string; remaining: number }>();

  for (const purchase of purchases) {
    const name = purchase.supplierName || "Supplier lama";
    const entry = suppliers.get(name) ?? { name, quantity: 0, total: 0, latestCost: purchase.purchaseUnitCost ?? 0, latestAt: purchase.occurredAt, remaining: 0 };
    const cost = purchase.purchaseUnitCost ?? 0;
    const paidQuantity = purchase.manualQuantity ?? purchase.quantityDelta;
    entry.quantity += paidQuantity;
    entry.total += paidQuantity * cost;
    if (new Date(purchase.occurredAt) > new Date(entry.latestAt)) { entry.latestAt = purchase.occurredAt; entry.latestCost = cost; }
    suppliers.set(name, entry);
  }
  for (const batch of productBatches) {
    const name = batch.supplierName || "Supplier lama";
    const entry = suppliers.get(name) ?? { name, quantity: 0, total: 0, latestCost: batch.unitCost, latestAt: batch.receivedAt, remaining: 0 };
    entry.remaining += batch.quantityRemaining;
    suppliers.set(name, entry);
  }

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent mobileBottom className="w-full gap-0 overflow-y-auto border-stone-200 bg-white sm:max-w-2xl">
      <SheetHeader className="border-b border-stone-200 px-5 py-5 pr-14">
        <SheetTitle className="text-stone-900">Pembelian supplier</SheetTitle>
        <SheetDescription>{balance.productName} · riwayat pembelian dan harga asli dari supplier.</SheetDescription>
      </SheetHeader>
      {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500"><Loader2 className="size-4 animate-spin" /> Memuat pembelian supplier...</div>
        : error ? <div className="py-16"><EmptyState icon={Truck} title="Gagal memuat" description={error} /></div>
        : purchases.length === 0 && productBatches.length === 0 ? <div className="py-16"><EmptyState icon={Truck} title="Belum ada pembelian supplier" description="Penerimaan barang untuk produk ini akan muncul di sini." /></div>
        : <div className="space-y-6 p-5">
        <section>
          <h3 className="text-sm font-semibold text-stone-900">Ringkasan supplier</h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-stone-200">
            {[...suppliers.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt)).map((supplier) => <div key={supplier.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-900">{supplier.name}</p><p className="mt-1 text-xs text-stone-500">{formatNumber(supplier.quantity)} {balance.unit} terbayar · rata-rata {supplier.quantity > 0 ? formatCurrency(supplier.total / supplier.quantity) : "—"} /{balance.unit}</p></div>
              <div className="text-right text-xs"><p className="font-semibold tabular-nums text-emerald-700">{formatCurrency(supplier.latestCost)}</p><p className="mt-1 tabular-nums text-stone-500">Sisa {formatNumber(supplier.remaining)} {balance.unit}</p></div>
            </div>)}
          </div>
          <div className="mt-3 flex items-start gap-2 border-t border-stone-200 bg-stone-50/60 px-3 py-3 text-[11px] leading-5 text-stone-500"><TrendingUp className="mt-0.5 size-3.5 shrink-0 text-blue-600" /><p>Total stok aktual {formatNumber(balance.quantity)} {balance.unit} adalah sumber kebenaran untuk invoice. Angka ini mungkin berbeda dari jumlah batch karena ada penerimaan yang dibatalkan, dihapus, atau penyesuaian stok.</p></div>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-stone-900">Riwayat penerimaan</h3>
          <div className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
             {purchases.map((purchase) => <article key={purchase.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3"><div><p className="text-sm font-semibold text-stone-900">{purchase.supplierName || "Supplier lama"}</p><p className="mt-1 text-xs text-stone-500">{formatDatetime(purchase.occurredAt)} · {purchase.receiptNumber || "Penerimaan stok"}</p>{purchase.manualQuantity !== undefined && purchase.digitalQuantity !== undefined && purchase.manualQuantity !== purchase.digitalQuantity && <p className="mt-1 text-[11px] font-medium text-amber-700">Bayar {purchase.manualQuantity.toFixed(1)} {purchase.unit} · masuk stok {purchase.digitalQuantity.toFixed(1)} {purchase.unit} · selisih {Math.abs((purchase.digitalQuantity - purchase.manualQuantity)).toFixed(1)} {purchase.unit}</p>}</div><div className="text-right"><p className="text-sm font-semibold tabular-nums text-stone-900">{formatNumber(purchase.quantityDelta)} {purchase.unit}</p><p className="mt-1 text-xs font-semibold tabular-nums text-emerald-700">{purchase.purchaseUnitCost ? `${formatCurrency(purchase.purchaseUnitCost)}/${purchase.unit}` : "—"}</p>{purchase.receiptId && <CancelStockReceiptDialog receiptId={purchase.receiptId} receiptNumber={purchase.receiptNumber} />}</div></article>)}
          </div>
        </section>
      </div>}
    </SheetContent>
  </Sheet>;
}
