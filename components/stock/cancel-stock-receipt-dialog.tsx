"use client";

import { useState, type ReactElement } from "react";
import { Ban, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cancelStockReceiptAction, forceDeleteStockReceiptAction } from "@/lib/actions/inventory";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface CancelStockReceiptDialogProps {
  receiptId?: string;
  receiptNumber?: string;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CancelStockReceiptDialog({ receiptId, receiptNumber, trigger, open: controlledOpen, onOpenChange }: CancelStockReceiptDialogProps) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [forceDeleteOpen, setForceDeleteOpen] = useState(false);

  if (!receiptId) return null;

  const cancelReceipt = async () => {
    if (!reason.trim()) { toast.error("Alasan pembatalan wajib diisi."); return; }
    setSaving(true);
    const result = await cancelStockReceiptAction(receiptId, reason);
    setSaving(false);
    if ("error" in result && result.error) { toast.error(`Gagal: ${result.error}`); return; }
    toast.success("message" in result ? result.message : "Penerimaan stok berhasil dibatalkan.");
    setOpen(false);
    setReason("");
    router.refresh();
  };

  const forceDeleteReceipt = async () => {
    setSaving(true);
    const result = await forceDeleteStockReceiptAction(receiptId);
    setSaving(false);
    if ("error" in result && result.error) { toast.error(`Gagal: ${result.error}`); return; }
    toast.success("message" in result ? result.message : "Pembelian supplier berhasil dihapus.");
    setForceDeleteOpen(false);
    setOpen(false);
    router.refresh();
  };

  return <>
    {controlledOpen === undefined && (trigger ? <DialogTrigger render={trigger} /> : <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700" aria-label={`Aksi penerimaan ${receiptNumber || "stok"}`}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700" onClick={() => setOpen(true)}>
           <Ban className="mr-2 size-3.5" /> Batalkan penerimaan
         </DropdownMenuItem>
         <DropdownMenuItem className="cursor-pointer text-red-700 focus:text-red-700" onClick={() => setForceDeleteOpen(true)}>
           <Trash2 className="mr-2 size-3.5" /> Hapus permanen
         </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>)}
    <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batalkan penerimaan stok?</DialogTitle>
          <DialogDescription>{receiptNumber || "Penerimaan ini"} akan tetap tersimpan sebagai riwayat dibatalkan. Stok, HPP, dan hutang supplier yang belum dibayar akan dibalik.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <label htmlFor={`cancel-receipt-reason-${receiptId}`} className="text-xs font-semibold text-stone-700">Alasan pembatalan</label>
          <textarea id={`cancel-receipt-reason-${receiptId}`} value={reason} onChange={(event) => setReason(event.target.value)} required className="min-h-24 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 focus:ring-3 focus:ring-stone-200/70" placeholder="Contoh: jumlah atau harga pada penerimaan salah." />
          <p className="text-[11px] leading-4 text-stone-500">Pembatalan hanya dapat dilakukan bila belum ada transaksi stok lanjutan untuk produk pada penerimaan ini.</p>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Kembali</Button><Button type="button" variant="destructive" onClick={cancelReceipt} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Batalkan penerimaan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={forceDeleteOpen}
      onOpenChange={setForceDeleteOpen}
      title="Hapus pembelian supplier?"
      description={`${receiptNumber || "Penerimaan ini"} dan seluruh item di dalamnya akan dihapus permanen.`}
      confirmationText={receiptNumber || "HAPUS"}
      confirmLabel="Hapus permanen"
      onConfirm={forceDeleteReceipt}
    />
  </>;
}
