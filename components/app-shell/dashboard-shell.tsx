"use client";

import { useState } from "react";
import { Sidebar, MobileSidebar } from "@/components/app-shell/sidebar";
import { Topbar, type UserProfileInfo } from "@/components/app-shell/topbar";
import type { CompanyProfile } from "@/lib/company-store";
import type { Role } from "@/types";

export function DashboardShell({ children, user, company, notificationCount }: {
  children: React.ReactNode;
  user: UserProfileInfo;
  company: CompanyProfile;
  notificationCount: number;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user.role as Role;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white">
      <div className="relative hidden lg:flex flex-shrink-0 border-r border-stone-200 shadow-[2px_0_8px_rgba(15,23,42,0.04)]">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} user={user} role={role} company={company} />
      </div>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} user={user} role={role} company={company} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMobileMenuToggle={() => setMobileOpen(true)} user={user} notificationCount={notificationCount} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-16 lg:pt-0 bg-[#f1f3f7]">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
