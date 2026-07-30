"use client";

import { useState } from "react";
import { mockProducts } from "@/lib/mock-data";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Product } from "@/types";
import { Search, MoreHorizontal, Edit, Power, Trash2, Loader2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { toggleProductStatusAction, deleteProductAction } from "@/lib/actions/products";
import { EditProductDialog } from "./edit-product-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProductTableProps {
  initialProducts?: Product[];
}

export function ProductTable({ initialProducts }: ProductTableProps) {
  const productsList = initialProducts && initialProducts.length > 0 ? initialProducts : mockProducts;
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleStatus = async (product: Product) => {
    setLoadingId(product.id);
    const res = await toggleProductStatusAction(product.id, product.status);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal: ${res.error}`);
    } else {
      toast.success(res.message || "Status produk berhasil diperbarui");
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setLoadingId(deletingProduct.id);
    const res = await deleteProductAction(deletingProduct.id);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal menghapus: ${res.error}`);
    } else {
      toast.success(res.message || "Produk berhasil dihapus");
      router.refresh();
    }
  };

  const filtered = productsList.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s === "ALL" ? "Semua" : s === "ACTIVE" ? "Aktif" : "Nonaktif"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Tidak ada produk"
            description="Coba ubah kata kunci pencarian atau filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold">ID Produk</TableHead>
                  <TableHead className="text-xs font-semibold">Nama Produk</TableHead>
                  <TableHead className="text-xs font-semibold">Kategori</TableHead>
                  <TableHead className="text-xs font-semibold">Ukuran / Size</TableHead>
                  <TableHead className="text-xs font-semibold">Satuan</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Harga Beli
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Harga Jual
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Margin
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {product.id.includes("-") ? product.id.split("-")[0] : product.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.category}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.size ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {product.size}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.defaultUnit}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {product.activeCost
                        ? formatCurrency(product.activeCost)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {product.defaultSellingPrice
                        ? formatCurrency(product.defaultSellingPrice)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {product.estimatedMargin != null ? (
                        <span
                          className={
                            product.estimatedMargin >= 20
                              ? "text-emerald-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {formatPercent(product.estimatedMargin)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          product.status === "ACTIVE" ? "default" : "secondary"
                        }
                        className="text-[11px]"
                      >
                        {product.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          aria-label="Aksi produk"
                        >
                          {loadingId === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setEditingProduct(product)}
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Edit Produk
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleToggleStatus(product)}
                          >
                            <Power className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            {product.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={() => setDeletingProduct(product)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                            Hapus Produk
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {filtered.length} dari {productsList.length} produk
          </p>
        </div>
      </div>

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => {
            if (!open) setEditingProduct(null);
          }}
        />
      )}

      {deletingProduct && (
        <ConfirmDialog
          open={!!deletingProduct}
          onOpenChange={(open) => {
            if (!open) setDeletingProduct(null);
          }}
          title="Hapus Produk?"
          description={`Apakah Anda yakin ingin menghapus produk "${deletingProduct.name}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Hapus Produk"
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
