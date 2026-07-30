"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface WhatsAppButtonProps {
  invoice: Invoice;
  customerPhone?: string;
}

export function WhatsAppButton({ invoice, customerPhone }: WhatsAppButtonProps) {
  const handleSendWhatsApp = () => {
    // 1. Format phone number
    let rawPhone = customerPhone || "081234567890";
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    // 2. Build public preview link
    let origin = typeof window !== "undefined" ? window.location.origin : "";
    if (process.env.NEXT_PUBLIC_APP_URL) {
      origin = process.env.NEXT_PUBLIC_APP_URL;
    }
    // Force HTTP for localhost/127.0.0.1 in local development to avoid Safari HTTPS upgrade error
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      origin = origin.replace(/^https:\/\//, "http://");
    }
    const previewUrl = `${origin}/preview/invoices/${invoice.id}`;

    // 3. Format message cleanly with online invoice link
    const customerName = invoice.customerName || "Pelanggan";
    const invoiceNum = invoice.invoiceNumber ?? "Draft";
    const dateStr = formatDate(invoice.issueDate);
    const totalStr = formatCurrency(invoice.total);
    const dueDateStr = invoice.dueDate ? formatDate(invoice.dueDate) : "-";

    const messageLines = [
      `Halo *${customerName}*,\n`,
      `Berikut rincian Invoice resmi dari *Sultan Seafood*:`,
      `-  *Nomor Invoice*: ${invoiceNum}`,
      `-  *Tanggal*: ${dateStr}`,
      `-  *Total Tagihan*: ${totalStr}`,
      `-  *Jatuh Tempo*: ${dueDateStr}\n`,
      `- *Lihat & Download PDF Invoice Online*:`,
      `${previewUrl}\n`,
      `Mohon dapat melakukan pembayaran via Transfer Bank:`,
      `- *BCA*: 1234567890 a.n. Sultan Seafood\n`,
      `Terima kasih atas kerja samanya! 🙏`
    ];

    const message = messageLines.join("\n");
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    // 4. Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank");

    toast.success("Membuka WhatsApp dengan Link Invoice Online!", {
      duration: 3000,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSendWhatsApp}
      className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
    >
      <MessageCircle className="w-3.5 h-3.5 mr-1.5 fill-emerald-600/20 text-emerald-600" />
      Kirim ke WhatsApp
    </Button>
  );
}
