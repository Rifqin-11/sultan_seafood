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
import { createCustomerPriceAction } from "@/lib/actions/pricing";
import type { Customer, Product } from "@/types";

interface AddCustomerPriceDialogProps {
  customers: Customer[];
  products: Product[];
}

export function AddCustomerPriceDialog({
  customers,
  products,
}: AddCustomerPriceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [sellingPrice, setSellingPrice] = useState("");

  const resetForm = () => {
    setCustomerId(customers[0]?.id || "");
    setProductId(products[0]?.id || "");
    setSellingPrice("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerId || !productId || !sellingPrice) {
      setError("Pilih restoran, produk, dan masukkan harga khusus.");
      return;
    }

    setLoading(true);

    const res = await createCustomerPriceAction({
      customerId,
      productId,
      sellingPrice: parseFloat(sellingPrice),
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
        Tambah Harga Khusus
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Harga Khusus Restoran</DialogTitle>
          <DialogDescription>
            Tetapkan harga jual khusus per produk untuk restoran tertentu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Restoran / Pelanggan <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              required
            >
              <option value="" disabled>Pilih Restoran</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.contactName})
                </option>
              ))}
            </select>
          </div>

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
                  {p.name} ({p.defaultUnit}) - Default: Rp {p.defaultSellingPrice?.toLocaleString("id-ID") ?? "0"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Harga Jual Khusus (Rp) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="90000"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="h-8 text-xs"
              required
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
              Simpan Harga Khusus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
