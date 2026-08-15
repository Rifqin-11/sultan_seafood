"use client";

import { useState } from "react";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { EmptyState } from "@/components/ui/empty-state";
import { MoreHorizontal, Edit, Trash2, Loader2, DollarSign } from "lucide-react";
import { deletePurchasePriceAction, updatePurchasePriceAction } from "@/lib/actions/pricing";
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
import type { Product, Supplier } from "@/types";
export interface PurchaseCostItem {
  id: string;
  productId: string;
  productName?: string;
  unit?: string;
  supplierId?: string;
  supplierName?: string;
  unitCost: number;
  effectiveAt: string;
  endedAt?: string;
  notes?: string;
}

interface PurchasePriceTableProps {
  costs: PurchaseCostItem[];
  products: Product[];
  suppliers: Supplier[];
}

export function PurchasePriceTable({ costs, products }: PurchasePriceTableProps) {
  const router = useRouter();
  const [costsList, setCostsList] = useState<PurchaseCostItem[]>(costs);

  const [editingCost, setEditingCost] = useState<PurchaseCostItem | null>(null);
  const [deletingCost, setDeletingCost] = useState<PurchaseCostItem | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Edit form state
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");

  const handleOpenEdit = (cost: PurchaseCostItem) => {
    setEditingCost(cost);
    setEditPrice(cost.unitCost);
    setEditNotes(cost.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingCost) return;
    const priceNum = editPrice;
    if (!priceNum || priceNum <= 0) {
      toast.error("Masukkan harga beli yang valid");
      return;
    }

    setLoadingId(editingCost.id);
    const res = await updatePurchasePriceAction(editingCost.id, priceNum, editNotes);
    setLoadingId(null);

    if (res.error) {
      toast.error(`Gagal: ${res.error}`);
    } else {
      toast.success(res.message || "Harga beli berhasil diperbarui");
      setEditingCost(null);
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCost) return;
    const targetId = deletingCost.id;
    setDeletingCost(null);
    setCostsList((prev) => prev.filter((c) => c.id !== targetId));

    setLoadingId(targetId);
    const res = await deletePurchasePriceAction(targetId);
    setLoadingId(null);

    if (res.error) {
      toast.error(`Gagal menghapus: ${res.error}`);
      router.refresh();
    } else {
      toast.success(res.message || "Harga beli berhasil dihapus");
      router.refresh();
    }
  };

  const getCostDisplay = (cost: PurchaseCostItem) => {
    const product = products.find((item) => item.id === cost.productId);
    const isTechnicalId = !cost.productName || cost.productName.startsWith("prod_") || cost.productName.startsWith("cost_");
    return {
      name: !isTechnicalId ? cost.productName! : product?.name || "Produk tidak tersedia",
      unit: cost.unit || product?.defaultUnit || "kg",
      isActive: !cost.endedAt,
    };
  };

  const renderActions = (cost: PurchaseCostItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-amber-100 hover:text-foreground"
        aria-label={`Aksi untuk harga beli ${getCostDisplay(cost).name}`}
      >
        {loadingId === cost.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem className="cursor-pointer" onClick={() => handleOpenEdit(cost)}>
          <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          Edit Harga
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={() => setDeletingCost(cost)}>
          <Trash2 className="mr-2 h-3.5 w-3.5 text-red-600" />
          Hapus Riwayat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="erp-surface overflow-hidden border-amber-200">
        <div className="px-5 py-4 border-b border-amber-200 bg-amber-50/50 flex items-center gap-2">
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200">
            Internal
          </span>
          <p className="text-xs text-amber-700">
            Data harga beli bersifat rahasia dan tidak tampil pada invoice pelanggan
          </p>
        </div>

        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Produk</TableHead>
                <TableHead className="text-xs font-semibold">Supplier</TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Harga Beli
                </TableHead>
                <TableHead className="text-xs font-semibold">Berlaku</TableHead>
                <TableHead className="text-xs font-semibold">Berakhir</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {costsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48">
                    <EmptyState
                      icon={DollarSign}
                      title="Belum ada harga beli"
                      description="Tambahkan harga beli khusus untuk mencatat harga dari supplier."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                costsList.map((cost) => {
                const { name, unit, isActive } = getCostDisplay(cost);

                return (
                  <TableRow key={cost.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">
                      {name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cost.supplierName}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(cost.unitCost)} / {unit}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateShort(cost.effectiveAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cost.endedAt ? formatDateShort(cost.endedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="text-[11px]"
                      >
                        {isActive ? "Aktif" : "Berakhir"}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderActions(cost)}</TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
        </div>
        <div className="divide-y divide-amber-100 sm:hidden">
          {costsList.length === 0 ? (
            <div className="py-12">
              <EmptyState icon={DollarSign} title="Belum ada harga beli" description="Tambahkan harga beli khusus untuk mencatat harga dari supplier." />
            </div>
          ) : (
            costsList.map((cost) => {
              const { name, unit, isActive } = getCostDisplay(cost);
              return (
                <article key={cost.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-stone-900">{name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{cost.supplierName || "Supplier tidak tersedia"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={isActive ? "default" : "secondary"} className="text-[11px]">
                        {isActive ? "Aktif" : "Berakhir"}
                      </Badge>
                      {renderActions(cost)}
                    </div>
                  </div>
                  <div className="flex items-end justify-between rounded-xl bg-amber-50/70 p-3">
                    <div>
                      <p className="text-[11px] text-amber-700">Harga beli per {unit}</p>
                      <p className="mt-1 text-base font-bold tabular-nums text-stone-900">{formatCurrency(cost.unitCost)}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-stone-500">Berlaku sejak</p>
                      <p className="mt-1 font-medium text-stone-800">{formatDateShort(cost.effectiveAt)}</p>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {editingCost && (
        <Dialog open={!!editingCost} onOpenChange={(open) => !open && setEditingCost(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Harga Beli</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground block font-medium">Produk</label>
                <p className="text-sm font-medium">{editingCost.productName}</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-unit-cost" className="text-xs text-muted-foreground block font-medium">Harga Beli (Rp / {editingCost.unit})</label>
                <CurrencyInput value={editPrice} onChange={setEditPrice} placeholder="0" className="h-10 rounded-xl border-stone-200" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-cost-notes" className="text-xs text-muted-foreground block font-medium">Catatan (opsional)</label>
                <Input
                  id="edit-cost-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Harga baru per Agustus"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditingCost(null)}>
                Batal
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={!!loadingId}>
                {loadingId && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deletingCost && (
        <ConfirmDialog
          open={!!deletingCost}
          onOpenChange={(open) => !open && setDeletingCost(null)}
          title="Hapus Riwayat Harga Beli?"
          description={`Apakah Anda yakin ingin menghapus riwayat harga beli untuk "${deletingCost.productName}" (${formatCurrency(deletingCost.unitCost)})?`}
          confirmLabel="Hapus Riwayat"
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
