"use client";

import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { cn } from "@/lib/utils";
import type * as React from "react";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { UserNav } from "./user-nav";

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentTenant } = useCurrentTenant();

  const tenantConfig =
    currentTenant != null
      ? ((currentTenant as unknown as Record<string, unknown>).config ?? null)
      : null;
  useTenantBranding(tenantConfig, currentTenant?.slug);

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div className="flex-1 flex flex-col">
        {/* Top bar with UserNav - outside sidebar */}
        <div className="flex h-12 items-center justify-end border-b px-4">
          <UserNav />
        </div>
        <main className={cn("flex-1", className)}>{children}</main>
      </div>
    </div>
  );
}
