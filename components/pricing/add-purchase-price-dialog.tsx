"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPurchasePriceAction } from "@/lib/actions/pricing";
import type { Product, Supplier } from "@/types";

interface AddPurchasePriceDialogProps {
  products: Product[];
  suppliers: Supplier[];
}

export function AddPurchasePriceDialog({
  products,
  suppliers,
}: AddPurchasePriceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [productId, setProductId] = useState(products[0]?.id || "");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setProductId(products[0]?.id || "");
    setSupplierId(suppliers[0]?.id || "");
    setUnitCost("");
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
      unitCost: parseFloat(unitCost),
      notes: notes || undefined,
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      resetForm();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-foreground text-background font-medium h-8 px-3 text-xs hover:bg-foreground/90 transition-colors cursor-pointer">
        <Plus className="w-3.5 h-3.5 mr-1" />
        Tambah Harga Beli
      </DialogTrigger>

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
              className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
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
            <Input
              type="number"
              placeholder="68000"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Catatan / Keterangan
            </label>
            <Input
              placeholder="Contoh: Tangkapan segar Muara Angke"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
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
