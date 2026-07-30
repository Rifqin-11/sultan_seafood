import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getCustomersAction } from "@/lib/actions/customers";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "Restoran / Pelanggan",
};

export default async function CustomersPage() {
  const customers = await getCustomersAction();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Restoran / Pelanggan"
        description="Kelola daftar restoran pelanggan dan termin pembayaran"
      >
        <AddCustomerDialog />
      </PageHeader>

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
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Aksi restoran"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem>Lihat detail</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Harga khusus</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          {c.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
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
    </div>
  );
}
