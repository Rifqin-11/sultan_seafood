"use client";

import { useState, useEffect } from "react";
import { Sidebar, MobileSidebar } from "@/components/app-shell/sidebar";
import { Topbar, type UserProfileInfo } from "@/components/app-shell/topbar";
import { getCurrentUserAction } from "@/lib/actions/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<UserProfileInfo | undefined>(undefined);

  useEffect(() => {
    async function loadUser() {
      const res = await getCurrentUserAction();
      if (res?.email) {
        const rawName = res.email.split("@")[0];
        const formattedName = rawName
          .replace(/[-_.]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        setUser({
          name: formattedName,
          email: res.email,
          role: res.role || (res.email.includes("owner") ? "Owner" : "Admin"),
          initial: formattedName.charAt(0).toUpperCase(),
        });
      }
    }
    loadUser();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f4]">
      {/* Desktop Sidebar */}
      <div className="relative hidden lg:flex flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          user={user}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        user={user}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMobileMenuToggle={() => setMobileOpen(true)} user={user} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
