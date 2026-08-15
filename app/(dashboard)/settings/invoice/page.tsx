import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";

export const metadata: Metadata = { title: "Nomor Invoice" };

export default function InvoiceSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Pengaturan Nomor Invoice" description="Format dan urutan penomoran invoice" />
      <div className="erp-surface space-y-6 p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold mb-1">Format Saat Ini</p>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl font-mono text-sm font-medium">
            INV/YYYY/MM/NNNN
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Contoh: <span className="font-mono font-medium">INV/2026/07/0001</span>
          </p>
        </div>
        <div className="h-px bg-border" />
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ketentuan</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Nomor invoice dihasilkan saat invoice diterbitkan, bukan saat draft dibuat</li>
            <li>Urutan dimulai dari 0001 setiap bulan baru</li>
            <li>Invoice yang dibatalkan tetap mempertahankan nomor untuk keperluan audit</li>
            <li>Pembuatan nomor dilakukan dalam transaksi database untuk menghindari duplikat</li>
          </ul>
        </div>
        <div className="h-px bg-border" />
        <div>
          <p className="text-sm font-semibold mb-3">Nomor Terakhir</p>
          <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
            <span className="font-mono text-sm font-medium">INV/2026/07/0023</span>
            <span className="text-xs text-muted-foreground">30 Juli 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
