"use client";

import { useState } from "react";
import { CalendarDays, FilePlus2, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSupplierBillAction } from "@/lib/actions/supplier-payables";
import type { Supplier } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AddSupplierBillDialogProps {
  suppliers: Supplier[];
}

const today = () => new Date().toISOString().slice(0, 10);

export function AddSupplierBillDialog({ suppliers }: AddSupplierBillDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [supplierReference, setSupplierReference] = useState("");
  const [billDate, setBillDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [total, setTotal] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setSupplierId("");
    setSupplierReference("");
    setBillDate(today());
    setDueDate("");
    setTotal("");
    setNotes("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const totalValue = Number(total);
    if (!supplierId || !Number.isFinite(totalValue) || totalValue <= 0) {
      toast.error("Pilih supplier dan isi total tagihan yang valid.");
      return;
    }

    setSaving(true);
    const result = await createSupplierBillAction({
      supplierId,
      supplierReference: supplierReference || undefined,
      billDate,
      dueDate: dueDate || undefined,
      total: totalValue,
      notes: notes || undefined,
    });
    setSaving(false);
    if ("error" in result && result.error) {
      toast.error(`Gagal: ${result.error}`);
      return;
    }
    toast.success("Tagihan supplier berhasil dicatat.");
    handleOpenChange(false);
    router.refresh();
  };

  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "ACTIVE");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button onClick={() => setOpen(true)} size="sm" className="h-10 rounded-xl px-4">
        <FilePlus2 className="mr-1.5 h-4 w-4" /> Catat Tagihan
      </Button>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Hutang Supplier</DialogTitle>
          <DialogDescription>Masukkan tagihan pembelian yang perlu dibayar ke supplier. Sisa tagihan dan status akan dihitung otomatis.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="supplier-payable-supplier" className="text-xs font-semibold text-stone-700">Supplier</label>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <select
                id="supplier-payable-supplier"
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                required
                className="h-10 w-full appearance-none rounded-xl border border-stone-200 bg-white px-10 text-sm text-stone-900 outline-none focus:border-stone-500 focus:ring-3 focus:ring-stone-200/70"
              >
                <option value="">Pilih supplier</option>
                {activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </div>
            {activeSuppliers.length === 0 && <p className="text-xs text-amber-700">Belum ada supplier aktif. Tambahkan supplier terlebih dahulu.</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="supplier-payable-total" className="text-xs font-semibold text-stone-700">Total Tagihan (Rp)</label>
              <Input id="supplier-payable-total" type="number" min="0" step="0.01" value={total} onChange={(event) => setTotal(event.target.value)} required className="h-10 rounded-xl border-stone-200 text-right tabular-nums" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supplier-payable-reference" className="text-xs font-semibold text-stone-700">No. Tagihan Supplier</label>
              <Input id="supplier-payable-reference" value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} className="h-10 rounded-xl border-stone-200" placeholder="Opsional" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="supplier-payable-date" className="text-xs font-semibold text-stone-700">Tanggal Tagihan</label>
              <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><Input id="supplier-payable-date" type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} required className="h-10 rounded-xl border-stone-200 pl-10" /></div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supplier-payable-due-date" className="text-xs font-semibold text-stone-700">Jatuh Tempo</label>
              <Input id="supplier-payable-due-date" type="date" min={billDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-10 rounded-xl border-stone-200" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="supplier-payable-notes" className="text-xs font-semibold text-stone-700">Catatan</label>
            <textarea id="supplier-payable-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 focus:ring-3 focus:ring-stone-200/70" placeholder="Contoh: pembelian udang vaname minggu pertama." />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>Batal</Button>
            <Button type="submit" disabled={saving || activeSuppliers.length === 0}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan Tagihan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
