"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Fish, Upload, X, CheckCircle2, Building2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  defaultCompanyProfile,
  getCompanyProfile,
  saveCompanyProfile,
  INDONESIAN_BANKS,
  type CompanyProfile,
} from "@/lib/company-store";

export default function CompanySettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile>(defaultCompanyProfile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProfile(getCompanyProfile());
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfile((prev) => ({
        ...prev,
        logoUrl: ev.target?.result as string,
      }));
      toast.success("Logo berhasil dipilih. Klik 'Simpan Perubahan' untuk memperbarui.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    const updated = { ...profile, logoUrl: undefined };
    setProfile(updated);
    saveCompanyProfile(updated);
    window.dispatchEvent(new Event("company-profile-updated"));
    toast.info("Logo dihapus. Menggunakan logo default.");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    saveCompanyProfile(profile);
    window.dispatchEvent(new Event("company-profile-updated"));
    setTimeout(() => {
      setLoading(false);
      toast.success("Profil Bisnis berhasil diperbarui!");
    }, 400);
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Profil Bisnis"
        description="Informasi resmi perusahaan yang akan tampil pada invoice resmi dan online preview"
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Header Logo Card */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> Logo Perusahaan
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative w-24 h-24 rounded-2xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {profile.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.logoUrl}
                  alt="Logo Bisnis"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="w-full h-full bg-foreground flex items-center justify-center">
                  <Fish className="w-10 h-10 text-background" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-bold text-base text-slate-900">{profile.name}</p>
              <p className="text-xs text-muted-foreground max-w-md">
                Logo ini akan ditampilkan di bagian atas Invoice Resmi, Preview Pelanggan, dan Berkas PDF Download. Format disarankan: PNG / JPG transparansi.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer text-xs font-semibold transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Logo Baru</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {profile.logoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Hapus Logo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Details & Bank Account (Full Width Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Details */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Informasi Perusahaan
            </h3>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nama Bisnis <span className="text-red-500">*</span>
              </label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Sultan Seafood"
                className="h-9 text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Alamat Kantor / Gudang
              </label>
              <Input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Jl. Pemasok Seafood No. 1..."
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Telepon / WhatsApp
                </label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="0812XXXXXXXX"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Email Bisnis
                </label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="info@sultansf.id"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Website (Opsional)
                </label>
                <Input
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  placeholder="www.sultansf.id"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  NPWP Perusahaan (Opsional)
                </label>
                <Input
                  value={profile.npwp}
                  onChange={(e) => setProfile({ ...profile, npwp: e.target.value })}
                  placeholder="00.000.000.0-000.000"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Details (Separated) */}
          <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" /> Informasi Rekening Bank (Tampil di Invoice)
            </h3>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <p className="font-semibold">Rekening Resmi Pembayaran</p>
              <p className="text-blue-700">
                Informasi ini otomatis dimasukkan ke petunjuk pembayaran transfer bank pada halaman invoice pelanggan & dokumen cetak PDF.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nama Bank <span className="text-red-500">*</span>
              </label>
              <Select
                value={profile.bankName}
                onValueChange={(val) => setProfile({ ...profile, bankName: val || "BCA" })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Pilih Bank..." />
                </SelectTrigger>
                <SelectContent>
                  {INDONESIAN_BANKS.map((b) => (
                    <SelectItem key={b} value={b.split(" ")[0]}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nomor Rekening <span className="text-red-500">*</span>
              </label>
              <Input
                value={profile.bankAccount}
                onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })}
                placeholder="1234567890"
                className="h-9 text-sm font-mono font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nama Pemilik Rekening (Atas Nama) <span className="text-red-500">*</span>
              </label>
              <Input
                value={profile.bankHolder}
                onChange={(e) => setProfile({ ...profile, bankHolder: e.target.value })}
                placeholder="Sultan Seafood"
                className="h-9 text-sm font-medium"
                required
              />
            </div>

            <div className="p-4 bg-muted/40 rounded-xl space-y-1 text-xs mt-4">
              <p className="text-muted-foreground font-medium">Pratinjau Tampilan di Invoice:</p>
              <p className="font-bold text-slate-800">
                Bank {profile.bankName}: <span className="font-mono text-blue-600">{profile.bankAccount}</span>
              </p>
              <p className="text-muted-foreground">
                Atas Nama: <span className="font-semibold text-slate-800">{profile.bankHolder}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={loading} size="lg" className="px-8 font-semibold">
            {loading ? "Menyimpan..." : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
