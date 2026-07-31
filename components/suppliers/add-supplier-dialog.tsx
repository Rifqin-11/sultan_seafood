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
} from "@/components/ui/dialog";
import { createSupplierAction } from "@/lib/actions/suppliers";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddSupplierDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const resetForm = () => {
    setName("");
    setContactName("");
    setPhone("");
    setAddress("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !contactName || !phone || !address) {
      setError("Semua field wajib diisi.");
      return;
    }

    setLoading(true);

    const res = await createSupplierAction({
      name,
      contactName,
      phone,
      address,
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      toast.success(res.message || "Supplier berhasil ditambahkan");
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
        Tambah Supplier
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Supplier Seafood</DialogTitle>
          <DialogDescription>
            Masukkan data nelayan atau pemasok grosir seafood.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Nama Supplier / PT <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="PT Bahari Nelayan Utama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Kontak PIC <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Pak Hendra"
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
                placeholder="081987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Alamat Pelabuhan / Kantor <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Pelabuhan Muara Baru Blok B, Jakarta Utara"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
              Simpan Supplier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
