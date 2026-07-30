"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mockCustomers, mockProducts } from "@/lib/mock-data";
import {
  formatCurrency,
  calculateInvoice,
  formatPercent,
  getDirectCostLabel,
} from "@/lib/utils";
import type { DirectCostCategory } from "@/types";
import { cn } from "@/lib/utils";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { useRouter } from "next/navigation";

interface InvoiceItemRow {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
}

interface DirectCostRow {
  id: string;
  category: DirectCostCategory;
  name: string;
  amount: number;
  notes: string;
}

const DIRECT_COST_CATEGORIES: DirectCostCategory[] = [
  "PACKAGING",
  "ICE",
  "SHIPPING",
  "FUEL",
  "TOLL",
  "PARKING",
  "COURIER",
  "PRODUCT_LOSS",
  "OTHER",
];

export function InvoiceForm() {
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);

  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [costs, setCosts] = useState<DirectCostRow[]>([]);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const selectedCustomer = mockCustomers.find((c) => c.id === customerId);

  // Auto-fill due date from payment terms
  useEffect(() => {
    if (selectedCustomer && issueDate) {
      const date = new Date(issueDate);
      date.setDate(date.getDate() + selectedCustomer.paymentTermDays);
      setDueDate(date.toISOString().slice(0, 10));
    }
  }, [customerId, issueDate, selectedCustomer]);

  // Add item
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        productId: "",
        description: "",
        quantity: 1,
        unit: "kg",
        sellingPrice: 0,
        purchasePrice: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof InvoiceItemRow,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "productId") {
          const product = mockProducts.find((p) => p.id === value);
          if (product) {
            return {
              ...item,
              productId: value as string,
              description: product.size ? `${product.name} (${product.size})` : product.name,
              unit: product.defaultUnit,
              sellingPrice: product.defaultSellingPrice ?? 0,
              purchasePrice: product.activeCost ?? 0,
            };
          }
        }
        return { ...item, [field]: value };
      })
    );
  };

  // Add cost
  const addCost = () => {
    setCosts((prev) => [
      ...prev,
      {
        id: `cost_${Date.now()}`,
        category: "PACKAGING",
        name: "",
        amount: 0,
        notes: "",
      },
    ]);
  };

  const removeCost = (id: string) => {
    setCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCost = (
    id: string,
    field: keyof DirectCostRow,
    value: string | number
  ) => {
    setCosts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Calculations
  const calc = calculateInvoice(
    items.map((i) => ({
      quantity: i.quantity,
      sellingPrice: i.sellingPrice,
      purchasePrice: i.purchasePrice,
    })),
    costs.map((c) => ({ amount: c.amount })),
    discount
  );

  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const submitInvoice = async (status: "DRAFT" | "ISSUED") => {
    if (!customerId || items.length === 0) return;
    setSubmitting(true);
    const res = await createInvoiceAction({
      customerId,
      issueDate,
      dueDate,
      notes,
      discount,
      status,
      items: items.map((i) => ({
        productId: i.productId,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        sellingPrice: i.sellingPrice,
        purchasePrice: i.purchasePrice,
      })),
      costs: costs.map((c) => ({
        category: c.category,
        name: c.name,
        amount: c.amount,
        notes: c.notes,
      })),
    });

    setSubmitting(false);
    if (res.success) {
      router.push("/invoices");
    }
  };

  const handleSaveDraft = async () => {
    setSaveState("saving");
    await submitInvoice("DRAFT");
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  };

  const handlePublish = async () => {
    setPublishDialogOpen(false);
    await submitInvoice("ISSUED");
  };

  return (
    <div className="flex gap-6 items-start">
      {/* Left Panel — Main Form */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Informasi Pelanggan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Restoran <span className="text-red-500">*</span>
              </label>
              <Select value={customerId} onValueChange={(v) => setCustomerId(v || "")}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih restoran..." />
                </SelectTrigger>
                <SelectContent>
                  {mockCustomers
                    .filter((c) => c.status === "ACTIVE")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && (
              <div className="sm:col-span-2 p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  Kontak: {selectedCustomer.contactName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Alamat: {selectedCustomer.billingAddress}
                </p>
                <p className="text-xs text-muted-foreground">
                  Termin: {selectedCustomer.paymentTermDays} hari
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Tanggal Invoice
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Jatuh Tempo
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Item Produk
            </h3>
            <Button onClick={addItem} size="sm" variant="outline">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Tambah Item
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                Belum ada item. Klik &quot;Tambah Item&quot; untuk mulai.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5 min-w-[200px]">
                      Produk
                    </th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2.5 w-20">
                      Qty
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2.5 w-20">
                      Satuan
                    </th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2.5 w-32">
                      Harga Jual
                    </th>
                    <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2.5 w-32">
                      Subtotal
                    </th>
                    <th className="w-10 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <Select
                          value={item.productId}
                          onValueChange={(v) =>
                            updateItem(item.id, "productId", v || "")
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Pilih produk..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mockProducts
                              .filter((p) => p.status === "ACTIVE")
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} {p.size ? `[${p.size}]` : ""}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-xs text-right w-full"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(item.id, "unit", e.target.value)
                          }
                          className="h-8 text-xs w-full"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.sellingPrice}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "sellingPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 text-xs text-right w-full"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                        {formatCurrency(item.quantity * item.sellingPrice)}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Discount row */}
          {items.length > 0 && (
            <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Diskon (Rp)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) =>
                    setDiscount(parseFloat(e.target.value) || 0)
                  }
                  className="h-8 text-xs w-36 text-right"
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="text-base font-bold tabular-nums">
                  {formatCurrency(calc.revenue)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Internal costs panel */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">
                Biaya Internal
              </h3>
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200">
                Tidak tampil di invoice pelanggan
              </span>
            </div>
            <Button
              onClick={addCost}
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Plus className="w-3 h-3 mr-1" />
              Tambah
            </Button>
          </div>

          {costs.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">
                Belum ada biaya internal (packaging, ongkir, dll.)
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {costs.map((cost) => (
                <div key={cost.id} className="flex items-center gap-3 px-5 py-3">
                  <Select
                    value={cost.category}
                    onValueChange={(v) =>
                      updateCost(cost.id, "category", v as DirectCostCategory)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-36 flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECT_COST_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {getDirectCostLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Nama biaya"
                    value={cost.name}
                    onChange={(e) => updateCost(cost.id, "name", e.target.value)}
                    className="h-8 text-xs flex-1"
                  />

                  <div className="relative flex-shrink-0 w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      Rp
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={cost.amount}
                      onChange={(e) =>
                        updateCost(
                          cost.id,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 text-xs pl-8 text-right"
                    />
                  </div>

                  <button
                    onClick={() => removeCost(cost.id)}
                    className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Hapus biaya"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-border shadow-card p-5">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Catatan
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan untuk pelanggan (opsional)..."
            rows={3}
            className="w-full text-sm resize-none border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Button variant="outline" onClick={handleSaveDraft} size="sm">
            {saveState === "saving" ? (
              "Menyimpan..."
            ) : saveState === "saved" ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Tersimpan
              </span>
            ) : (
              "Simpan Draft"
            )}
          </Button>
          <Button variant="outline" size="sm">
            Preview
          </Button>
          <Button
            onClick={() => setPublishDialogOpen(true)}
            size="sm"
            disabled={!customerId || items.length === 0}
          >
            Terbitkan Invoice
          </Button>
        </div>
      </div>

      {/* Right Panel — Internal Summary (sticky) */}
      <div className="w-72 flex-shrink-0 sticky top-24 space-y-4">
        <div className="bg-white rounded-2xl border border-border shadow-card p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Ringkasan Internal
            </h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal Produk</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(calc.subtotal)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diskon</span>
                <span className="font-medium text-red-600 tabular-nums">
                  -{formatCurrency(discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Pendapatan</span>
              <span className="tabular-nums">
                {formatCurrency(calc.revenue)}
              </span>
            </div>

            <div className="h-px bg-border my-2" />

            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                HPP Produk
                <Lock className="w-3 h-3 text-amber-500" />
              </span>
              <span className="tabular-nums">
                {formatCurrency(calc.totalProductCost)}
              </span>
            </div>

            {costs.length > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  Biaya Internal
                  <Lock className="w-3 h-3 text-amber-500" />
                </span>
                <span className="tabular-nums">
                  {formatCurrency(calc.totalDirectCost)}
                </span>
              </div>
            )}

            <div className="h-px bg-border my-2" />

            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                Laba Produk
                <Lock className="w-3 h-3 text-amber-500" />
              </span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(calc.productProfit)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                Laba Transaksi
                <Lock className="w-3 h-3 text-amber-500" />
              </span>
              <span className="font-bold tabular-nums">
                {formatCurrency(calc.transactionProfit)}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-3 text-center">
              <p className="text-xs text-emerald-600 mb-0.5">Margin Transaksi</p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                {formatPercent(calc.transactionMargin)}
              </p>
            </div>
          </div>
        </div>

        {/* Validation warnings */}
        {items.length > 0 &&
          items.some((i) => i.purchasePrice === 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Beberapa item belum memiliki harga beli. Harga beli diperlukan
                untuk menerbitkan invoice.
              </p>
            </div>
          )}
      </div>

      {/* Publish confirmation dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terbitkan Invoice?</DialogTitle>
            <DialogDescription>
              Invoice yang diterbitkan akan menyimpan snapshot harga dan tidak
              dapat diedit bebas. Koreksi hanya dapat dilakukan melalui
              pembatalan atau invoice pengganti.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restoran</span>
              <span className="font-medium">
                {selectedCustomer?.name ?? "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{formatCurrency(calc.revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah item</span>
              <span>{items.length} produk</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handlePublish}>Terbitkan Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
