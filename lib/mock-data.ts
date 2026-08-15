// ─── Mock Data — Sultan Seafood ERP ───

import type {
  Customer,
  DashboardMetrics,
  Expense,
  InternalCostBreakdown,
  Invoice,
  Payment,
  Product,
  ProductCost,
  ProfitDataPoint,
  SalesDataPoint,
  Supplier,
} from "@/types";

// ─── Empty Mock Data (Using Real Database Data Only) ───

export const mockMetrics: DashboardMetrics = {
  ordersToday: 0,
  ordersTodayChange: 0,
  ordersThisWeek: 0,
  ordersThisWeekChange: 0,
  revenueThisMonth: 0,
  revenueThisMonthChange: 0,
  transactionProfitThisMonth: 0,
  transactionMarginThisMonth: 0,
  operatingExpensesThisMonth: 0,
  netProfitThisMonth: 0,
  netMarginThisMonth: 0,
  receivables: 0,
  overdueCount: 0,
  totalDirectCostsThisMonth: 0,
};

export const mockSalesData: SalesDataPoint[] = [];

export const mockProfitData: ProfitDataPoint[] = [];

export const mockInternalCosts: InternalCostBreakdown[] = [];

export const mockProducts: Product[] = [];

export const mockProductCosts: ProductCost[] = [];

export const mockCustomers: Customer[] = [];

export const mockSuppliers: Supplier[] = [];

export const mockInvoices: Invoice[] = [];

export const mockPayments: Payment[] = [];

export const mockExpenses: Expense[] = [];
