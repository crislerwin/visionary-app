"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { sidebarNavigation, type NavSection } from "@/config/navigation";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TenantSwitcher } from "./tenant-switcher";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  className?: string;
}

function SidebarNavSection({
  section,
  collapsed,
}: {
  section: NavSection;
  collapsed: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="px-3 py-2">
      {section.title && !collapsed && (
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title}
        </h3>
      )}
      <div className="space-y-1">
        {section.items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground",
                item.disabled && "pointer-events-none opacity-50",
                collapsed && "justify-center"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MobileMenu({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold"
              onClick={() => setOpen(false)}
            >
              <span className="text-lg">SaaS Boilerplate</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            {sidebarNavigation.map((section) => (
              <SidebarNavSection
                key={section.title || section.items[0]?.href}
                section={section}
                collapsed={false}
              />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar({ collapsed, setCollapsed, className }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu */}
      <MobileMenu open={mobileOpen} setOpen={setMobileOpen} />

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-background transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Header with Tenant Switcher and Collapse Button */}
        <div className="flex h-12 items-center gap-1 border-b px-2">
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <TenantSwitcher />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="h-7 w-7 shrink-0"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}

          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-7 w-7 shrink-0 mx-auto"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {sidebarNavigation.map((section) => (
            <SidebarNavSection
              key={section.title || section.items[0]?.href}
              section={section}
              collapsed={collapsed}
            />
          ))}
        </div>
      </aside>
    </>
  );
}

export function MobileSidebarTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="text-lg">SaaS Boilerplate</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            {sidebarNavigation.map((section) => (
              <SidebarNavSection
                key={section.title || section.items[0]?.href}
                section={section}
                collapsed={false}
              />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
