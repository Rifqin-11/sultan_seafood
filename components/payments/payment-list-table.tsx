"use client";

import { useState } from "react";
import type { Payment, Invoice } from "@/types";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Eye, FileText, Download, CreditCard } from "lucide-react";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";

interface PaymentListTableProps {
  payments: Payment[];
  invoices: Invoice[];
}

export function PaymentListTable({ payments, invoices }: PaymentListTableProps) {
  const [selectedProof, setSelectedProof] = useState<{
    url: string;
    invoiceNumber: string;
    amount: number;
    isPdf: boolean;
  } | null>(null);

  const methodLabel: Record<string, string> = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
    CHECK: "Cek",
    OTHER: "Lainnya",
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Riwayat Pembayaran</h3>
          <RecordPaymentDialog invoices={invoices} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold">Invoice</TableHead>
                <TableHead className="text-xs font-semibold">Metode</TableHead>
                <TableHead className="text-xs font-semibold">Bukti Transfer</TableHead>
                <TableHead className="text-xs font-semibold text-right">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48">
                    <EmptyState
                      icon={CreditCard}
                      title="Tidak ada riwayat pembayaran"
                      description="Belum ada transaksi pembayaran yang tercatat untuk saat ini."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => {
                  const inv = invoices.find((i) => i.id === p.invoiceId);
                  const invNum = inv?.invoiceNumber || p.invoiceId;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/20">
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateShort(p.paymentDate)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-mono font-medium">
                            {invNum}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {inv?.customerName || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {methodLabel[p.method] ?? p.method}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.proofUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedProof({
                                url: p.proofUrl!,
                                invoiceNumber: invNum,
                                amount: p.amount,
                                isPdf: p.proofPath?.toLowerCase().endsWith(".pdf") ?? false,
                              })
                            }
                            className="h-7 text-xs px-2.5 bg-blue-50/50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Lihat Bukti
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">— Tidak Ada —</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums text-emerald-600">
                        +{formatCurrency(p.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {payments.length} transaksi pembayaran
          </p>
        </div>
      </div>

      {/* Proof Viewer Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={(op) => !op && setSelectedProof(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran / Transfer</DialogTitle>
          </DialogHeader>

          {selectedProof && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl text-xs">
                <div>
                  <p className="text-muted-foreground">Nomor Invoice</p>
                  <p className="font-mono font-bold text-foreground">{selectedProof.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Nominal Pembayaran</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(selectedProof.amount)}</p>
                </div>
              </div>

              <div className="border border-border rounded-xl p-2 bg-slate-950/5 min-h-[260px] max-h-[420px] flex items-center justify-center overflow-auto">
                {selectedProof.isPdf ? (
                  <div className="text-center p-6 space-y-3">
                    <FileText className="w-12 h-12 text-blue-600 mx-auto" />
                    <p className="text-xs text-muted-foreground">Dokumen PDF Bukti Pembayaran</p>
                    <a
                      href={selectedProof.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh PDF
                    </a>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedProof.url}
                    alt="Bukti Transfer"
                    className="max-h-[380px] w-auto object-contain rounded-lg shadow-sm"
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
