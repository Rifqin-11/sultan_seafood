import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getExpensesAction } from "@/lib/actions/expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DollarSign, Receipt, PieChart, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Pengeluaran Operasional",
};

export default async function ExpensesPage() {
  const expenses = await getExpensesAction();
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCount = expenses.length;
  const avgExpense = totalCount > 0 ? Math.round(totalExpenses / totalCount) : 0;

  // Calculate top category
  const categoryMap: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });
  let topCategory = "—";
  let topCategoryAmount = 0;
  Object.entries(categoryMap).forEach(([cat, amt]) => {
    if (amt > topCategoryAmount) {
      topCategoryAmount = amt;
      topCategory = cat;
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengeluaran Operasional"
        description="Kelola biaya pengeluaran operasional di luar biaya invoice"
      >
        <AddExpenseDialog />
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pengeluaran"
          value={totalExpenses}
          isCurrency
          icon={DollarSign}
        />
        <MetricCard
          title="Jumlah Transaksi"
          value={totalCount}
          suffix="transaksi"
          icon={Receipt}
        />
        <MetricCard
          title="Kategori Terbesar"
          value={topCategory}
          suffix={topCategoryAmount > 0 ? `(${formatCurrency(topCategoryAmount)})` : ""}
          icon={PieChart}
        />
        <MetricCard
          title="Rata-rata Pengeluaran"
          value={avgExpense}
          isCurrency
          icon={TrendingUp}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Riwayat Pengeluaran Operasional</h3>
          <AddExpenseDialog />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold">Kategori</TableHead>
                <TableHead className="text-xs font-semibold">Deskripsi</TableHead>
                <TableHead className="text-xs font-semibold">Dicatat oleh</TableHead>
                <TableHead className="text-xs font-semibold text-right">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(e.expenseDate)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
                      {e.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.description}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.userName}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums text-red-600">
                    -{formatCurrency(e.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {expenses.length} pengeluaran
          </p>
          <div className="text-sm font-bold">
            Total: {formatCurrency(totalExpenses)}
          </div>
        </div>
      </div>
    </div>
  );
}
