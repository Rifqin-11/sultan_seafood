"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpFromLine, ArrowUpDown, Boxes, ChevronLeft, ChevronRight, History, Loader2, PackageSearch } from "lucide-react";
import { StockRowActions } from "@/components/stock/stock-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getStockMovementLabel } from "@/lib/domain/inventory";
import { formatCurrency, formatDatetime, formatNumber } from "@/lib/utils";
import type { Product, StockBalance, StockMovement } from "@/types";

interface BalancesViewProps {
  view: "balances";
  balances: StockBalance[];
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  tab: string;
  search: string;
  stockStatus: string;
  productStatus: string;
  sortKey: string;
  sortDir: "asc" | "desc";
}

interface MovementsViewProps {
  view: "movements";
  movements: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
  tab: string;
}

type StockTableProps = BalancesViewProps | MovementsViewProps;

type StockSortKey = "productName" | "category" | "size" | "quantity" | "averageUnitCost" | "latestPurchaseCost" | "defaultSellingPrice" | "stockValue" | "minimumQuantity" | "stockStatus";

const movementStyles: Record<string, string> = {
  PURCHASE_IN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SALE_OUT: "border-orange-200 bg-orange-50 text-orange-700",
  INVOICE_VOID_RETURN: "border-sky-200 bg-sky-50 text-sky-700",
  ADJUSTMENT_IN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ADJUSTMENT_OUT: "border-red-200 bg-red-50 text-red-700",
};

export function StockTable(props: StockTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  const navigate = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") params.delete(key);
      else params.set(key, String(value));
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  if (props.view === "movements") {
    return <MovementsView {...props} navigate={navigate} isNavigating={isNavigating} />;
  }
  return <BalancesView {...props} navigate={navigate} isNavigating={isNavigating} />;
}

function Pagination({ page, pageCount, total, pageSize, onPage, disabled }: { page: number; pageCount: number; total: number; pageSize: number; onPage: (page: number) => void; disabled: boolean }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-5 py-3">
      <p className="text-xs text-stone-500">{from}–{to} dari {total}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="px-2.5 sm:px-3" disabled={page <= 1 || disabled} onClick={() => onPage(page - 1)} aria-label="Halaman sebelumnya">
          <ChevronLeft className="size-4 sm:mr-1" /><span className="hidden sm:inline">Sebelumnya</span>
        </Button>
        <span className="text-xs text-stone-500">{page}/{pageCount}</span>
        <Button variant="outline" size="sm" className="px-2.5 sm:px-3" disabled={page >= pageCount || disabled} onClick={() => onPage(page + 1)} aria-label="Halaman berikutnya">
          <span className="hidden sm:inline">Berikutnya</span><ChevronRight className="size-4 sm:ml-1" />
        </Button>
      </div>
    </div>
  );
}

