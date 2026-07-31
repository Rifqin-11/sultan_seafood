"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { updateExpenseAction } from "@/lib/actions/expenses";
import type { Expense } from "@/types";

interface EditExpenseDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditExpenseDialog({ expense, open, onOpenChange }: EditExpenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState(expense.category);
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [expenseDate, setExpenseDate] = useState(
    expense.expenseDate.slice(0, 10)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!description || !amount || parseFloat(amount) <= 0) {
      setError("Deskripsi dan Jumlah biaya wajib diisi.");
      return;
    }

    setLoading(true);

    const res = await updateExpenseAction({
      id: expense.id,
      category,
      description,
      amount: parseFloat(amount),
      expenseDate,
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Pengeluaran Operasional</DialogTitle>
          <DialogDescription>
            Perbarui detail pengeluaran operasional.
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
