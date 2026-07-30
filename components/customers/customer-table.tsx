"use client";

import { useState } from "react";
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
import { MoreHorizontal, Edit, Power, Trash2, Tag, Loader2 } from "lucide-react";
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

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Nama Restoran</TableHead>
                <TableHead className="text-xs font-semibold">PIC</TableHead>
                <TableHead className="text-xs font-semibold">Telepon</TableHead>
                <TableHead className="text-xs font-semibold">Termin</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {c.billingAddress}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.contactName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.phone}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.paymentTermDays} hari
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={c.status === "ACTIVE" ? "default" : "secondary"}
                      className="text-[11px]"
                    >
                      {c.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        aria-label="Aksi restoran"
                      >
                        {loadingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <MoreHorizontal className="w-4 h-4" />
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setEditingCustomer(c)}
                        >
                          <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          Edit Restoran
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Link href="/pricing/selling" className="flex items-center w-full">
                            <Tag className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Harga Khusus
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => handleToggleStatus(c)}
                        >
                          <Power className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          {c.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-600"
                          onClick={() => setDeletingCustomer(c)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                          Hapus Restoran
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
            {customers.length} restoran
          </p>
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
    </>
  );
}