function BalancesView({ balances, products, total, page, pageSize, search, stockStatus, productStatus, sortKey, sortDir, navigate, isNavigating }: BalancesViewProps & { navigate: (u: Record<string, string | number | null>) => void; isNavigating: boolean }) {
  const [query, setQuery] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const productMap = new Map(products.map((product) => [product.id, product]));
  const lowStock = (balance: StockBalance) => balance.minimumQuantity > 0 && balance.quantity <= balance.minimumQuantity;

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const changeQuery = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value || null, page: null }), 300);
  };

  const setSortKey = (key: StockSortKey) => {
    const nextDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    navigate({ sort: key, dir: nextDir, page: null });
  };

  const sortIcon = (key: StockSortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="size-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />;
  };

  const sortHeader = (label: string, key: StockSortKey, align: "left" | "right" = "left") => (
    <button type="button" onClick={() => setSortKey(key)} className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-900 ${align === "right" ? "ml-auto" : ""}`} aria-label={`Urutkan berdasarkan ${label}`}>
      {label}{sortIcon(key)}
    </button>
  );

  return (
    <section className="erp-surface overflow-hidden">
      <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
          <Boxes className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Produk & stok</h2>
          <p className="mt-0.5 text-xs text-stone-500">HPP rata-rata digunakan saat invoice diterbitkan; harga beli terakhir tetap tersimpan per supplier.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b border-stone-200 bg-stone-50/60 p-4 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-56">
          <input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Cari produk atau kategori" aria-label="Cari produk atau kategori" className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-500 focus:ring-3 focus:ring-stone-200/70" />
          {isNavigating && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-stone-400" />}
        </div>
        <select value={productStatus} onChange={(event) => navigate({ productStatus: event.target.value, page: null })} aria-label="Filter status produk" className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-500"><option value="all">Semua produk</option><option value="ACTIVE">Produk aktif</option><option value="INACTIVE">Produk nonaktif</option></select>
        <select value={stockStatus} onChange={(event) => navigate({ stockStatus: event.target.value, page: null })} aria-label="Filter status stok" className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-500"><option value="all">Semua stok</option><option value="Aman">Stok aman</option><option value="Menipis">Stok menipis</option><option value="Habis">Stok habis</option></select>
      </div>

      {balances.length === 0 ? (
        <div className="py-12">
          <EmptyState icon={PackageSearch} title="Belum ada produk" description="Tambahkan produk terlebih dahulu untuk mulai mengelola stok." />
        </div>
      ) : (
        <div className={`transition-opacity duration-200 ${isNavigating ? "pointer-events-none opacity-50" : "opacity-100"}`} aria-busy={isNavigating}>
          <div className="erp-table-wrap hidden md:block">
            <table className="erp-table w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80">
                  <th className="px-5 py-3 text-left">{sortHeader("Produk", "productName")}</th>
                  <th className="px-3 py-3 text-left">{sortHeader("Kategori", "category")}</th>
                  <th className="px-3 py-3 text-left">{sortHeader("Ukuran", "size")}</th>
                  <th className="px-3 py-3 text-right">{sortHeader("Stok", "quantity", "right")}</th>
                  <th className="px-3 py-3 text-right">{sortHeader("HPP rata-rata", "averageUnitCost", "right")}</th>
                  <th className="px-3 py-3 text-right">{sortHeader("Harga beli terakhir", "latestPurchaseCost", "right")}</th>
                  <th className="px-3 py-3 text-right">{sortHeader("Harga jual default", "defaultSellingPrice", "right")}</th>
                  <th className="px-3 py-3 text-right">{sortHeader("Nilai persediaan", "stockValue", "right")}</th>
                  <th className="px-3 py-3 text-right">{sortHeader("Minimum", "minimumQuantity", "right")}</th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {balances.map((balance) => (
                  <tr key={balance.productId} className="hover:bg-stone-50/60">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-stone-900">{balance.productName}</p>
                      <p className="mt-1 text-xs text-stone-500">{balance.sku || "Tanpa SKU"}{balance.size ? ` · ${balance.size}` : ""}</p>
                      <div className="mt-2"><Badge variant="outline" className={balance.productStatus === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700" : "border-stone-300 bg-stone-100 text-[10px] text-stone-600"}>{balance.productStatus === "ACTIVE" ? "Produk aktif" : "Produk nonaktif"}</Badge></div>
                    </td>
                    <td className="px-3 py-3 text-sm text-stone-600">{balance.category ?? "Tanpa kategori"}</td>
                    <td className="px-3 py-3 text-sm text-stone-600">{balance.size || "—"}</td>
                    <td className={`px-3 py-3 text-right text-base font-bold tabular-nums ${lowStock(balance) ? "text-red-600" : "text-stone-900"}`}>
                      {formatNumber(balance.quantity)} <span className="text-xs font-medium text-stone-500">{balance.unit}</span>
                      {lowStock(balance) && <Badge variant="outline" className="ml-2 border-red-200 bg-red-50 text-[10px] text-red-700">Menipis</Badge>}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-amber-700">{balance.averageUnitCost > 0 ? formatCurrency(balance.averageUnitCost) : "—"}<p className="mt-1 text-[10px] font-medium text-amber-600/80">Dipakai invoice</p></td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">{balance.latestPurchaseCost ? formatCurrency(balance.latestPurchaseCost) : "—"}<p className="mt-1 text-[10px] font-medium text-stone-400">{balance.supplierCount ?? 0} supplier</p></td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-sky-700">{balance.defaultSellingPrice > 0 ? formatCurrency(balance.defaultSellingPrice) : "—"}<p className={`mt-1 text-[10px] ${balance.marginPercentage !== undefined && balance.marginPercentage < 15 ? "text-red-600" : "text-stone-400"}`}>{balance.marginPercentage !== undefined ? `${balance.marginPercentage.toFixed(1)}% margin` : "margin belum tersedia"} · {balance.openBatchCount ?? 0} batch</p></td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-stone-900">{formatCurrency(balance.stockValue)}</td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-stone-600">{balance.minimumQuantity > 0 ? `${formatNumber(balance.minimumQuantity)} ${balance.unit}` : "—"}</td>
                    <td className="px-5 py-3 text-right"><StockRowActions balance={balance} product={productMap.get(balance.productId)} /></td>
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
                      <p className="mt-1 text-xs text-stone-500">{balance.sku || "Tanpa SKU"}</p>
                      <p className="mt-2 text-xs text-stone-600">
                        <span className="font-medium text-stone-400">Ukuran</span>{" "}
                        {balance.size || "—"}
                      </p>
                   </div>
                  {lowStock(balance) && <Badge variant="outline" className="shrink-0 border-red-200 bg-red-50 text-[10px] text-red-700">Menipis</Badge>}
                </div>
                 <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3">
                  <div>
                    <p className="text-[11px] text-stone-500">Stok tersedia</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-stone-900">{formatNumber(balance.quantity)} <span className="text-xs font-medium text-stone-500">{balance.unit}</span></p>
                  </div>
                  <div className="text-right">
                     <p className="text-[11px] text-stone-500">Nilai persediaan</p>
                    <p className="mt-1 font-bold tabular-nums text-stone-900">{formatCurrency(balance.stockValue)}</p>
                  </div>
                  <div className="border-t border-stone-200 pt-2">
                    <p className="text-[11px] text-stone-500">HPP rata-rata</p>
                    <p className="mt-1 text-xs font-semibold text-amber-700">{balance.averageUnitCost > 0 ? formatCurrency(balance.averageUnitCost) : "—"}</p>
                  </div>
                  <div className="border-t border-stone-200 pt-2 text-right">
                    <p className="text-[11px] text-stone-500">Jual default</p>
                    <p className="mt-1 text-xs font-semibold text-sky-700">{balance.defaultSellingPrice > 0 ? formatCurrency(balance.defaultSellingPrice) : "—"}</p>
                  </div>
                </div>
                 <div className="flex justify-end"><StockRowActions balance={balance} product={productMap.get(balance.productId)} /></div>
              </article>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={(next) => navigate({ page: next })} disabled={isNavigating} />
        </div>
      )}
    </section>
  );
}

function MovementsView({ movements, total, page, pageSize, navigate, isNavigating }: MovementsViewProps & { navigate: (u: Record<string, string | number | null>) => void; isNavigating: boolean }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <section className="erp-surface overflow-hidden">
      <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700"><History className="size-4" /></div>
        <div><h2 className="text-sm font-semibold text-stone-900">Mutasi stok</h2><p className="mt-0.5 text-xs text-stone-500">Invoice, pengembalian invoice, pembelian, dan penyesuaian stok.</p></div>
      </div>
      {movements.length === 0 ? (
        <div className="py-12"><EmptyState icon={History} title="Belum ada mutasi stok" description="Invoice yang diterbitkan dan penyesuaian stok akan muncul di sini." /></div>
      ) : (
        <div className={`transition-opacity duration-200 ${isNavigating ? "pointer-events-none opacity-50" : "opacity-100"}`} aria-busy={isNavigating}>
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
                         {movement.movementType === "PURCHASE_IN" && movement.manualQuantity !== undefined && movement.digitalQuantity !== undefined && movement.manualQuantity !== movement.digitalQuantity
                           ? ` · manual ${movement.manualQuantity.toFixed(1)} ${movement.unit}, digital ${movement.digitalQuantity.toFixed(1)} ${movement.unit} (selisih ${Math.abs(movement.weightDifference!).toFixed(1)} ${movement.unit})`
                           : ""}
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
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={(next) => navigate({ page: next })} disabled={isNavigating} />
        </div>
      )}
    </section>
  );
}
