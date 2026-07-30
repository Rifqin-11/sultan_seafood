import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { mockProducts, mockCustomers } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Harga Jual Restoran",
};

export default function SellingPricingPage() {
  const activeProducts = mockProducts.filter((p) => p.status === "ACTIVE");
  const activeCustomers = mockCustomers.filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Harga Jual Restoran"
        description="Harga khusus per produk untuk setiap restoran"
      >
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Tambah Harga Khusus
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold sticky left-0 bg-muted/30">
                  Produk
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Harga Default
                </TableHead>
                {activeCustomers.map((c) => (
                  <TableHead
                    key={c.id}
                    className="text-xs font-semibold text-right"
                  >
                    {c.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeProducts.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-medium sticky left-0 bg-white">
                    <div>
                      <p>{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        per {p.defaultUnit}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {p.defaultSellingPrice
                      ? formatCurrency(p.defaultSellingPrice)
                      : "—"}
                  </TableCell>
                  {activeCustomers.map((c) => (
                    <TableCell
                      key={c.id}
                      className="text-right text-sm text-muted-foreground tabular-nums"
                    >
                      {/* In real app: look up customer-specific price */}—
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
