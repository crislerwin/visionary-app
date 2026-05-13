"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import type * as React from "react";
import { useState } from "react";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { Sidebar } from "./sidebar";
import { UserNav } from "./user-nav";

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar with UserNav */}
        <div className="flex h-12 shrink-0 items-center justify-end gap-2 border-b px-4">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserNav />
        </div>
        {/* Scrollable content area — pb-16 accounts for MobileBottomNav height on mobile */}
        <main className={cn("flex-1 overflow-y-auto p-3 md:p-5 pb-16 lg:pb-5", className)}>
          {children}
        </main>
      </div>

      {/* Fixed bottom navigation bar — mobile only */}
      <MobileBottomNav />
    </div>
  );
}
