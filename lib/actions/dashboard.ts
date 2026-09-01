"use server";

import { createClient } from "@/lib/supabase/server";
import { getInvoicesAction } from "@/lib/actions/invoices";
import { getExpensesAction } from "@/lib/actions/expenses";
import { getApprovedUser, requireApprovedUser } from "@/lib/security/auth";
import { getDirectCostLabel } from "@/lib/utils";
import { getReportPeriodRange, getTodayJakarta, normalizeReportPeriod } from "@/lib/report-period";
import type { DashboardMetrics, DirectCostCategory, InternalCostBreakdown, ProfitDataPoint, SalesDataPoint } from "@/types";

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export async function getDashboardDataAction(periodParam?: string) {
  const user = await requireApprovedUser();
  const [invoices, expenses] = await Promise.all([
    getInvoicesAction(),
    user.role === "STAFF" ? Promise.resolve([]) : getExpensesAction(),
  ]);
  const today = getTodayJakarta();
  const period = normalizeReportPeriod(periodParam);
  const periodDates = getReportPeriodRange(period, today, [...invoices.map((invoice) => invoice.issueDate), ...expenses.map((expense) => expense.expenseDate)]);
  const selectedStart = periodDates.startDate;
  const selectedEnd = periodDates.endDate;
  const endExclusive = new Date(`${selectedEnd}T00:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const selectedStartDate = new Date(`${selectedStart}T00:00:00`);
  const rangeLength = Math.max(1, Math.round((endExclusive.getTime() - selectedStartDate.getTime()) / 86400000));
  const previousStart = new Date(selectedStartDate);
  previousStart.setDate(previousStart.getDate() - rangeLength);
  const previousEnd = new Date(selectedStartDate);
  const issued = invoices.filter((invoice) => invoice.status !== "DRAFT" && invoice.status !== "VOID");
  const inRange = (value: string, start: Date, end: Date) => {
    const date = new Date(`${value}T00:00:00`);
    return date >= start && date < end;
  };

  const selectedInvoices = issued.filter((invoice) => inRange(invoice.issueDate, selectedStartDate, endExclusive));
  const previousInvoices = issued.filter((invoice) => inRange(invoice.issueDate, previousStart, previousEnd));
  const selectedExpenses = expenses.filter((expense) => inRange(expense.expenseDate, selectedStartDate, endExclusive));
  const periodRevenue = selectedInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const previousRevenue = previousInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const periodProfit = selectedInvoices.reduce((sum, invoice) => sum + invoice.transactionProfit, 0);
  const operatingExpenses = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = periodProfit - operatingExpenses;
  const directCostTotal = selectedInvoices.reduce((sum, invoice) => sum + invoice.totalDirectCost, 0);
  const receivables = selectedInvoices.filter((invoice) => invoice.status !== "PAID").reduce((sum, invoice) => sum + invoice.remainingBalance, 0);
  const overdueInvoices = selectedInvoices.filter((invoice) => invoice.status === "OVERDUE");

  const metrics: DashboardMetrics = {
    ordersInPeriod: selectedInvoices.length,
    ordersInPeriodChange: percentChange(selectedInvoices.length, previousInvoices.length),
    revenueInPeriod: periodRevenue,
    revenueInPeriodChange: percentChange(periodRevenue, previousRevenue),
    transactionProfitInPeriod: periodProfit,
    transactionMarginInPeriod: periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0,
    operatingExpensesInPeriod: operatingExpenses,
    netProfitInPeriod: netProfit,
    netMarginInPeriod: periodRevenue > 0 ? (netProfit / periodRevenue) * 100 : 0,
    receivables,
    overdueCount: overdueInvoices.length,
    totalDirectCostsInPeriod: directCostTotal,
  };

  const daily = new Map<string, { revenue: number; profit: number; orders: number }>();
  selectedInvoices.forEach((invoice) => {
    const current = daily.get(invoice.issueDate) ?? { revenue: 0, profit: 0, orders: 0 };
    current.revenue += invoice.total;
    current.profit += invoice.transactionProfit;
    current.orders += 1;
    daily.set(invoice.issueDate, current);
  });
  selectedExpenses.forEach((expense) => {
    const current = daily.get(expense.expenseDate) ?? { revenue: 0, profit: 0, orders: 0 };
    current.profit -= expense.amount;
    daily.set(expense.expenseDate, current);
  });
  const salesData: SalesDataPoint[] = [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date: new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit" }), revenue: value.revenue, orders: value.orders }));
  const profitData: ProfitDataPoint[] = [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date: new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit" }), profit: value.profit, margin: value.revenue > 0 ? value.profit / value.revenue * 100 : 0 }));
  const costMap = new Map<DirectCostCategory, number>();
  selectedInvoices.flatMap((invoice) => invoice.directCosts).forEach((cost) => costMap.set(cost.category, (costMap.get(cost.category) ?? 0) + cost.amount));
  const internalCosts: InternalCostBreakdown[] = [...costMap].map(([category, amount]) => ({ category, label: getDirectCostLabel(category), amount }));

  return {
    user,
    metrics,
    salesData,
    profitData,
    internalCosts,
    invoices,
    expenses,
    periodInvoices: selectedInvoices,
    periodExpenses: selectedExpenses,
    periodLabel: periodDates.label,
    startDate: selectedStart,
    endDate: selectedEnd,
  };
}

export async function getNotificationSummaryAction() {
  const user = await getApprovedUser();
  if (!user) return { total: 0, overdue: 0, pendingUsers: 0 };
  let overdue = 0;
  if (user.role !== "STAFF") {
    const invoices = await getInvoicesAction();
    overdue = invoices.filter((invoice) => invoice.status === "OVERDUE").length;
  }
  let pendingUsers = 0;
  if (user.role === "OWNER") {
    const supabase = await createClient();
    const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "PENDING");
    if (error) throw new Error(error.message);
    pendingUsers = count ?? 0;
  }
  return { total: overdue + pendingUsers, overdue, pendingUsers };
}
