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
import { createCustomerAction } from "@/lib/actions/customers";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [paymentTermDays, setPaymentTermDays] = useState("7");

  const resetForm = () => {
    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setBillingAddress("");
    setPaymentTermDays("7");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !contactName || !phone || !billingAddress) {
      setError("Nama Restoran, Kontak, No HP, dan Alamat Tagihan wajib diisi.");
      return;
    }

    setLoading(true);

    const res = await createCustomerAction({
      name,
      contactName,
      phone,
      email: email || undefined,
      billingAddress,
      paymentTermDays: parseInt(paymentTermDays) || 7,
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      toast.success(res.message || "Restoran berhasil ditambahkan");
      resetForm();
      setOpen(false);
      router.refresh();
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
        Tambah Restoran
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Restoran Pelanggan</DialogTitle>
          <DialogDescription>
            Masukkan rincian profil restoran dan kontak penanggung jawab.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Nama Restoran <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Restoran Ocean Seafood Jakarta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nama Kontak PIC <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Chef Budi"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                No HP / WhatsApp <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email (Opsional)
            </label>
            <Input
              type="email"
              placeholder="finance@oceanseafood.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Alamat Tagihan <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Jl. Pantai Indah Kapuk No. 8, Jakarta Utara"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Termin Pembayaran (Hari Jatuh Tempo)
            </label>
            <Input
              type="number"
              min="1"
              placeholder="7"
              value={paymentTermDays}
              onChange={(e) => setPaymentTermDays(e.target.value)}
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
              Simpan Restoran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
