"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TRPCProvider } from "@/lib/trpc/react";
import { SessionProvider } from "next-auth/react";
import type * as React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </TRPCProvider>
    </SessionProvider>
  );
}
