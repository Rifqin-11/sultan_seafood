import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { getExpensesAction } from "@/lib/actions/expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Pengeluaran Operasional",
};

export default async function ExpensesPage() {
  const expenses = await getExpensesAction();
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengeluaran Operasional"
        description="Kelola biaya pengeluaran operasional di luar biaya invoice"
      >
        <AddExpenseDialog />
      </PageHeader>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Total Pengeluaran Bulan Ini
        </p>
        <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
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
                    {e.category}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.description}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.userName}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {formatCurrency(e.amount)}
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
