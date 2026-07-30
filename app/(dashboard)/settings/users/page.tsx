import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserAction } from "@/lib/actions/auth";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, Shield, Info, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Profil & Pengguna",
};

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  status: "ACTIVE";
  createdAt: string;
}

const systemUsers: SystemUser[] = [
  {
    id: "usr_1",
    name: "Owner Business",
    email: "owner@sultansf.id",
    role: "OWNER",
    status: "ACTIVE",
    createdAt: "10 Jan 2026",
  },
  {
    id: "usr_2",
    name: "Admin Operasional",
    email: "admin@sultansf.id",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "15 Jan 2026",
  },
];

const roleLabel: Record<string, string> = {
  OWNER: "Owner (Akses Penuh)",
  ADMIN: "Admin & Keuangan",
  STAFF: "Staff Operasional",
};

export default async function ProfileUsersSettingsPage() {
  const currentUser = await getCurrentUserAction();
  const userEmail = currentUser?.email || "owner@sultansf.id";
  const userRole = currentUser?.role || "Owner";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil & Pengguna"
        description="Informasi profil akun Anda, opsi ganti password, dan daftar pengguna terdaftar sistem ERP"
      />

      {/* Profile Section */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{userEmail.split("@")[0]}</h3>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
              Aktif
            </Badge>
            <Badge className="bg-slate-900 text-white text-xs px-2.5 py-1">
              {userRole}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Email Utama</p>
            <p className="text-sm font-semibold text-slate-900">{userEmail}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Role & Otoritas</p>
            <p className="text-sm font-semibold text-slate-900">{userRole}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Metode Keamanan</p>
            <p className="text-sm font-semibold text-blue-700 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Supabase Auth Session
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <ChangePasswordCard />

      {/* Registered Users Section (Read Only) */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden space-y-0">
        <div className="p-5 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-700" />
              Daftar Pengguna Sistem
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daftar akun terdaftar yang dapat mengakses ERP Sultan Seafood.
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 shrink-0">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Hanya <b>Owner</b> yang dapat menambahkan pengguna via Supabase Auth.</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Nama / Pengguna</TableHead>
                <TableHead className="text-xs font-semibold">Email Supabase</TableHead>
                <TableHead className="text-xs font-semibold">Role Akses</TableHead>
                <TableHead className="text-xs font-semibold">Terdaftar</TableHead>
                <TableHead className="text-xs font-semibold text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-semibold text-slate-900">
                    {u.name}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 font-mono">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        u.role === "OWNER"
                          ? "bg-blue-50 text-blue-700 border border-blue-200 text-xs"
                          : "bg-slate-100 text-slate-700 text-xs"
                      }
                    >
                      {roleLabel[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.createdAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Aktif
                    </span>
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
