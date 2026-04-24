"use client"

import * as React from "react"
import { Header } from "./header"

interface DashboardShellProps {
  children: React.ReactNode
  className?: string
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className={"flex-1 p-4 md:p-8", className}>{children}</main>
    </div>
  )
}
