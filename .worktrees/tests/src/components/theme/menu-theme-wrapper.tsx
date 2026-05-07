"use client";

import { TenantThemeProvider } from "@/components/theme/tenant-theme-provider";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function MenuThemeWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Extract tenant slug from /menu/[tenantSlug]
  const slug = pathname?.split("/")[2];

  return <TenantThemeProvider tenantSlug={slug}>{children}</TenantThemeProvider>;
}
