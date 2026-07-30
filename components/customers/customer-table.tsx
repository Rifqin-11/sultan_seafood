"use client";

import { useState, useMemo } from "react";
import type { Customer } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  MoreHorizontal,
  Edit,
  Power,
  Trash2,
  Tag,
  Loader2,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toggleCustomerStatusAction, deleteCustomerAction } from "@/lib/actions/customers";
import { EditCustomerDialog } from "./edit-customer-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface CustomerTableProps {
  customers: Customer[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const router = useRouter();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Stats calculation
  const totalCount = customers.length;
  const activeCount = customers.filter((c) => c.status === "ACTIVE").length;
  const inactiveCount = customers.filter((c) => c.status === "INACTIVE").length;
  const avgTermDays = totalCount > 0
    ? Math.round(customers.reduce((acc, c) => acc + (c.paymentTermDays || 7), 0) / totalCount)
    : 7;

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.contactName.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && c.status === "ACTIVE") ||
        (statusFilter === "INACTIVE" && c.status === "INACTIVE");

      return matchSearch && matchStatus;
    });
  }, [customers, search, statusFilter]);

  const handleToggleStatus = async (customer: Customer) => {
    setLoadingId(customer.id);
    const res = await toggleCustomerStatusAction(customer.id, customer.status);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal: ${res.error}`);
    } else {
      toast.success(res.message || "Status restoran berhasil diperbarui");
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setLoadingId(deletingCustomer.id);
    const res = await deleteCustomerAction(deletingCustomer.id);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal menghapus: ${res.error}`);
    } else {
      toast.success(res.message || "Restoran berhasil dihapus");
      router.refresh();
    }
  };

  const getWaLink = (phone: string, name: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const formatted = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;
    const msg = encodeURIComponent(`Halo ${name}, kami dari Sultan Seafood...`);
    return `https://wa.me/${formatted}?text=${msg}`;
  };

  return (
    <div className="space-y-5">
      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Restoran</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Restoran Aktif</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600">{activeCount}</span>
              <span className="text-xs text-muted-foreground">/ {inactiveCount} nonaktif</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Rata-Rata Termin</p>
            <p className="text-2xl font-bold text-foreground mt-1">{avgTermDays} <span className="text-xs font-normal text-muted-foreground">Hari</span></p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama restoran, PIC, no hp..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium cursor-pointer transition-all ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium cursor-pointer transition-all ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium cursor-pointer transition-all ${
              statusFilter === "INACTIVE"
                ? "bg-slate-600 text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Nonaktif ({inactiveCount})
          </button>
        </div>
      </div>

      {/* ─── Customers Table ─── */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold py-3">Nama Restoran</TableHead>
                <TableHead className="text-xs font-semibold py-3">Kontak & PIC</TableHead>
                <TableHead className="text-xs font-semibold py-3">Alamat Tagihan</TableHead>
                <TableHead className="text-xs font-semibold py-3">Termin Bayar</TableHead>
                <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                <TableHead className="w-12 py-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    {search ? "Tidak ada restoran yang cocok dengan pencarian." : "Belum ada data restoran."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => {
                  const initial = c.name.trim().charAt(0).toUpperCase();

                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                              {c.name}
                            </p>
                            {c.email && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {c.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-800">{c.contactName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {c.phone}
                            </span>
                            {c.phone && (
                              <a
                                href={getWaLink(c.phone, c.contactName)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                                title="Chat WhatsApp PIC"
                              >
                                <MessageSquare className="w-2.5 h-2.5" /> WA
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-xs text-muted-foreground max-w-[220px] line-clamp-2 leading-relaxed flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          {c.billingAddress || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 font-medium text-xs border-slate-200">
                          <Clock className="w-3 h-3 mr-1 text-slate-500" />
                          {c.paymentTermDays} Hari
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        {c.status === "ACTIVE" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium text-xs gap-1">
                            <XCircle className="w-3 h-3 text-slate-400" />
                            Nonaktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center justify-center h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                            aria-label="Aksi restoran"
                          >
                            {loadingId === c.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <MoreHorizontal className="w-4 h-4" />
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 shadow-lg rounded-xl">
                            <DropdownMenuItem
                              className="cursor-pointer font-medium text-xs"
                              onClick={() => setEditingCustomer(c)}
                            >
                              <Edit className="w-3.5 h-3.5 mr-2 text-blue-600" />
                              Edit Data Restoran
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs">
                              <Link href="/pricing/selling" className="flex items-center w-full">
                                <Tag className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                                Atur Harga Khusus
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer font-medium text-xs"
                              onClick={() => handleToggleStatus(c)}
                            >
                              <Power className="w-3.5 h-3.5 mr-2 text-amber-600" />
                              {c.status === "ACTIVE" ? "Nonaktifkan Restoran" : "Aktifkan Restoran"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer font-medium text-xs text-red-600 focus:text-red-600"
                              onClick={() => setDeletingCustomer(c)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                              Hapus Restoran
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="px-5 py-3 border-t border-border bg-slate-50/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>Menampilkan {filteredCustomers.length} dari {customers.length} restoran</span>
          <span>Sultan Seafood ERP</span>
        </div>
      </div>

      {editingCustomer && (
        <EditCustomerDialog
          customer={editingCustomer}
          open={!!editingCustomer}
          onOpenChange={(open) => {
            if (!open) setEditingCustomer(null);
          }}
        />
      )}

      {deletingCustomer && (
        <ConfirmDialog
          open={!!deletingCustomer}
          onOpenChange={(open) => {
            if (!open) setDeletingCustomer(null);
          }}
          title="Hapus Restoran?"
          description={`Apakah Anda yakin ingin menghapus data restoran "${deletingCustomer.name}"?`}
          confirmLabel="Hapus Restoran"
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
