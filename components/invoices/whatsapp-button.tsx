"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface WhatsAppButtonProps {
  invoice: Invoice;
  customerPhone?: string;
}

export function WhatsAppButton({ invoice, customerPhone }: WhatsAppButtonProps) {
  const handleSendWhatsApp = () => {
    let rawPhone = customerPhone || "081234567890";
    // Clean phone number format
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    const message = `Halo *${invoice.customerName}*,

Berikut rincian Invoice resmi dari *Sultan Seafood*:
📄 *Nomor Invoice*: ${invoice.invoiceNumber ?? "Draft"}
📅 *Tanggal*: ${formatDate(invoice.issueDate)}
💰 *Total Tagihan*: ${formatCurrency(invoice.total)}
⌛ *Jatuh Tempo*: ${invoice.dueDate ? formatDate(invoice.dueDate) : "-"}

Mohon dapat melakukan pembayaran via Transfer Bank:
🏦 *BCA*: 1234567890 a.n. Sultan Seafood

Terima kasih atas kerja samanya! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSendWhatsApp}
      className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
    >
      <MessageCircle className="w-3.5 h-3.5 mr-1.5 fill-emerald-600/20 text-emerald-600" />
      Kirim ke WhatsApp
    </Button>
  );
}
