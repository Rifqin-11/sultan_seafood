"use client";

import { Menu, Bell, ChevronDown, StickyNote } from "lucide-react";
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
import { usePathname, useRouter } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const pathLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/notes": "Catatan Pribadi",
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
  "/reports/supplier-payables": "Hutang Supplier",
  "/reports/internal-costs": "Biaya Internal",
  "/settings/company": "Profil Bisnis",
  "/settings/users": "Profil & Pengguna",
  "/settings/invoice": "Nomor Invoice",
  "/settings/audit-logs": "Audit Log",
};

export interface UserProfileInfo {
  name: string;
  email: string;
  role: string;
  initial: string;
}

interface TopbarProps {
  onMobileMenuToggle: () => void;
  user?: UserProfileInfo;
  notificationCount?: number;
}

export function Topbar({ onMobileMenuToggle, user, notificationCount = 0 }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const userName = user?.name || "Owner";
  const userEmail = user?.email || "owner@sultansf.id";
  const userInitial = user?.initial || userName.charAt(0).toUpperCase();

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
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 shadow-[0_1px_0_rgba(28,25,23,0.05)] backdrop-blur-sm md:px-6 lg:static lg:shadow-none">
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
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          aria-label="Buka catatan pribadi"
          onClick={() => router.push("/notes")}
          title="Catatan Pribadi"
        >
          <StickyNote className="size-3.5" />
          <span className="hidden lg:inline">Catatan</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifikasi"
          onClick={() => router.push("/reports/receivables")}
          title={`${notificationCount} notifikasi perlu ditinjau`}
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center">{notificationCount > 9 ? "9+" : notificationCount}</span>}
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
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block max-w-[150px]">
                <p className="text-xs font-medium leading-tight truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">
                  {userEmail}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Masuk sebagai
              <div className="font-semibold text-foreground mt-0.5 truncate">{userEmail}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === "OWNER" && <>
              <DropdownMenuItem onClick={() => router.push("/settings/users")}>Profil & Pengguna</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings/company")}>Pengaturan Bisnis</DropdownMenuItem>
              <DropdownMenuSeparator />
            </>}
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
