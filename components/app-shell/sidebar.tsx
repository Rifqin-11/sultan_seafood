"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  FileText,
  CreditCard,
  UtensilsCrossed,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  ChevronRight,
  Fish,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Produk", href: "/products", icon: Package },
  { label: "Harga Beli", href: "/pricing/purchase", icon: Tag },
  { label: "Harga Jual", href: "/pricing/selling", icon: Tag },
  { label: "Invoice", href: "/invoices", icon: FileText },
  { label: "Pembayaran", href: "/payments", icon: CreditCard },
  { label: "Restoran", href: "/customers", icon: UtensilsCrossed },
  { label: "Supplier", href: "/suppliers", icon: Truck },
  { label: "Pengeluaran", href: "/expenses", icon: Receipt },
  { label: "Lap. Penjualan", href: "/reports/sales", icon: BarChart3 },
  { label: "Lap. Laba", href: "/reports/profit", icon: BarChart3 },
  { label: "Piutang", href: "/reports/receivables", icon: BarChart3 },
  { label: "Biaya Internal", href: "/reports/internal-costs", icon: BarChart3 },
];

const navGrouped = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Produk", href: "/products", icon: Package },
    ],
  },
  {
    label: "Harga",
    items: [
      { label: "Harga Beli", href: "/pricing/purchase", icon: Tag },
      { label: "Harga Jual Restoran", href: "/pricing/selling", icon: Tag },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { label: "Invoice", href: "/invoices", icon: FileText },
      { label: "Pembayaran", href: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "Master Data",
    items: [
      { label: "Restoran", href: "/customers", icon: UtensilsCrossed },
      { label: "Supplier", href: "/suppliers", icon: Truck },
      { label: "Pengeluaran", href: "/expenses", icon: Receipt },
    ],
  },
  {
    label: "Laporan",
    items: [
      { label: "Penjualan", href: "/reports/sales", icon: BarChart3 },
      { label: "Laba", href: "/reports/profit", icon: BarChart3 },
      { label: "Piutang", href: "/reports/receivables", icon: BarChart3 },
      { label: "Biaya Internal", href: "/reports/internal-costs", icon: BarChart3 },
    ],
  },
];

const bottomItems = [
  { label: "Profil Bisnis", href: "/settings/company", icon: Settings },
  { label: "Pengguna", href: "/settings/users", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={
          <Link
            href={href}
            className={cn(
              "flex items-center justify-center w-full h-9 rounded-lg transition-colors",
              active
                ? "bg-[#303030] text-white"
                : "text-[#a3a3a3] hover:bg-[#242424] hover:text-white"
            )}
          />
        }>
          <Icon className="w-4 h-4" />
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 w-full h-9 px-3 rounded-lg transition-colors text-sm",
        active
          ? "bg-[#303030] text-white font-medium"
          : "text-[#a3a3a3] hover:bg-[#242424] hover:text-white"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[#151515] transition-all duration-300 ease-in-out flex-shrink-0 relative",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-[#262626] flex-shrink-0",
          collapsed ? "justify-center px-0" : "px-4 gap-3"
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg flex-shrink-0">
          <Fish className="w-4 h-4 text-[#151515]" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm font-semibold leading-tight truncate">
              Sultan Seafood
            </span>
            <span className="text-[#666666] text-xs leading-tight">ERP</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {collapsed ? (
          // Collapsed: flat list
          navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              collapsed
            />
          ))
        ) : (
          // Expanded: grouped
          navGrouped.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-3" : ""}>
              {group.label && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#525252] px-3 mb-1">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  collapsed={false}
                />
              ))}
            </div>
          ))
        )}
      </nav>

      {/* Divider */}
      <div className="h-px bg-[#262626] mx-2" />

      {/* Bottom nav */}
      <div className="py-2 px-2 space-y-0.5">
        {bottomItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* User profile */}
      <div className="border-t border-[#262626] p-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger render={
              <button
                onClick={async () => { await signOutAction(); }}
                className="flex items-center justify-center w-full h-9 rounded-lg text-[#a3a3a3] hover:bg-[#242424] hover:text-white transition-colors"
              />
            }>
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white">
                O
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Owner — Keluar
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              O
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">Owner</p>
              <p className="text-[#666666] text-xs truncate">owner@sultansf.id</p>
            </div>
            <button
              onClick={async () => { await signOutAction(); }}
              title="Keluar"
              className="text-[#666666] hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-[#262626] border border-[#404040] rounded-full flex items-center justify-center text-[#a3a3a3] hover:text-white transition-colors z-10"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-[260px] bg-[#151515] z-50 flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center h-16 px-4 gap-3 border-b border-[#262626] flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg">
            <Fish className="w-4 h-4 text-[#151515]" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-sm font-semibold leading-tight">Sultan Seafood</span>
            <span className="text-[#666666] text-xs">ERP</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navGrouped.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-3" : ""}>
              {group.label && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#525252] px-3 mb-1">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 w-full h-9 px-3 rounded-lg transition-colors text-sm",
                      active
                        ? "bg-[#303030] text-white font-medium"
                        : "text-[#a3a3a3] hover:bg-[#242424] hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-[#262626] p-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              O
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium">Owner</p>
              <p className="text-[#666666] text-xs truncate">owner@sultansf.id</p>
            </div>
            <button className="text-[#666666] hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
