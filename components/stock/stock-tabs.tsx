"use client";

import { useState } from "react";
import { Boxes, History, Tags } from "lucide-react";
import { AddCustomerPriceDialog } from "@/components/pricing/add-customer-price-dialog";
import { AddProductDialog } from "@/components/products/add-product-dialog";
import { AddStockReceiptDialog } from "@/components/stock/add-stock-receipt-dialog";
import { SellingPriceTable } from "@/components/pricing/selling-price-table";
import { StockTable } from "@/components/stock/stock-table";
import type { Customer, CustomerPrice, Product, StockBalance, StockBatch, StockMovement, Supplier } from "@/types";

type StockTab = "stock" | "movements" | "selling-prices";

interface StockTabsProps {
  balances: StockBalance[];
  movements: StockMovement[];
  batches: StockBatch[];
  customerPrices: CustomerPrice[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
}

const tabs: Array<{ id: StockTab; label: string; icon: typeof Boxes }> = [
  { id: "stock", label: "Produk & Stok", icon: Boxes },
  { id: "movements", label: "Mutasi Stok", icon: History },
  { id: "selling-prices", label: "Harga Jual", icon: Tags },
];

export function StockTabs({ balances, movements, batches, customerPrices, products, customers, suppliers }: StockTabsProps) {
  const [activeTab, setActiveTab] = useState<StockTab>("stock");
  const activeProducts = products.filter((product) => product.status === "ACTIVE");
  const activeCustomers = customers.filter((customer) => customer.status === "ACTIVE");
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section className="space-y-4">
      <div className="erp-surface overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-stone-200 p-2" role="tablist" aria-label="Data stok dan harga">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors sm:px-4 ${selected ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" aria-label={active.label}>
        {activeTab === "stock" && <><div className="mb-4 flex flex-wrap justify-end gap-2"><AddProductDialog /><AddStockReceiptDialog products={products} suppliers={suppliers} /></div><StockTable balances={balances} movements={movements} batches={batches} products={products} view="balances" /></>}
        {activeTab === "movements" && <StockTable balances={balances} movements={movements} view="movements" />}
        {activeTab === "selling-prices" && <><div className="mb-4 flex justify-end"><AddCustomerPriceDialog products={activeProducts} customers={activeCustomers} /></div><SellingPriceTable products={activeProducts} customers={activeCustomers} customPrices={customerPrices} /></>}
      </div>
    </section>
  );
}
