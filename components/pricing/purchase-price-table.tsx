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
  const [editPrice, setEditPrice] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleOpenEdit = (cost: PurchaseCostItem) => {
    setEditingCost(cost);
    setEditPrice(cost.unitCost.toString());
    setEditNotes(cost.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingCost) return;
    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
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

  return (
    <>
      <div className="bg-white rounded-2xl border border-amber-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-200 bg-amber-50/50 flex items-center gap-2">
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200">
            Internal
          </span>
          <p className="text-xs text-amber-700">
            Data harga beli bersifat rahasia dan tidak tampil pada invoice pelanggan
          </p>
        </div>

        <div className="overflow-x-auto">
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
                  const product = products.find((p) => p.id === cost.productId);
                const rawName = cost.productName;
                const isTechnicalId = !rawName || rawName.startsWith("prod_") || rawName.startsWith("cost_");
                const name = !isTechnicalId ? rawName : (product?.name || "Ikan Kakap Merah");
                const unit = cost.unit || product?.defaultUnit || "kg";
                const isActive = !cost.endedAt;

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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          aria-label="Aksi harga beli"
                        >
                          {loadingId === cost.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleOpenEdit(cost)}
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Edit Harga
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={() => setDeletingCost(cost)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                            Hapus Riwayat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
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
                <Input
                  id="edit-unit-cost"
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="75000"
                />
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
