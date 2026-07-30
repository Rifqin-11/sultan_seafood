import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { mockProducts, mockProductCosts } from "@/lib/mock-data";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Harga Beli",
};

export default function PurchasePricingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Harga Beli"
        description="Riwayat harga beli produk dari supplier"
      >
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Tambah Harga Beli
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-amber-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-200 bg-amber-50/50 flex items-center gap-2">
          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200">
            Internal
          </span>
          <p className="text-xs text-amber-700">
            Data harga beli bersifat rahasia dan tidak tampil pada invoice pelanggan
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Produk</TableHead>
                <TableHead className="text-xs font-semibold">Supplier</TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Harga Beli
                </TableHead>
                <TableHead className="text-xs font-semibold">Berlaku</TableHead>
                <TableHead className="text-xs font-semibold">Berakhir</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProductCosts.map((cost) => {
                const product = mockProducts.find(
                  (p) => p.id === cost.productId
                );
                const isActive = !cost.endedAt;
                return (
                  <TableRow key={cost.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">
                      {product?.name ?? cost.productId}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cost.supplierName}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(cost.unitCost)} / {product?.defaultUnit}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateShort(cost.effectiveAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cost.endedAt ? formatDateShort(cost.endedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="text-[11px]"
                      >
                        {isActive ? "Aktif" : "Berakhir"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
