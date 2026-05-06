"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
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
    <div className="flex min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div className="flex-1 flex flex-col">
        {/* Top bar with UserNav */}
        <div className="flex h-12 items-center justify-end gap-2 border-b px-4">
          <ThemeToggle />
          <UserNav />
        </div>
        {/* pb-16 accounts for MobileBottomNav height on mobile */}
        <main className={cn("flex-1 p-4 md:p-8 pb-16 lg:pb-0", className)}>{children}</main>
      </div>

      {/* Fixed bottom navigation bar — mobile only */}
      <MobileBottomNav />
    </div>
  );
}
