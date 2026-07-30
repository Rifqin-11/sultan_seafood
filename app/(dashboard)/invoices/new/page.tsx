import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Buat Invoice",
};

export default function NewInvoicePage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/invoices"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Buat Invoice</h2>
          <p className="text-sm text-muted-foreground">
            Buat invoice baru untuk restoran
          </p>
        </div>
      </div>

      <InvoiceForm />
    </div>
  );
}
