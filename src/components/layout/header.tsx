"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeft, Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MainNav } from "./main-nav"
import { UserNav } from "./user-nav"
import { TenantSwitcher } from "./tenant-switcher"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname()

  return (
    <div className={cn("border-b", className)}>
      <div className="flex h-16 items-center px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <nav className="grid gap-2 text-lg font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <span className="sr-only">SaaS Boilerplate</span>
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:text-foreground",
                  pathname === "/dashboard"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/posts"
                className={cn(
                  "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:text-foreground",
                  pathname?.startsWith("/dashboard/posts")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Posts
              </Link>
              <Link
                href="/dashboard/team"
                className={cn(
                  "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:text-foreground",
                  pathname?.startsWith("/dashboard/team")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Team
              </Link>
              <Link
                href="/dashboard/settings"
                className={cn(
                  "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:text-foreground",
                  pathname?.startsWith("/dashboard/settings")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Settings
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden items-center gap-2 md:flex">
            <span className="hidden font-bold sm:inline-block">SaaS Boilerplate</span>
          </Link>
          <TenantSwitcher />
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden md:block">
            <MainNav />
          </div>
          <UserNav />
        </div>
      </div>
    </div>
  )
}
