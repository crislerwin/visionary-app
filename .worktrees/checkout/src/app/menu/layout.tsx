"use client";

import { MenuThemeWrapper } from "@/components/theme/menu-theme-wrapper";
import { TRPCProvider } from "@/lib/trpc/react";
import type { ReactNode } from "react";

export default function MenuLayout({ children }: { children: ReactNode }) {
  return (
    <TRPCProvider>
      <MenuThemeWrapper>
        <div className="min-h-screen">{children}</div>
      </MenuThemeWrapper>
    </TRPCProvider>
  );
}
