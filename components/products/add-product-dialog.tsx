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
import { createProductAction } from "@/lib/actions/products";

export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Ikan");
  const [defaultUnit, setDefaultUnit] = useState("kg");
  const [defaultSellingPrice, setDefaultSellingPrice] = useState("");
  const [activeCost, setActiveCost] = useState("");

  const resetForm = () => {
    setSku("");
    setName("");
    setCategory("Ikan");
    setDefaultUnit("kg");
    setDefaultSellingPrice("");
    setActiveCost("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!sku || !name) {
      setError("SKU dan Nama produk wajib diisi.");
      return;
    }

    setLoading(true);

    const res = await createProductAction({
      sku,
      name,
      category,
      defaultUnit,
      defaultSellingPrice: defaultSellingPrice ? parseFloat(defaultSellingPrice) : undefined,
      activeCost: activeCost ? parseFloat(activeCost) : undefined,
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
      <DialogTrigger
        className="inline-flex items-center justify-center rounded-lg bg-foreground text-background font-medium h-8 px-3 text-xs hover:bg-foreground/90 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Tambah Produk
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Produk Baru</DialogTitle>
          <DialogDescription>
            Masukkan rincian produk seafood dan harga jual default.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Kode SKU <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="SF-UDG-01"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Kategori
              </label>
              <Input
                placeholder="Ikan / Udang / Cumi"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Udang Vaname Size 30"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Satuan
              </label>
              <Input
                placeholder="kg / ekor"
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Harga Jual (Rp)
              </label>
              <Input
                type="number"
                placeholder="110000"
                value={defaultSellingPrice}
                onChange={(e) => setDefaultSellingPrice(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                HPP Beli (Rp)
              </label>
              <Input
                type="number"
                placeholder="85000"
                value={activeCost}
                onChange={(e) => setActiveCost(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
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
              Simpan Produk
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
