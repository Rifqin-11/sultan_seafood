"use server";

import { createClient } from "@/lib/supabase/server";
import { getInvoicesAction } from "@/lib/actions/invoices";
import { getApprovedUser, requireApprovedUser } from "@/lib/security/auth";
import { getDirectCostLabel } from "@/lib/utils";
import type { DashboardMetrics, DirectCostCategory, InternalCostBreakdown, ProfitDataPoint, SalesDataPoint } from "@/types";

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getDashboardDataAction() {
  const user = await requireApprovedUser();
  const invoices = await getInvoicesAction();
  const now = new Date();
  const today = dateKey(now);
  const yesterdayDate = new Date(now); yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = dateKey(yesterdayDate);
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); startOfWeek.setHours(0, 0, 0, 0);
  const previousWeekStart = new Date(startOfWeek); previousWeekStart.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const issued = invoices.filter((invoice) => invoice.status !== "DRAFT" && invoice.status !== "VOID");
  const inRange = (value: string, start: Date, end: Date) => {
    const date = new Date(`${value}T00:00:00`);
    return date >= start && date < end;
  };

  const todayOrders = issued.filter((invoice) => invoice.issueDate === today).length;
  const yesterdayOrders = issued.filter((invoice) => invoice.issueDate === yesterday).length;
  const weekOrders = issued.filter((invoice) => inRange(invoice.issueDate, startOfWeek, new Date(now.getTime() + 86400000))).length;
  const previousWeekOrders = issued.filter((invoice) => inRange(invoice.issueDate, previousWeekStart, startOfWeek)).length;
  const monthInvoices = issued.filter((invoice) => inRange(invoice.issueDate, startOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 1)));
  const previousMonthInvoices = issued.filter((invoice) => inRange(invoice.issueDate, previousMonthStart, startOfMonth));
  const monthRevenue = monthInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const previousMonthRevenue = previousMonthInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const monthProfit = monthInvoices.reduce((sum, invoice) => sum + invoice.transactionProfit, 0);
  const directCostTotal = monthInvoices.reduce((sum, invoice) => sum + invoice.totalDirectCost, 0);
  const receivables = issued.filter((invoice) => invoice.status !== "PAID").reduce((sum, invoice) => sum + invoice.remainingBalance, 0);
  const overdueCount = issued.filter((invoice) => invoice.status === "OVERDUE").length;

  const metrics: DashboardMetrics = {
    ordersToday: todayOrders,
    ordersTodayChange: percentChange(todayOrders, yesterdayOrders),
    ordersThisWeek: weekOrders,
    ordersThisWeekChange: percentChange(weekOrders, previousWeekOrders),
    revenueThisMonth: monthRevenue,
    revenueThisMonthChange: percentChange(monthRevenue, previousMonthRevenue),
    transactionProfitThisMonth: monthProfit,
    transactionMarginThisMonth: monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0,
    receivables,
    overdueCount,
    totalDirectCostsThisMonth: directCostTotal,
  };

  const daily = new Map<string, { revenue: number; profit: number; orders: number }>();
  monthInvoices.forEach((invoice) => {
    const current = daily.get(invoice.issueDate) ?? { revenue: 0, profit: 0, orders: 0 };
    current.revenue += invoice.total;
    current.profit += invoice.transactionProfit;
    current.orders += 1;
    daily.set(invoice.issueDate, current);
  });
  const salesData: SalesDataPoint[] = [...daily].map(([date, value]) => ({ date: new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit" }), revenue: value.revenue, orders: value.orders }));
  const profitData: ProfitDataPoint[] = [...daily].map(([date, value]) => ({ date: new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit" }), profit: value.profit, margin: value.revenue > 0 ? value.profit / value.revenue * 100 : 0 }));
  const costMap = new Map<DirectCostCategory, number>();
  monthInvoices.flatMap((invoice) => invoice.directCosts).forEach((cost) => costMap.set(cost.category, (costMap.get(cost.category) ?? 0) + cost.amount));
  const internalCosts: InternalCostBreakdown[] = [...costMap].map(([category, amount]) => ({ category, label: getDirectCostLabel(category), amount }));

  return { user, metrics, salesData, profitData, internalCosts, invoices, periodLabel: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
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
