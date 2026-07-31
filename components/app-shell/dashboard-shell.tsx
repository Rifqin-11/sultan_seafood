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
    <div className="flex h-screen overflow-hidden bg-[#f5f5f4]">
      <div className="relative hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} user={user} role={role} company={company} />
      </div>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} user={user} role={role} company={company} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMobileMenuToggle={() => setMobileOpen(true)} user={user} notificationCount={notificationCount} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
