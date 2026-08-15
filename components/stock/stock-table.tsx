"use client";

import { ArrowDownToLine, ArrowUpFromLine, Boxes, History, PackageSearch } from "lucide-react";
import { AdjustStockDialog } from "@/components/stock/adjust-stock-dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getStockMovementLabel } from "@/lib/domain/inventory";
import { formatCurrency, formatDatetime, formatNumber } from "@/lib/utils";
import type { StockBalance, StockMovement } from "@/types";

interface StockTableProps {
  balances: StockBalance[];
  movements: StockMovement[];
}

const movementStyles: Record<string, string> = {
  PURCHASE_IN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SALE_OUT: "border-orange-200 bg-orange-50 text-orange-700",
  INVOICE_VOID_RETURN: "border-sky-200 bg-sky-50 text-sky-700",
  ADJUSTMENT_IN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ADJUSTMENT_OUT: "border-red-200 bg-red-50 text-red-700",
};

export function StockTable({ balances, movements }: StockTableProps) {
  const lowStock = (balance: StockBalance) =>
    balance.minimumQuantity > 0 && balance.quantity <= balance.minimumQuantity;

  return (
    <div className="space-y-6">
      <section className="erp-surface overflow-hidden">
        <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
            <Boxes className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Stok, Harga & Modal</h2>
            <p className="mt-0.5 text-xs text-stone-500">Harga beli rata-rata bergerak menjadi HPP untuk menghitung modal dan laba.</p>
          </div>
        </div>

        {balances.length === 0 ? (
          <div className="py-12">
            <EmptyState icon={PackageSearch} title="Belum ada produk" description="Tambahkan produk terlebih dahulu untuk mulai mengelola stok." />
          </div>
        ) : (
          <>
            <div className="erp-table-wrap hidden md:block">
              <table className="erp-table w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">Produk</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Stok</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Harga beli rata-rata</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Harga jual default</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Modal stok</th>
                    <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Minimum</th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {balances.map((balance) => (
                    <tr key={balance.productId} className="hover:bg-stone-50/60">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-stone-900">{balance.productName}</p>
                        <p className="mt-1 text-xs text-stone-500">{balance.sku || "Tanpa SKU"}{balance.size ? ` · ${balance.size}` : ""}</p>
                      </td>
                      <td className={`px-3 py-3 text-right text-base font-bold tabular-nums ${lowStock(balance) ? "text-red-600" : "text-stone-900"}`}>
                        {formatNumber(balance.quantity)} <span className="text-xs font-medium text-stone-500">{balance.unit}</span>
                        {lowStock(balance) && <Badge variant="outline" className="ml-2 border-red-200 bg-red-50 text-[10px] text-red-700">Menipis</Badge>}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-amber-700">{balance.averageUnitCost > 0 ? formatCurrency(balance.averageUnitCost) : "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-sky-700">{balance.defaultSellingPrice > 0 ? formatCurrency(balance.defaultSellingPrice) : "—"}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-stone-900">{formatCurrency(balance.stockValue)}</td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-stone-600">{balance.minimumQuantity > 0 ? `${formatNumber(balance.minimumQuantity)} ${balance.unit}` : "—"}</td>
                      <td className="px-5 py-3 text-right"><AdjustStockDialog balance={balance} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-stone-100 md:hidden">
              {balances.map((balance) => (
                <article key={balance.productId} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900">{balance.productName}</p>
                      <p className="mt-1 text-xs text-stone-500">{balance.sku || "Tanpa SKU"}{balance.size ? ` · ${balance.size}` : ""}</p>
                    </div>
                    {lowStock(balance) && <Badge variant="outline" className="shrink-0 border-red-200 bg-red-50 text-[10px] text-red-700">Menipis</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3">
                    <div>
                      <p className="text-[11px] text-stone-500">Stok tersedia</p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-stone-900">{formatNumber(balance.quantity)} <span className="text-xs font-medium text-stone-500">{balance.unit}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-stone-500">Modal stok</p>
                      <p className="mt-1 font-bold tabular-nums text-stone-900">{formatCurrency(balance.stockValue)}</p>
                    </div>
                    <div className="border-t border-stone-200 pt-2">
                      <p className="text-[11px] text-stone-500">Beli rata-rata</p>
                      <p className="mt-1 text-xs font-semibold text-amber-700">{balance.averageUnitCost > 0 ? formatCurrency(balance.averageUnitCost) : "—"}</p>
                    </div>
                    <div className="border-t border-stone-200 pt-2 text-right">
                      <p className="text-[11px] text-stone-500">Jual default</p>
                      <p className="mt-1 text-xs font-semibold text-sky-700">{balance.defaultSellingPrice > 0 ? formatCurrency(balance.defaultSellingPrice) : "—"}</p>
                    </div>
                  </div>
                  <AdjustStockDialog balance={balance} />
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="erp-surface overflow-hidden">
        <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700"><History className="size-4" /></div>
          <div><h2 className="text-sm font-semibold text-stone-900">Riwayat Mutasi</h2><p className="mt-0.5 text-xs text-stone-500">100 mutasi terbaru dari supplier, invoice, dan penyesuaian.</p></div>
        </div>
        {movements.length === 0 ? (
          <div className="py-12"><EmptyState icon={History} title="Belum ada mutasi stok" description="Barang masuk dan invoice yang diterbitkan akan muncul di sini." /></div>
        ) : (
          <div className="divide-y divide-stone-100">
            {movements.map((movement) => {
              const incoming = movement.quantityDelta > 0;
              return (
                <div key={movement.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${incoming ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
                      {incoming ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-stone-900">{movement.productName}</p>
                        <Badge variant="outline" className={`text-[10px] ${movementStyles[movement.movementType] || ""}`}>{getStockMovementLabel(movement.movementType)}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {movement.supplierName ? `Supplier: ${movement.supplierName}` : movement.customerName ? `Restoran: ${movement.customerName}` : movement.notes || "Penyesuaian stok"}
                        {movement.purchaseUnitCost ? ` · harga beli ${formatCurrency(movement.purchaseUnitCost)}/${movement.unit}` : ""}
                        {movement.invoiceNumber ? ` · ${movement.invoiceNumber}` : ""}
                        {movement.receiptNumber ? ` · ${movement.receiptNumber}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-5 pl-11 sm:justify-end sm:pl-0">
                    <div className={`text-right text-sm font-bold tabular-nums ${incoming ? "text-emerald-700" : "text-orange-700"}`}>
                      {incoming ? "+" : ""}{formatNumber(movement.quantityDelta)} {movement.unit}
                      <p className="mt-1 text-[11px] font-normal text-stone-400">Saldo {formatNumber(movement.balanceAfter)} {movement.unit}</p>
                    </div>
                    <p className="shrink-0 text-right text-xs text-stone-400">{formatDatetime(movement.occurredAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
