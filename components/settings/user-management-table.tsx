"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, Info, CheckCircle2, Clock, XCircle, Check, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { approveUserAction, rejectUserAction, type SystemUserItem } from "@/lib/actions/users";
import type { Role } from "@/types";

interface UserManagementTableProps {
  users: SystemUserItem[];
  currentUserRole: string;
}

const roleLabel: Record<string, string> = {
  OWNER: "Owner (Akses Penuh)",
  FINANCE: "Admin & Keuangan",
  STAFF: "Staff Operasional",
};

export function UserManagementTable({ users, currentUserRole }: UserManagementTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const activeUsers = users.filter((u) => u.status === "APPROVED");
  const rejectedUsers = users.filter((u) => u.status === "REJECTED");

  const isOwner = currentUserRole.toUpperCase() === "OWNER";

  const handleApprove = async (user: SystemUserItem, role: Role) => {
    setLoadingId(user.id);
    const res = await approveUserAction(user.id, role);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal menyetujui: ${res.error}`);
    } else {
      toast.success(res.message || `Akun ${user.name} berhasil disetujui!`);
      router.refresh();
    }
  };

  const handleReject = async (user: SystemUserItem) => {
    setLoadingId(user.id);
    const res = await rejectUserAction(user.id);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal menolak: ${res.error}`);
    } else {
      toast.info(res.message || `Pendaftaran ${user.name} telah ditolak.`);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Approvals Card */}
      <div className="bg-white rounded-2xl border border-amber-200/80 shadow-card overflow-hidden">
        <div className="p-5 border-b border-amber-100 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Permintaan Pendaftaran PENDING (Menunggu ACC Owner)
            </h3>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Akun baru yang mendaftar dan membutuhkan verifikasi/persetujuan dari Owner.
            </p>
          </div>

          <Badge variant="outline" className="bg-amber-100/80 text-amber-900 border-amber-300 font-bold self-start sm:self-center">
            {pendingUsers.length} Permintaan
          </Badge>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">Tidak ada permintaan pendaftaran pending</p>
            <p className="text-slate-500">Semua pendaftaran akun baru telah diproses.</p>
          </div>
        ) : (
          <>
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50/20 hover:bg-amber-50/20">
                  <TableHead className="text-xs font-semibold">Nama Pengguna</TableHead>
                  <TableHead className="text-xs font-semibold">Email Registrasi</TableHead>
                  <TableHead className="text-xs font-semibold">Peran Diajukan</TableHead>
                  <TableHead className="text-xs font-semibold">Tanggal Daftar</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Tindakan ACC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-amber-50/30">
                    <TableCell className="text-sm font-bold text-slate-900">
                      {u.name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 font-mono">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs border border-amber-200">
                        {roleLabel[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwner ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(u, "STAFF")}
                            disabled={loadingId === u.id}
                            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            ACC Staff
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleApprove(u, "FINANCE")} disabled={loadingId === u.id} className="h-10 text-xs px-3.5">ACC Finance</Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(u)}
                            disabled={loadingId === u.id}
                            className="h-10 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 px-3.5"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Tolak
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic flex items-center justify-end gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          Hanya Owner yang dapat ACC
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-amber-100 sm:hidden">
            {pendingUsers.map((user) => (
              <article key={user.id} className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="mt-1 break-all text-xs text-slate-600">{user.email}</p>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/70 p-3 text-xs">
                  <div>
                    <p className="text-amber-700">Peran diajukan</p>
                    <p className="mt-1 font-medium text-amber-950">{roleLabel[user.role] || user.role}</p>
                  </div>
                  <p className="text-right text-amber-800">{user.createdAt}</p>
                </div>
                {isOwner ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => handleApprove(user, "STAFF")} disabled={loadingId === user.id} className="h-10 rounded-xl bg-emerald-600 text-xs hover:bg-emerald-700">
                      <Check className="mr-1 h-3.5 w-3.5" /> ACC Staff
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleApprove(user, "FINANCE")} disabled={loadingId === user.id} className="h-10 rounded-xl text-xs">ACC Finance</Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(user)} disabled={loadingId === user.id} className="col-span-2 h-10 rounded-xl border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
                      <X className="mr-1 h-3.5 w-3.5" /> Tolak Pendaftaran
                    </Button>
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-amber-800"><ShieldAlert className="h-3.5 w-3.5" /> Hanya Owner yang dapat menyetujui akun.</p>
                )}
              </article>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Registered & Active Users Table */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden space-y-0">
        <div className="p-5 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-700" />
              Daftar Pengguna Aktif & Terverifikasi
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daftar akun terdaftar yang telah disetujui dan memiliki hak akses ke ERP.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Total Pengguna: <b>{activeUsers.length}</b></span>
          </div>
        </div>

        <div className="hidden sm:block">
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
              {activeUsers.map((u) => (
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
                      {roleLabel[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.createdAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Aktif (ACC)
                    </span>
                  </TableCell>
                </TableRow>
              ))}

              {rejectedUsers.map((u) => (
                <TableRow key={u.id} className="bg-red-50/30 hover:bg-red-50/40 opacity-75">
                  <TableCell className="text-sm font-semibold text-slate-700 line-through">
                    {u.name}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 font-mono">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                      {roleLabel[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.createdAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      <XCircle className="w-3 h-3 text-red-600" />
                      Ditolak
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="divide-y divide-stone-200 sm:hidden">
          {[...activeUsers, ...rejectedUsers].map((user) => {
            const isRejected = user.status === "REJECTED";
            return (
              <article key={user.id} className={`space-y-3 p-4 ${isRejected ? "bg-red-50/30" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isRejected ? "text-slate-600 line-through" : "text-slate-900"}`}>{user.name}</p>
                    <p className="mt-1 break-all text-xs text-slate-600">{user.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${isRejected ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {isRejected ? "Ditolak" : "Aktif"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-xs">
                  <div><p className="text-stone-500">Role akses</p><p className="mt-1 font-medium text-stone-800">{roleLabel[user.role] || user.role}</p></div>
                  <div className="text-right"><p className="text-stone-500">Terdaftar</p><p className="mt-1 font-medium text-stone-800">{user.createdAt}</p></div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
