"use client";

import Link from "next/link";
import { Boxes, History, Scale, Tags } from "lucide-react";
import { AddCustomerPriceDialog } from "@/components/pricing/add-customer-price-dialog";
import { AddProductDialog } from "@/components/products/add-product-dialog";
import { AddStockReceiptDialog } from "@/components/stock/add-stock-receipt-dialog";
import { SellingPriceTable } from "@/components/pricing/selling-price-table";
import { StockTable } from "@/components/stock/stock-table";
import { StockWeightDifferenceTable } from "@/components/stock/stock-weight-difference-table";
import type { Customer, CustomerPrice, Product, StockBalance, StockMovement, StockWeightDifference, Supplier } from "@/types";

export type StockTab = "stock" | "movements" | "weight-differences" | "selling-prices";

const tabs: Array<{ id: StockTab; label: string; icon: typeof Boxes }> = [
  { id: "stock", label: "Produk & Stok", icon: Boxes },
  { id: "movements", label: "Mutasi Stok", icon: History },
  { id: "weight-differences", label: "Selisih Timbangan", icon: Scale },
  { id: "selling-prices", label: "Harga Jual", icon: Tags },
];

interface StockTabsProps {
  activeTab: StockTab;
  balances?: StockBalance[];
  balancesTotal?: number;
  movements?: StockMovement[];
  movementsTotal?: number;
  weightDifferences?: StockWeightDifference[];
  weightDifferencesTotal?: number;
  weightDifferencesTotalDifference?: number;
  weightDifferencesTotalValue?: number;
  products?: Product[];
  suppliers?: Supplier[];
  customers?: Customer[];
  customerPrices?: CustomerPrice[];
  page: number;
  pageSize: number;
  query: string;
  stockStatus: string;
  productStatus: string;
  sortKey: string;
  sortDir: "asc" | "desc";
}

export function StockTabs(props: StockTabsProps) {
  const { activeTab } = props;
  const activeProducts = (props.products ?? []).filter((product) => product.status === "ACTIVE");
  const activeCustomers = (props.customers ?? []).filter((customer) => customer.status === "ACTIVE");
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section className="space-y-4">
      <div className="erp-surface overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-stone-200 p-2" role="tablist" aria-label="Data stok dan harga">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/stock?tab=${tab.id}`}
                role="tab"
                aria-selected={selected}
                scroll={false}
                className={`flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors sm:px-4 ${selected ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" aria-label={active.label}>
        {activeTab === "stock" && (
          <>
            <div className="mb-4 flex flex-wrap justify-end gap-2"><AddProductDialog /><AddStockReceiptDialog products={props.products ?? []} suppliers={props.suppliers ?? []} /></div>
            <StockTable
              key={`balances|${props.query}|${props.stockStatus}|${props.productStatus}|${props.sortKey}|${props.sortDir}`}
              view="balances"
              balances={props.balances ?? []}
              products={props.products ?? []}
              total={props.balancesTotal ?? 0}
              page={props.page}
              pageSize={props.pageSize}
              tab={activeTab}
              search={props.query}
              stockStatus={props.stockStatus}
              productStatus={props.productStatus}
              sortKey={props.sortKey}
              sortDir={props.sortDir}
            />
          </>
        )}
        {activeTab === "movements" && (
          <StockTable view="movements" movements={props.movements ?? []} total={props.movementsTotal ?? 0} page={props.page} pageSize={props.pageSize} tab={activeTab} />
        )}
        {activeTab === "weight-differences" && (
          <StockWeightDifferenceTable
            rows={props.weightDifferences ?? []}
            total={props.weightDifferencesTotal ?? 0}
            totalDifference={props.weightDifferencesTotalDifference ?? 0}
            totalEstimatedStockValue={props.weightDifferencesTotalValue ?? 0}
            page={props.page}
            pageSize={props.pageSize}
          />
        )}
        {activeTab === "selling-prices" && (
          <>
            <div className="mb-4 flex justify-end"><AddCustomerPriceDialog products={activeProducts} customers={activeCustomers} /></div>
            <SellingPriceTable products={activeProducts} customers={activeCustomers} customPrices={props.customerPrices ?? []} />
          </>
        )}
      </div>
    </section>
  );
}
