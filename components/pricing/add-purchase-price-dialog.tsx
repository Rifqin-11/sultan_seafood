"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPurchasePriceAction } from "@/lib/actions/pricing";
import type { Product, Supplier } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AddPurchasePriceDialogProps {
  products: Product[];
  suppliers: Supplier[];
}

export function AddPurchasePriceDialog({
  products,
  suppliers,
}: AddPurchasePriceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [productId, setProductId] = useState(products[0]?.id || "");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [unitCost, setUnitCost] = useState(0);
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setProductId(products[0]?.id || "");
    setSupplierId(suppliers[0]?.id || "");
    setUnitCost(0);
    setNotes("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!productId || !unitCost) {
      setError("Pilih produk dan isi harga beli HPP.");
      return;
    }

    setLoading(true);

    const res = await createPurchasePriceAction({
      productId,
      supplierId: supplierId || undefined,
      unitCost: unitCost,
      notes: notes || undefined,
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
      toast.error(`Gagal: ${res.error}`);
    } else {
      toast.success(res.message || "Harga beli berhasil disimpan");
      resetForm();
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="h-10 px-4 text-xs cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Tambah Harga Beli
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Harga Beli (HPP)</DialogTitle>
          <DialogDescription>
            Catat harga pembelian baru dari supplier untuk kalkulasi HPP & margin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Produk <span className="text-red-500">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-10 text-xs border border-input rounded-xl px-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
              required
            >
              <option value="" disabled>Pilih Produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size ? `[${p.size}]` : ""} ({p.defaultUnit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Supplier (Opsional)
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-10 text-xs border border-input rounded-xl px-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Tanpa Supplier / Langsung Nelayan</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.contactName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Harga Beli HPP (Rp) <span className="text-red-500">*</span>
            </label>
            <CurrencyInput value={unitCost} onChange={setUnitCost} placeholder="0" className="h-10 rounded-xl border-stone-200" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Catatan / Keterangan
            </label>
            <Input
              placeholder="Contoh: Tangkapan segar Muara Angke"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Simpan Harga Beli
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
