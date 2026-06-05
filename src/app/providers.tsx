"use client";

import { Toasts } from "@/components/Toasts";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/hooks/use-toast";
import { TRPCProvider } from "@/lib/trpc/react";
import { SessionProvider } from "next-auth/react";
import type * as React from "react";
import "@/i18n/config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <ToastProvider>
          <ThemeProvider defaultTheme="system" storageKey="theme">
            {children}
            <Toasts />
          </ThemeProvider>
        </ToastProvider>
      </TRPCProvider>
    </SessionProvider>
  );
}
