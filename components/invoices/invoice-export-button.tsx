"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCsv } from "@/lib/csv";
import { getInvoiceExportRowsAction } from "@/lib/actions/invoice-export";
import { toast } from "sonner";

/**
 * Exports the full invoice list only when the user asks for it, so the CSV
 * dataset is never part of the initial page payload.
 */
export function InvoiceExportButton() {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const rows = await getInvoiceExportRowsAction();
      if (rows.length === 0) {
        toast.info("Tidak ada invoice untuk diekspor.");
        return;
      }
      const csv = createCsv(
        ["Nomor", "Restoran", "Tanggal", "Status", "Total", "Dibayar", "Sisa"],
        rows.map((row) => [
          row.invoiceNumber,
          row.customerName,
          row.issueDate,
          row.status,
          row.total,
          row.totalPaid,
          row.remainingBalance,
        ])
      );
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "invoice.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengekspor invoice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={download} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
      Ekspor
    </Button>
  );
}
