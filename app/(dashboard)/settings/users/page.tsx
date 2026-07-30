import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Pengguna & Role",
};

const mockUsers = [
  { id: "u1", name: "Budi Santoso", email: "budi@sultansf.id", role: "OWNER", status: "ACTIVE" },
  { id: "u2", name: "Sari Dewi", email: "sari@sultansf.id", role: "FINANCE", status: "ACTIVE" },
  { id: "u3", name: "Anton Wijaya", email: "anton@sultansf.id", role: "STAFF", status: "ACTIVE" },
];

const roleLabel: Record<string, string> = {
  OWNER: "Owner",
  FINANCE: "Finance / Admin",
  STAFF: "Staff Operasional",
};

export default function UsersSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pengguna & Role" description="Kelola akses pengguna sistem">
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Tambah Pengguna
        </Button>
      </PageHeader>

      {/* Role descriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { role: "OWNER", desc: "Akses penuh ke seluruh data termasuk harga beli dan laba." },
          { role: "FINANCE", desc: "Dapat membuat invoice, mencatat pembayaran, dan melihat laporan." },
          { role: "STAFF", desc: "Hanya dapat membuat draft invoice. Tidak melihat harga beli." },
        ].map((r) => (
          <div key={r.role} className="bg-white rounded-xl border border-border p-4">
            <Badge className="mb-2 text-xs">{roleLabel[r.role]}</Badge>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Nama</TableHead>
                <TableHead className="text-xs font-semibold">Email</TableHead>
                <TableHead className="text-xs font-semibold">Role</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {roleLabel[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-[11px]">
                      Aktif
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
