"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createExpenseAction } from "@/lib/actions/expenses";

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("Operasional");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("Operasional");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!description || !amount || parseFloat(amount) <= 0) {
      setError("Deskripsi dan Jumlah biaya wajib diisi.");
      return;
    }

    setLoading(true);

    const res = await createExpenseAction({
      category,
      description,
      amount: parseFloat(amount),
      expenseDate,
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
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-3 text-xs cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Tambah Pengeluaran
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Pengeluaran Operasional</DialogTitle>
          <DialogDescription>
            Masukkan pengeluaran umum toko/gudang (gaji, sewa, listrik, dll).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Kategori
              </label>
              <Select value={category} onValueChange={(v) => setCategory(v || "Operasional")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>{category}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operasional">Operasional Gudang</SelectItem>
                  <SelectItem value="Gaji & Bonus">Gaji & Bonus Staff</SelectItem>
                  <SelectItem value="Listrik & Air">Listrik, Air & Internet</SelectItem>
                  <SelectItem value="Sewa & Maintenance">Sewa & Maintenance</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tanggal Pengeluaran
              </label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Deskripsi Pengeluaran <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Pembelian Kantong Plastik & Lakban Gudang"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Jumlah (Rp) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="350000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
              Simpan Pengeluaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
