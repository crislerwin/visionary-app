"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { TRPCProvider } from "@/lib/trpc/react";
import { SessionProvider } from "next-auth/react";
import type * as React from "react";
import "@/i18n/config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          {children}
        </ThemeProvider>
      </TRPCProvider>
    </SessionProvider>
  );
}
