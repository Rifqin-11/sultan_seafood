"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { handleDownloadInvoicePdf } from "./invoice-pdf-download";
import { toast } from "sonner";

interface WhatsAppButtonProps {
  invoice: Invoice;
  customerPhone?: string;
}

export function WhatsAppButton({ invoice, customerPhone }: WhatsAppButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSendWhatsApp = async () => {
    setLoading(true);

    // 1. Download the Invoice PDF automatically
    try {
      toast.info("Mengunduh PDF Invoice & menyiapkan WhatsApp...", { duration: 3000 });
      await handleDownloadInvoicePdf(invoice);
    } catch (err) {
      console.error("Gagal mendownload PDF untuk WhatsApp:", err);
    }

    // 2. Format phone number
    let rawPhone = customerPhone || "081234567890";
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    // 3. Clean template string with reliable formatting (no broken Unicode characters)
    const customerName = invoice.customerName || "Pelanggan";
    const invoiceNum = invoice.invoiceNumber ?? "Draft";
    const dateStr = formatDate(invoice.issueDate);
    const totalStr = formatCurrency(invoice.total);
    const dueDateStr = invoice.dueDate ? formatDate(invoice.dueDate) : "-";

    const messageLines = [
      `Halo *${customerName}*,\n`,
      `Berikut rincian Invoice resmi dari *Sultan Seafood*:`,
      `📋 *Nomor Invoice*: ${invoiceNum}`,
      `🗓 *Tanggal*: ${dateStr}`,
      `💰 *Total Tagihan*: ${totalStr}`,
      `⌛ *Jatuh Tempo*: ${dueDateStr}\n`,
      `Mohon dapat melakukan pembayaran via Transfer Bank:`,
      `💳 *BCA*: 1234567890 a.n. Sultan Seafood\n`,
      `Terima kasih atas kerja samanya! 🙏`
    ];

    const message = messageLines.join("\n");
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    // 4. Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank");
    setLoading(false);

    toast.success("PDF Invoice terunduh! Lampirkan (📎) file di WhatsApp Web.", {
      duration: 5000,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSendWhatsApp}
      disabled={loading}
      className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600" />
      ) : (
        <MessageCircle className="w-3.5 h-3.5 mr-1.5 fill-emerald-600/20 text-emerald-600" />
      )}
      {loading ? "Menyiapkan WA..." : "Kirim ke WhatsApp"}
    </Button>
  );
}
