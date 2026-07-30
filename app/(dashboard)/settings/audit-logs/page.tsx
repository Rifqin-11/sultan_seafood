import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { formatDatetime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Audit Log" };

const mockAuditLogs = [
  { id: "al1", userName: "Finance", entityName: "Invoice", entityId: "inv_1", action: "ISSUED", createdAt: "2026-07-28T09:05:00Z" },
  { id: "al2", userName: "Finance", entityName: "Payment", entityId: "pay_2", action: "RECORDED", createdAt: "2026-07-27T14:30:00Z" },
  { id: "al3", userName: "Owner", entityName: "ProductCost", entityId: "cost_1", action: "UPDATED", createdAt: "2026-07-01T08:15:00Z" },
  { id: "al4", userName: "Finance", entityName: "Invoice", entityId: "inv_3", action: "ISSUED", createdAt: "2026-07-20T08:30:00Z" },
  { id: "al5", userName: "Finance", entityName: "Payment", entityId: "pay_1", action: "RECORDED", createdAt: "2026-07-21T15:10:00Z" },
];

const actionLabel: Record<string, { label: string; color: string }> = {
  ISSUED: { label: "Invoice Diterbitkan", color: "text-blue-600" },
  RECORDED: { label: "Pembayaran Dicatat", color: "text-emerald-600" },
  UPDATED: { label: "Data Diperbarui", color: "text-amber-600" },
  DELETED: { label: "Data Dihapus", color: "text-red-600" },
  VOIDED: { label: "Invoice Dibatalkan", color: "text-red-600" },
};

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Riwayat aktivitas penting dalam sistem" />

      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Waktu</TableHead>
                <TableHead className="text-xs font-semibold">Pengguna</TableHead>
                <TableHead className="text-xs font-semibold">Entitas</TableHead>
                <TableHead className="text-xs font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAuditLogs.map((log) => {
                const action = actionLabel[log.action] ?? { label: log.action, color: "text-foreground" };
                return (
                  <TableRow key={log.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatDatetime(log.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.entityName} #{log.entityId.slice(-6)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${action.color}`}>
                        {action.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">{mockAuditLogs.length} aktivitas</p>
        </div>
      </div>
    </div>
  );
}
