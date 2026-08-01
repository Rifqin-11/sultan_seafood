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
} from "@/components/ui/dialog";
import { createProductAction } from "@/lib/actions/products";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddProductDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Ikan");
  const [size, setSize] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("kg");
  const [defaultSellingPrice, setDefaultSellingPrice] = useState("");
  const [activeCost, setActiveCost] = useState("");

  const resetForm = () => {
    setName("");
    setCategory("Ikan");
    setSize("");
    setDefaultUnit("kg");
    setDefaultSellingPrice("");
    setActiveCost("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name) {
      setError("Nama produk wajib diisi.");
      return;
    }

    setLoading(true);

    const res = await createProductAction({
      name,
      category,
      size: size || undefined,
      defaultUnit,
      defaultSellingPrice: defaultSellingPrice ? parseFloat(defaultSellingPrice) : undefined,
      activeCost: activeCost ? parseFloat(activeCost) : undefined,
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      toast.success(res.message || "Produk berhasil ditambahkan");
      setOpen(false);
      resetForm();
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        className="cursor-pointer"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Tambah Produk
      </Button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Produk Baru</DialogTitle>
          <DialogDescription>
            Masukkan rincian produk seafood dan harga jual default.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Udang Vaname Size 30"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Kategori
              </label>
              <Input
                placeholder="Ikan / Udang / Cumi"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Size / Ukuran
              </label>
              <Input
                placeholder="Size 30 / 500g-700g / Jumbo"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Satuan
              </label>
              <Input
                placeholder="kg / ekor"
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Harga Jual (Rp)
              </label>
              <Input
                type="number"
                placeholder="110000"
                value={defaultSellingPrice}
                onChange={(e) => setDefaultSellingPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                HPP Beli (Rp)
              </label>
              <Input
                type="number"
                placeholder="85000"
                value={activeCost}
                onChange={(e) => setActiveCost(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-2.5">
              {error}
            </p>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Produk
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
