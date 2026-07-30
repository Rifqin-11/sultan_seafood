import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getSuppliersAction } from "@/lib/actions/suppliers";
import { AddSupplierDialog } from "@/components/suppliers/add-supplier-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const metadata: Metadata = {
  title: "Supplier",
};

export default async function SuppliersPage() {
  const suppliers = await getSuppliersAction();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier"
        description="Kelola daftar supplier seafood dan Nelayan"
      >
        <AddSupplierDialog />
      </PageHeader>

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
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Aksi supplier"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Riwayat harga</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          {s.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
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
    </div>
  );
}
