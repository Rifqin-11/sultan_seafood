"use client";

import { useState } from "react";
import { ClipboardPenLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adjustStockAction, setStockMinimumAction } from "@/lib/actions/inventory";
import type { StockBalance } from "@/types";

export function AdjustStockDialog({ balance }: { balance?: StockBalance }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [minimum, setMinimum] = useState("");
  const [notes, setNotes] = useState("");
  const reset = () => { setQuantity(""); setMinimum(balance?.minimumQuantity ? String(balance.minimumQuantity) : "0"); setNotes(""); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minimumResult = await setStockMinimumAction(balance?.productId ?? "", Number(minimum));
    if (minimumResult.error) { toast.error(`Gagal: ${minimumResult.error}`); return; }
    if (quantity.trim()) {
      const result = await adjustStockAction(balance?.productId ?? "", Number(quantity), notes);
      if (result.error) { toast.error(`Gagal: ${result.error}`); return; }
    }
    toast.success("Pengaturan stok berhasil disimpan."); setOpen(false); reset(); router.refresh();
  };
  if (!balance) return null;
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setMinimum(balance.minimumQuantity ? String(balance.minimumQuantity) : "0"); if (!next && !saving) reset(); }}>
    <Button variant="outline" size="sm" onClick={() => { setMinimum(balance.minimumQuantity ? String(balance.minimumQuantity) : "0"); setOpen(true); }} className="h-9 rounded-lg"><ClipboardPenLine className="mr-1.5 h-3.5 w-3.5" /> Sesuaikan</Button>
    <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-md">
      <DialogHeader><DialogTitle>Sesuaikan Stok</DialogTitle><DialogDescription>{balance.productName} · stok saat ini {balance.quantity} {balance.unit}. Gunakan angka positif untuk menambah dan negatif untuk mengurangi.</DialogDescription></DialogHeader>
      <form onSubmit={async (event) => { setSaving(true); await submit(event); setSaving(false); }} className="space-y-4">
        <div className="space-y-1.5"><label htmlFor="stock-minimum-quantity" className="text-xs font-semibold text-stone-700">Batas minimum stok</label><Input id="stock-minimum-quantity" type="number" min="0" step="0.001" value={minimum} onChange={(event) => setMinimum(event.target.value)} required className="h-10 rounded-xl text-right tabular-nums" /></div>
        <div className="space-y-1.5"><label htmlFor="stock-adjustment-quantity" className="text-xs font-semibold text-stone-700">Perubahan stok <span className="font-normal text-stone-400">(opsional)</span></label><Input id="stock-adjustment-quantity" type="number" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Contoh: 10 atau -2" className="h-10 rounded-xl text-right tabular-nums" /></div>
        {quantity.trim() && <div className="space-y-1.5"><label htmlFor="stock-adjustment-notes" className="text-xs font-semibold text-stone-700">Alasan perubahan</label><textarea id="stock-adjustment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} required className="min-h-24 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 focus:ring-3 focus:ring-stone-200/70" placeholder="Contoh: stok awal atau hasil stok opname." /></div>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan Pengaturan</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
