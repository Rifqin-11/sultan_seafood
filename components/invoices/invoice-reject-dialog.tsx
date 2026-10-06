"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/types";
import { getInvoiceByIdAction, getInvoiceRejectsAction, recordInvoiceRejectAction, type InvoiceRejectItemInput } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InvoiceRejectDialogProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RejectItemState {
  invoiceItemId: string;
  productName: string;
  unit: string;
  invoicedQuantity: number;
  rejectedQuantity: number;
  selected: boolean;
  quantity: string;
  reason: string;
}

interface RejectHistoryEntry {
  id: string;
  productName: string;
  unit: string;
  quantity: number;
  reason: string;
  returnToStock: boolean;
  createdAt: string;
}

export function InvoiceRejectDialog({ invoice, open, onOpenChange }: InvoiceRejectDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [returnToStock, setReturnToStock] = useState(true);
  const [items, setItems] = useState<RejectItemState[]>([]);
  const [rejectHistory, setRejectHistory] = useState<RejectHistoryEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([getInvoiceByIdAction(invoice.id), getInvoiceRejectsAction(invoice.id)])
      .then(([detail, rejects]) => {
        if (cancelled) return;
        setRejectHistory(rejects);
        if (!detail) {
          toast.error("Detail invoice tidak tersedia.");
          onOpenChange(false);
          return;
        }
        setItems(detail.items.map((item) => {
          const rejectedQuantity = rejects.filter((reject) => reject.invoiceItemId === item.id)
            .reduce((sum, reject) => sum + reject.quantity, 0);
          return {
            invoiceItemId: item.id,
            productName: item.descriptionSnapshot,
            unit: item.unit,
            invoicedQuantity: item.quantity,
            rejectedQuantity,
            selected: false,
            quantity: "",
            reason: "",
          };
        }));
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat detail produk invoice.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [invoice.id, open, onOpenChange]);

  const updateItem = (invoiceItemId: string, patch: Partial<RejectItemState>) => {
    setItems((current) => current.map((item) => item.invoiceItemId === invoiceItemId ? { ...item, ...patch } : item));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = items.filter((item) => item.selected);
    if (selected.length === 0) {
      toast.error("Pilih produk yang direject.");
      return;
    }
    const payload: InvoiceRejectItemInput[] = selected.map((item) => ({
      invoiceItemId: item.invoiceItemId,
      quantity: Number(item.quantity),
      reason: item.reason.trim(),
    }));
    if (payload.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !item.reason)) {
      toast.error("Isi berat dan alasan untuk setiap produk yang dipilih.");
      return;
    }
    setSaving(true);
    const result = await recordInvoiceRejectAction(invoice.id, payload, returnToStock);
    setSaving(false);
    if (result.error) {
      toast.error(`Gagal mencatat reject: ${result.error}`);
      return;
    }
    toast.success(result.message || "Reject invoice berhasil dicatat.");
    onOpenChange(false);
    router.refresh();
  };

  const resetAndClose = (next: boolean) => {
    if (saving) return;
    if (!next) { setItems([]); setRejectHistory([]); setLoading(true); }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat produk reject</DialogTitle>
          <DialogDescription>Pilih produk, masukkan berat yang direject, lalu tulis alasannya. Invoice {invoice.invoiceNumber || "Draft"} · {invoice.customerName}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Memuat produk invoice…</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="max-h-[42dvh] space-y-3 overflow-y-auto pr-1">
              {rejectHistory.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/35 p-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">Riwayat reject</p>
                  <div className="space-y-2">
                    {rejectHistory.map((reject) => (
                      <div key={reject.id} className="flex items-start justify-between gap-3 text-xs">
                        <p className="min-w-0"><span className="font-medium">{reject.productName}</span><span className="text-muted-foreground"> · {reject.reason} · {reject.returnToStock ? "dikembalikan ke stok" : "hangus"}</span></p>
                        <span className="shrink-0 font-semibold tabular-nums">{reject.quantity} {reject.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Tidak ada item produk untuk direject.</div>
              ) : items.map((item) => {
                const remaining = Math.max(item.invoicedQuantity - item.rejectedQuantity, 0);
                return (
                  <article key={item.invoiceItemId} className={`rounded-xl border p-3 transition-colors sm:p-4 ${item.selected ? "border-amber-300 bg-amber-50/50" : "border-border bg-card"}`}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={item.selected} disabled={remaining <= 0} onChange={(event) => updateItem(item.invoiceItemId, { selected: event.target.checked })} className="mt-1 size-4 accent-amber-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{item.productName}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Invoice {item.invoicedQuantity} {item.unit} · sudah reject {item.rejectedQuantity} {item.unit} · tersisa {remaining} {item.unit}</span>
                      </span>
                    </label>
                    {item.selected && (
                      <div className="mt-3 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-[150px_1fr]">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground" htmlFor={`reject-quantity-${item.invoiceItemId}`}>Berat reject ({item.unit})</label>
                          <Input id={`reject-quantity-${item.invoiceItemId}`} type="number" min="0.001" max={remaining} step="0.001" required value={item.quantity} onChange={(event) => updateItem(item.invoiceItemId, { quantity: event.target.value })} placeholder={`Maks. ${remaining}`} className="h-10 rounded-lg tabular-nums" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground" htmlFor={`reject-reason-${item.invoiceItemId}`}>Alasan reject</label>
                          <Input id={`reject-reason-${item.invoiceItemId}`} required maxLength={500} value={item.reason} onChange={(event) => updateItem(item.invoiceItemId, { reason: event.target.value })} placeholder="Contoh: kualitas tidak sesuai" className="h-10 rounded-lg" />
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-foreground">Penanganan produk reject</legend>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${returnToStock ? "border-emerald-300 bg-emerald-50/60" : "border-border"}`}>
                <input type="radio" name="reject-stock-action" checked={returnToStock} onChange={() => setReturnToStock(true)} className="mt-1 size-4 accent-emerald-600" />
                <span className="flex gap-2.5"><RotateCcw className="mt-0.5 size-4 shrink-0 text-emerald-700" /><span><span className="block text-sm font-semibold">Kembalikan ke stok</span><span className="mt-0.5 block text-xs text-muted-foreground">Berat reject menambah saldo stok dan tercatat di mutasi.</span></span></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${!returnToStock ? "border-red-300 bg-red-50/60" : "border-border"}`}>
                <input type="radio" name="reject-stock-action" checked={!returnToStock} onChange={() => setReturnToStock(false)} className="mt-1 size-4 accent-red-600" />
                <span className="flex gap-2.5"><Trash2 className="mt-0.5 size-4 shrink-0 text-red-700" /><span><span className="block text-sm font-semibold">Hanguskan</span><span className="mt-0.5 block text-xs text-muted-foreground">Produk tidak ditambahkan kembali ke stok.</span></span></span>
              </label>
            </fieldset>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>Pencatatan reject tidak mengubah nilai invoice atau pembayaran. Pastikan berat dan penanganan stok sudah benar.</p></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => resetAndClose(false)} disabled={saving}>Batal</Button>
              <Button type="submit" disabled={saving || loading || items.length === 0}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Simpan reject</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
