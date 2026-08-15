"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Edit2, Trash2, Loader2, Plus, Tag } from "lucide-react";
import { deleteCustomerPriceAction, createCustomerPriceAction } from "@/lib/actions/pricing";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Customer, Product } from "@/types";

export interface CustomPriceRecord {
  id: string;
  customerId: string;
  productId: string;
  sellingPrice: number;
  effectiveAt: string;
}

interface SellingPriceTableProps {
  products: Product[];
  customers: Customer[];
  customPrices: CustomPriceRecord[];
}

export function SellingPriceTable({
  products,
  customers,
  customPrices,
}: SellingPriceTableProps) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Edit price dialog
  const [activeItem, setActiveItem] = useState<{
    recordId?: string;
    customer: Customer;
    product: Product;
    currentPrice: number;
  } | null>(null);

  const [priceInput, setPriceInput] = useState(0);
  const [deletingRecord, setDeletingRecord] = useState<{
    id: string;
    customerName: string;
    productName: string;
  } | null>(null);

  const handleOpenEdit = (customer: Customer, product: Product, record?: CustomPriceRecord) => {
    setActiveItem({
      recordId: record?.id,
      customer,
      product,
      currentPrice: record ? record.sellingPrice : (product.defaultSellingPrice || 0),
    });
    setPriceInput(record ? record.sellingPrice : (product.defaultSellingPrice ?? 0));
  };

  const handleSavePrice = async () => {
    if (!activeItem) return;
    const priceNum = priceInput;
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Masukkan harga jual khusus yang valid");
      return;
    }

    const key = `${activeItem.customer.id}_${activeItem.product.id}`;
    setLoadingKey(key);

    const res = await createCustomerPriceAction({
      customerId: activeItem.customer.id,
      productId: activeItem.product.id,
      sellingPrice: priceNum,
    });

    setLoadingKey(null);

    if (res.error) {
      toast.error(`Gagal: ${res.error}`);
    } else {
      toast.success(res.message || "Harga khusus berhasil disimpan");
      setActiveItem(null);
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    setLoadingKey(deletingRecord.id);
    const res = await deleteCustomerPriceAction(deletingRecord.id);
    setLoadingKey(null);

    if (res.error) {
      toast.error(`Gagal menghapus: ${res.error}`);
    } else {
      toast.success(res.message || "Harga khusus berhasil dihapus");
      setDeletingRecord(null);
      router.refresh();
    }
  };

  // Quick lookup (key: customerId_productId => CustomPriceRecord)
  const priceMap = new Map<string, CustomPriceRecord>();
  customPrices.forEach((cp) => {
    priceMap.set(`${cp.customerId}_${cp.productId}`, cp);
  });

  return (
    <>
      <div className="erp-surface overflow-hidden">
        <div className="border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-600 sm:hidden">
          Geser tabel ke samping untuk melihat dan mengatur harga khusus tiap restoran. Kolom produk tetap terlihat saat digeser.
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="sticky left-0 z-10 bg-muted/30 text-xs font-semibold shadow-[4px_0_12px_-8px_rgba(28,25,23,0.35)]">
                  Produk
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Harga Default
                </TableHead>
                {customers.map((c) => (
                  <TableHead
                    key={c.id}
                    className="text-xs font-semibold text-right min-w-[140px]"
                  >
                    {c.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={customers.length + 2} className="h-48">
                    <EmptyState
                      icon={Tag}
                      title="Belum ada harga jual khusus"
                      description="Tambahkan produk dan pelanggan terlebih dahulu untuk mulai mengatur harga jual khusus."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                  <TableCell className="sticky left-0 z-10 bg-white text-sm font-medium shadow-[4px_0_12px_-8px_rgba(28,25,23,0.35)]">
                    <div>
                      <p className="font-semibold text-foreground">
                        {p.name} {p.size ? <span className="text-xs font-normal text-blue-600">[{p.size}]</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        per {p.defaultUnit}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-medium">
                    {p.defaultSellingPrice
                      ? formatCurrency(p.defaultSellingPrice)
                      : "—"}
                  </TableCell>
                  {customers.map((c) => {
                    const key = `${c.id}_${p.id}`;
                    const record = priceMap.get(key);
                    const isLoading = loadingKey === key || (record && loadingKey === record.id);

                    return (
                      <TableCell
                        key={c.id}
                        className="text-right text-sm tabular-nums group relative"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                          ) : record ? (
                            <>
                              <span className="font-semibold text-emerald-600">
                                {formatCurrency(record.sellingPrice)}
                              </span>
                              <div className="inline-flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(c, p, record)}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted cursor-pointer"
                                  title="Edit harga khusus"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeletingRecord({
                                      id: record.id,
                                      customerName: c.name,
                                      productName: p.name,
                                    })
                                  }
                                  className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 cursor-pointer"
                                  title="Hapus harga khusus (kembali ke default)"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c, p)}
                              className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Set Khusus
                            </button>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </div>
      </div>

      {activeItem && (
        <Dialog open={!!activeItem} onOpenChange={(open) => !open && setActiveItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Harga Khusus Restoran</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground block font-medium">Restoran</label>
                <p className="text-sm font-semibold text-foreground">{activeItem.customer.name}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block font-medium">Produk</label>
                <p className="text-sm font-medium text-foreground">{activeItem.product.name} {activeItem.product.size ? `[${activeItem.product.size}]` : ""}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block font-medium">Harga Jual Default</label>
                <p className="text-xs text-muted-foreground">
                  {activeItem.product.defaultSellingPrice ? formatCurrency(activeItem.product.defaultSellingPrice) : "—"} / {activeItem.product.defaultUnit}
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="selling-price-input" className="text-xs text-muted-foreground block font-medium">Harga Jual Khusus (Rp)</label>
                <CurrencyInput id="selling-price-input" value={priceInput} onChange={setPriceInput} className="h-10 rounded-xl border-stone-200" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActiveItem(null)}>
                Batal
              </Button>
              <Button size="sm" onClick={handleSavePrice} disabled={!!loadingKey}>
                {loadingKey && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Simpan Harga Khusus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deletingRecord && (
        <ConfirmDialog
          open={!!deletingRecord}
          onOpenChange={(open) => !open && setDeletingRecord(null)}
          title="Hapus Harga Khusus?"
          description={`Apakah Anda yakin ingin menghapus harga khusus "${deletingRecord.productName}" untuk restoran "${deletingRecord.customerName}"? Harga jual produk akan kembali ke Harga Default.`}
          confirmLabel="Hapus & Kembalikan ke Default"
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
