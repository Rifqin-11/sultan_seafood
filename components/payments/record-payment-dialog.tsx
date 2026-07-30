"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPaymentAction } from "@/lib/actions/payments";
import { mockInvoices } from "@/lib/mock-data";
import type { PaymentMethod } from "@/types";

interface RecordPaymentDialogProps {
  defaultInvoiceId?: string;
}

export function RecordPaymentDialog({ defaultInvoiceId }: RecordPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId || "");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [method, setMethod] = useState<PaymentMethod>("TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const selectedInvoice = mockInvoices.find((i) => i.id === invoiceId);

  const resetForm = () => {
    setAmount("");
    setReferenceNumber("");
    setNotes("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!invoiceId || !amount || parseFloat(amount) <= 0) {
      setError("Pilih invoice dan masukkan jumlah bayar yang valid.");
      return;
    }

    setLoading(true);

    const res = await createPaymentAction({
      invoiceId,
      amount: parseFloat(amount),
      paymentDate,
      method,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
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
        <CreditCard className="w-3.5 h-3.5 mr-1" />
        Catat Pembayaran
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran Pelanggan</DialogTitle>
          <DialogDescription>
            Masukkan rincian pembayaran masuk dari restoran.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Invoice Target <span className="text-red-500">*</span>
            </label>
            <Select value={invoiceId} onValueChange={(v) => setInvoiceId(v || "")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Invoice...">
                  {selectedInvoice ? `${selectedInvoice.invoiceNumber ?? "DRAFT"} — ${selectedInvoice.customerName}` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mockInvoices
                  .filter((i) => i.status !== "PAID" && i.status !== "VOID")
                  .map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoiceNumber ?? "DRAFT"} — {inv.customerName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedInvoice && (
            <div className="p-2.5 bg-muted/40 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Invoice:</span>
                <span className="font-semibold">
                  Rp {selectedInvoice.total.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sisa Tagihan:</span>
                <span className="font-bold text-amber-600">
                  Rp {selectedInvoice.remainingBalance.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Jumlah Bayar (Rp) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="5000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tanggal Pembayaran
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Metode Bayar
              </label>
              <Select
                value={method}
                onValueChange={(v) => setMethod((v as PaymentMethod) || "TRANSFER")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>
                    {method === "TRANSFER"
                      ? "Transfer Bank"
                      : method === "CASH"
                      ? "Tunai / Cash"
                      : method === "CHECK"
                      ? "Cek / Bilyet Giro"
                      : "Lainnya"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
                  <SelectItem value="CASH">Tunai / Cash</SelectItem>
                  <SelectItem value="CHECK">Cek / Bilyet Giro</SelectItem>
                  <SelectItem value="OTHER">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                No. Referensi / Bukti
              </label>
              <Input
                placeholder="TRX-98765432"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Catatan (Opsional)
            </label>
            <Input
              placeholder="Pelunasan tahap 1..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
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
              Simpan Pembayaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
