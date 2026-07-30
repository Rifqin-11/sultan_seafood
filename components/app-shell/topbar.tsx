"use client";

import { Menu, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const pathLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Produk",
  "/pricing/purchase": "Harga Beli",
  "/pricing/selling": "Harga Jual Restoran",
  "/invoices": "Invoice",
  "/invoices/new": "Buat Invoice",
  "/payments": "Pembayaran",
  "/customers": "Restoran",
  "/suppliers": "Supplier",
  "/expenses": "Pengeluaran",
  "/reports/sales": "Laporan Penjualan",
  "/reports/profit": "Laporan Laba",
  "/reports/receivables": "Piutang",
  "/reports/internal-costs": "Biaya Internal",
  "/settings/company": "Profil Bisnis",
  "/settings/users": "Pengguna & Role",
  "/settings/invoice": "Nomor Invoice",
  "/settings/audit-logs": "Audit Log",
};

interface TopbarProps {
  onMobileMenuToggle: () => void;
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const pathname = usePathname();

  // Build breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const currentLabel =
    pathLabels[pathname] ||
    (segments.length > 0
      ? segments[segments.length - 1]
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "Dashboard");

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMobileMenuToggle}
        aria-label="Buka menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Breadcrumb / Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">
          {currentLabel}
        </h1>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Sultan Seafood ERP
        </p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              aria-label="Menu pengguna"
            >
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs font-semibold bg-foreground text-background">
                  O
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-medium leading-tight">Owner</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  owner@sultansf.id
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Masuk sebagai
              <div className="font-semibold text-foreground mt-0.5">Owner</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Pengaturan</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={async () => {
                await signOutAction();
              }}
            >
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
