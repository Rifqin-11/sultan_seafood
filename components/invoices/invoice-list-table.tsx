"use client";

import { useState } from "react";
import { mockInvoices } from "@/lib/mock-data";
import {
  formatCurrency,
  formatDateShort,
  getInvoiceStatusLabel,
} from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";
import {
  Search,
  MoreHorizontal,
  FileText,
  Download,
  Eye,
  CreditCard,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { handleDownloadInvoicePdf } from "./invoice-pdf-download";

import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { deleteInvoiceAction, voidInvoiceAction } from "@/lib/actions/invoices";
import { useRouter } from "next/navigation";
import { Trash2, Ban } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

const STATUS_FILTERS: { label: string; value: InvoiceStatus | "ALL" }[] = [
  { label: "Semua", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Diterbitkan", value: "ISSUED" },
  { label: "Dibayar Sebagian", value: "PARTIALLY_PAID" },
  { label: "Lunas", value: "PAID" },
  { label: "Jatuh Tempo", value: "OVERDUE" },
];

interface InvoiceListTableProps {
  initialInvoices?: Invoice[];
}

export function InvoiceListTable({ initialInvoices }: InvoiceListTableProps) {
  const router = useRouter();
  const invoicesList = initialInvoices && initialInvoices.length > 0 ? initialInvoices : mockInvoices;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">(
    "ALL"
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);
  const [selectedPaymentInvoiceId, setSelectedPaymentInvoiceId] = useState<string | null>(null);

  const handleConfirmDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    const res = await deleteInvoiceAction(deletingInvoice.id);
    if (res.error) {
      toast.error(`Gagal menghapus: ${res.error}`);
    } else {
      toast.success(res.message || "Invoice berhasil dihapus");
      router.refresh();
    }
  };

  const handleConfirmVoidInvoice = async () => {
    if (!voidingInvoice) return;
    const res = await voidInvoiceAction(voidingInvoice.id);
    if (res.error) {
      toast.error(`Gagal membatalkan: ${res.error}`);
    } else {
      toast.success(res.message || "Invoice berhasil dibatalkan");
      router.refresh();
    }
  };

  const handleDownload = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    await handleDownloadInvoicePdf(inv);
    setDownloadingId(null);
  };

  const filtered = invoicesList.filter((inv) => {
    const matchSearch =
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.invoiceNumber ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nomor invoice atau restoran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                statusFilter === f.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
              {f.value !== "ALL" && (
                <span className="ml-1.5 opacity-60">
                  {invoicesList.filter((i) => i.status === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Tidak ada invoice"
          description="Coba ubah filter atau kata kunci pencarian."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Nomor Invoice</TableHead>
                <TableHead className="text-xs font-semibold">Restoran</TableHead>
                <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold">Jatuh Tempo</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                <TableHead className="text-xs font-semibold text-right">Dibayar</TableHead>
                <TableHead className="text-xs font-semibold text-right">Sisa</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/20">
                  <TableCell>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm font-mono font-medium text-foreground hover:underline"
                    >
                      {inv.invoiceNumber ?? (
                        <span className="text-muted-foreground italic text-xs">
                          Draft
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {inv.customerName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateShort(inv.issueDate)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inv.dueDate ? (
                      <span
                        className={
                          inv.status === "OVERDUE" ? "text-red-600 font-medium" : ""
                        }
                      >
                        {formatDateShort(inv.dueDate)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                    {inv.totalPaid > 0 ? formatCurrency(inv.totalPaid) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {inv.remainingBalance > 0 ? (
                      <span
                        className={
                          inv.status === "OVERDUE"
                            ? "text-red-600 font-semibold"
                            : "font-medium"
                        }
                      >
                        {formatCurrency(inv.remainingBalance)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Lunas</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Aksi invoice"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem>
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="flex items-center w-full"
                          >
                            <Eye className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Lihat Detail
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownload(inv)}
                          disabled={downloadingId === inv.id}
                          className="cursor-pointer"
                        >
                          {downloadingId === inv.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          )}
                          {downloadingId === inv.id ? "Menyiapkan PDF..." : "Download PDF"}
                        </DropdownMenuItem>
                        {(inv.status === "ISSUED" ||
                          inv.status === "PARTIALLY_PAID" ||
                          inv.status === "OVERDUE") && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setSelectedPaymentInvoiceId(inv.id)}
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-2" />
                            Catat Pembayaran
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {inv.status === "DRAFT" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={() => setDeletingInvoice(inv)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                            Hapus Draft
                          </DropdownMenuItem>
                        )}
                        {inv.status !== "VOID" && inv.status !== "DRAFT" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={() => setVoidingInvoice(inv)}
                          >
                            <Ban className="w-3.5 h-3.5 mr-2 text-red-600" />
                            Batalkan Invoice
                          </DropdownMenuItem>
                        )}
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
          {filtered.length} dari {invoicesList.length} invoice
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm" disabled>
            Berikutnya
          </Button>
        </div>
      </div>

      {selectedPaymentInvoiceId && (
        <RecordPaymentDialog
          defaultInvoiceId={selectedPaymentInvoiceId}
          invoices={invoicesList}
          open={!!selectedPaymentInvoiceId}
          onOpenChange={(open) => {
            if (!open) setSelectedPaymentInvoiceId(null);
          }}
        />
      )}

      {deletingInvoice && (
        <ConfirmDialog
          open={!!deletingInvoice}
          onOpenChange={(open) => {
            if (!open) setDeletingInvoice(null);
          }}
          title="Hapus Draft Invoice?"
          description={`Apakah Anda yakin ingin menghapus draft invoice "${deletingInvoice.invoiceNumber || deletingInvoice.id}"?`}
          confirmLabel="Hapus Invoice"
          onConfirm={handleConfirmDeleteInvoice}
        />
      )}

      {voidingInvoice && (
        <ConfirmDialog
          open={!!voidingInvoice}
          onOpenChange={(open) => {
            if (!open) setVoidingInvoice(null);
          }}
          title="Batalkan Invoice?"
          description={`Apakah Anda yakin ingin membatalkan invoice "${voidingInvoice.invoiceNumber || voidingInvoice.id}"? Status akan diubah menjadi VOID.`}
          confirmLabel="Batalkan Invoice"
          onConfirm={handleConfirmVoidInvoice}
        />
      )}
    </div>
  );
}
