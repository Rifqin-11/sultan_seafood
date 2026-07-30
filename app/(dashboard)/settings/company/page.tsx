import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { Fish, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Profil Bisnis",
};

export default function CompanySettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Profil Bisnis"
        description="Informasi perusahaan yang akan tampil pada invoice"
      />

      <div className="bg-white rounded-2xl border border-border shadow-card p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center">
            <Fish className="w-8 h-8 text-background" />
          </div>
          <div>
            <p className="font-semibold text-lg">Sultan Seafood</p>
            <p className="text-sm text-muted-foreground">
              Placeholder logo — dapat diganti
            </p>
            <Button variant="outline" size="sm" className="mt-2 text-xs h-7">
              Ganti Logo
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: "Nama Bisnis", value: "Sultan Seafood", id: "business-name" },
            { label: "Alamat", value: "Jl. Pemasok Seafood No. 1, Jakarta Utara", id: "address" },
            { label: "Telepon", value: "021-XXXXXXXX", id: "phone" },
            { label: "Email", value: "info@sultansf.id", id: "email" },
            { label: "Website", value: "www.sultansf.id", id: "website" },
            { label: "NPWP", value: "", id: "npwp", placeholder: "Opsional" },
            { label: "Info Rekening / Pembayaran", value: "BCA: 1234567890 a.n. Sultan Seafood", id: "payment-info" },
          ].map((field) => (
            <div key={field.id}>
              <label
                htmlFor={field.id}
                className="block text-xs font-medium text-muted-foreground mb-1.5"
              >
                {field.label}
              </label>
              <Input
                id={field.id}
                defaultValue={field.value}
                placeholder={field.placeholder}
                className="h-9"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button size="sm">Simpan Perubahan</Button>
        </div>
      </div>
    </div>
  );
}
