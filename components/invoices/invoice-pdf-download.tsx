"use client";

import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoicePdfDocument } from "./invoice-pdf-document";
import type { Invoice } from "@/types";

interface InvoicePdfDownloadProps {
  invoice: Invoice;
}

export function InvoicePdfDownload({ invoice }: InvoicePdfDownloadProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Download PDF
      </Button>
    );
  }

  const fileName = `Invoice_${invoice.invoiceNumber?.replace(/\//g, "-") ?? "Draft"}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoicePdfDocument invoice={invoice} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1.5" />
          )}
          {loading ? "Menyiapkan PDF..." : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
