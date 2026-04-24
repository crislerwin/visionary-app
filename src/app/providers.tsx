"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { TRPCProvider } from "@/lib/trpc/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </NextThemesProvider>
      </TRPCProvider>
    </SessionProvider>
  )
}
