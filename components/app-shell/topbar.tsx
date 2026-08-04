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
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white px-4 shadow-[0_1px_0_rgba(15,23,42,0.06)] md:px-6 lg:static lg:shadow-[0_1px_0_rgba(15,23,42,0.06)]">
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
          <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-2xl shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-stone-200">
            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] flex items-center justify-center text-sm font-bold text-white shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900 truncate">{userName}</p>
                <p className="text-xs text-stone-400 truncate">{userEmail}</p>
                <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-[10px] font-semibold text-blue-700 border border-blue-200">
                  {user?.role ?? "USER"}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1" />
            {user?.role === "OWNER" && <>
              <DropdownMenuItem
                onClick={() => router.push("/settings/users")}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-stone-700 cursor-pointer hover:bg-stone-50 focus:bg-stone-50"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <span>Profil & Pengguna</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings/company")}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-stone-700 cursor-pointer hover:bg-stone-50 focus:bg-stone-50"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <span>Pengaturan Bisnis</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
            </>}
            <DropdownMenuItem
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 cursor-pointer hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
              onClick={async () => { await signOutAction(); }}
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <span className="font-medium">Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
