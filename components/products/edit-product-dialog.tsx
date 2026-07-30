"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { updateProductAction } from "@/lib/actions/products";
import type { Product } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EditProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: EditProductDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [size, setSize] = useState(product.size || "");
  const [defaultUnit, setDefaultUnit] = useState(product.defaultUnit || "kg");
  const [defaultSellingPrice, setDefaultSellingPrice] = useState(
    String(product.defaultSellingPrice || "")
  );
  const [activeCost, setActiveCost] = useState(
    String(product.activeCost || "")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !category || !defaultUnit) {
      setError("Nama produk, kategori, dan satuan wajib diisi.");
      return;
    }

    setLoading(true);

    const res = await updateProductAction({
      id: product.id,
      name,
      category,
      size: size || undefined,
      defaultUnit,
      defaultSellingPrice: defaultSellingPrice
        ? parseFloat(defaultSellingPrice)
        : undefined,
      activeCost: activeCost ? parseFloat(activeCost) : undefined,
      status: product.status,
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      toast.success(res.message || "Produk berhasil diperbarui");
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Produk Seafood</DialogTitle>
          <DialogDescription>
            Perbarui rincian produk, harga jual default, dan harga beli (HPP).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Nama Produk <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                <option value="Ikan Laut">Ikan Laut</option>
                <option value="Udang">Udang</option>
                <option value="Kepiting">Kepiting</option>
                <option value="Cumi & Gurita">Cumi & Gurita</option>
                <option value="Kerang & Lainnya">Kerang & Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Ukuran / Size (Opsional)
              </label>
              <Input
                placeholder="40-50, Size L, Big"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Satuan Default <span className="text-red-500">*</span>
            </label>
            <select
              value={defaultUnit}
              onChange={(e) => setDefaultUnit(e.target.value)}
              className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              required
            >
              <option value="kg">Kilogram (kg)</option>
              <option value="ekor">Ekor</option>
              <option value="box">Box / Dus</option>
              <option value="pack">Pack / Kantong</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Harga Jual Default (Rp)
              </label>
              <Input
                type="number"
                value={defaultSellingPrice}
                onChange={(e) => setDefaultSellingPrice(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Harga Beli HPP (Rp)
              </label>
              <Input
                type="number"
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
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
