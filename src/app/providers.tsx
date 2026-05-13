"use client";

import { TRPCProvider } from "@/lib/trpc/react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import "@/i18n/config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </NextThemesProvider>
      </TRPCProvider>
    </SessionProvider>
  );
}
