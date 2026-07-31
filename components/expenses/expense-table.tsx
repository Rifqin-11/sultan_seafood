"use client";

import { useState } from "react";
import type { Expense } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { MoreHorizontal, Edit, Trash2, Loader2, Receipt } from "lucide-react";
import { deleteExpenseAction } from "@/lib/actions/expenses";
import { EditExpenseDialog } from "./edit-expense-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ExpenseTableProps {
  expenses: Expense[];
  totalExpenses: number;
}

export function ExpenseTable({ expenses, totalExpenses }: ExpenseTableProps) {
  const router = useRouter();
  const [expensesList, setExpensesList] = useState<Expense[]>(expenses);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    const idToDelete = deletingExpense.id;
    setLoadingId(idToDelete);
    
    // Optimistic update
    setExpensesList((prev) => prev.filter((e) => e.id !== idToDelete));
    setDeletingExpense(null);

    const res = await deleteExpenseAction(idToDelete);
    setLoadingId(null);
    if (res.error) {
      toast.error(`Gagal menghapus: ${res.error}`);
      // Revert optimistic update
      setExpensesList(expenses);
    } else {
      toast.success(res.message || "Pengeluaran berhasil dihapus");
      router.refresh();
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs font-semibold">Tanggal</TableHead>
              <TableHead className="text-xs font-semibold">Kategori</TableHead>
              <TableHead className="text-xs font-semibold">Deskripsi</TableHead>
              <TableHead className="text-xs font-semibold">Dicatat oleh</TableHead>
              <TableHead className="text-xs font-semibold text-right">Nominal</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expensesList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48">
                  <EmptyState
                    icon={Receipt}
                    title="Tidak ada pengeluaran"
                    description="Belum ada data pengeluaran yang terdaftar."
                  />
                </TableCell>
              </TableRow>
            ) : (
              expensesList.map((e) => (
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        aria-label="Aksi pengeluaran"
                      >
                        {loadingId === e.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <MoreHorizontal className="w-4 h-4" />
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setEditingExpense(e)}
                        >
                          <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                          Edit Data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-600"
                          onClick={() => setDeletingExpense(e)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2 text-red-600" />
                          Hapus Data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {expensesList.length} pengeluaran
        </p>
        <div className="text-sm font-bold">
          Total: {formatCurrency(totalExpenses)}
        </div>
      </div>

      {editingExpense && (
        <EditExpenseDialog
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(open) => {
            if (!open) setEditingExpense(null);
          }}
        />
      )}

      {deletingExpense && (
        <ConfirmDialog
          open={!!deletingExpense}
          onOpenChange={(open) => {
            if (!open) setDeletingExpense(null);
          }}
          title="Hapus Pengeluaran?"
          description={`Apakah Anda yakin ingin menghapus data pengeluaran "${deletingExpense.description}"?`}
          confirmLabel="Hapus Data"
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
