"use client";

import { useState } from "react";
import type { Supplier } from "@/types";
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
import { EmptyState } from "@/components/ui/empty-state";
import { MoreHorizontal, Edit, Power, Trash2, Loader2, DollarSign, Users } from "lucide-react";
import { toggleSupplierStatusAction, deleteSupplierAction } from "@/lib/actions/suppliers";
import { EditSupplierDialog } from "./edit-supplier-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface SupplierTableProps {
  suppliers: Supplier[];
  canManage?: boolean;
}

export function SupplierTable({ suppliers, canManage = false }: SupplierTableProps) {
  const router = useRouter();
  const [suppliersList, setSuppliersList] = useState<Supplier[]>(suppliers);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleStatus = async (supplier: Supplier) => {
    setLoadingId(supplier.id);
    const res = await toggleSupplierStatusAction(supplier.id, supplier.status);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal: ${res.error}`);
    } else {
      toast.success(res.message || "Status supplier berhasil diperbarui");
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSupplier) return;
    const idToDelete = deletingSupplier.id;
    setLoadingId(idToDelete);

    // Optimistic update
    setSuppliersList((prev) => prev.filter((s) => s.id !== idToDelete));
    setDeletingSupplier(null);

    const res = await deleteSupplierAction(idToDelete);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal menghapus: ${res.error}`);
      // Revert optimistic update
      setSuppliersList(suppliers);
    } else {
      toast.success(res.message || "Supplier berhasil dihapus");
      if (res.isWarning) {
        // If warning, status was changed instead of deleted, so we should refresh
        router.refresh();
      } else {
        router.refresh();
      }
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Nama Supplier</TableHead>
                <TableHead className="text-xs font-semibold">Kontak</TableHead>
                <TableHead className="text-xs font-semibold">Telepon</TableHead>
                <TableHead className="text-xs font-semibold">Alamat</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                {canManage && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliersList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48">
                    <EmptyState
                      icon={Users}
                      title="Tidak ada supplier"
                      description="Belum ada data supplier yang terdaftar."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                suppliersList.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.contactName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.phone}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {s.address}
                    </TableCell>
                    {canManage && <TableCell>
                      <Badge
                        variant={s.status === "ACTIVE" ? "default" : "secondary"}
                        className="text-[11px]"
                      >
                        {s.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          aria-label="Aksi supplier"
                        >
                          {loadingId === s.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setEditingSupplier(s)}
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Edit Supplier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Link href="/pricing/purchase" className="flex items-center w-full">
                              <DollarSign className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                              Riwayat Harga
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleToggleStatus(s)}
                          >
                            <Power className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            {s.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={() => setDeletingSupplier(s)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                            Hapus Supplier
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {suppliersList.length} supplier
          </p>
        </div>
      </div>

      {canManage && editingSupplier && (
        <EditSupplierDialog
          supplier={editingSupplier}
          open={!!editingSupplier}
          onOpenChange={(open) => {
            if (!open) setEditingSupplier(null);
          }}
        />
      )}

      {deletingSupplier && (
        <ConfirmDialog
          open={!!deletingSupplier}
          onOpenChange={(open) => {
            if (!open) setDeletingSupplier(null);
          }}
          title="Hapus Supplier?"
          description={`Apakah Anda yakin ingin menghapus data supplier "${deletingSupplier.name}"?`}
          confirmLabel="Hapus Supplier"
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
