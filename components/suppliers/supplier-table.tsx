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
import { MoreHorizontal, Edit, Power, Trash2, Loader2, DollarSign } from "lucide-react";
import { toggleSupplierStatusAction, deleteSupplierAction } from "@/lib/actions/suppliers";
import { EditSupplierDialog } from "./edit-supplier-dialog";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SupplierTableProps {
  suppliers: Supplier[];
}

export function SupplierTable({ suppliers }: SupplierTableProps) {
  const router = useRouter();
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleStatus = (supplier: Supplier) => {
    setTimeout(async () => {
      setLoadingId(supplier.id);
      const res = await toggleSupplierStatusAction(supplier.id, supplier.status);
      setLoadingId(null);
      if (res.error) alert(`Gagal: ${res.error}`);
      router.refresh();
    }, 50);
  };

  const handleDelete = (supplier: Supplier) => {
    setTimeout(async () => {
      if (confirm(`Apakah Anda yakin ingin menghapus supplier "${supplier.name}"?`)) {
        setLoadingId(supplier.id);
        const res = await deleteSupplierAction(supplier.id);
        setLoadingId(null);
        if (res.error) {
          alert(`Gagal menghapus: ${res.error}`);
        } else if (res.message) {
          alert(res.message);
        }
        router.refresh();
      }
    }, 50);
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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm">{s.contactName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.phone}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {s.address}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={s.status === "ACTIVE" ? "default" : "secondary"}
                      className="text-[11px]"
                    >
                      {s.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
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
                          onClick={() => handleDelete(s)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                          Hapus Supplier
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {suppliers.length} supplier
          </p>
        </div>
      </div>

      {editingSupplier && (
        <EditSupplierDialog
          supplier={editingSupplier}
          open={!!editingSupplier}
          onOpenChange={(open) => {
            if (!open) setEditingSupplier(null);
          }}
        />
      )}
    </>
  );
}
