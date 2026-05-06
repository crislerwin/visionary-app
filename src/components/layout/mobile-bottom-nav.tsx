"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { sidebarNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function MobileBottomNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Bottom bar — visible only on mobile (below lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
        <div className="flex items-center justify-between h-14 px-6">
          {/* Left: Quick Dashboard link */}
          <Link
            href="/dashboard"
            className={cn(
              "flex flex-col items-center gap-0.5 text-xs font-medium transition-colors",
              pathname === "/dashboard"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Início</span>
          </Link>

          {/* Center: Menu Button — opens the Drawer */}
          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full shadow-md -mt-4"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Right: Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>

      {/* Drawer — controlled by the bottom button */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="text-center">Menu</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-2 pb-6">
            {sidebarNavigation.map((section) => (
              <div key={section.title || section.items[0]?.href} className="mb-3">
                {section.title && (
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href || pathname?.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-accent text-accent-foreground",
                          item.disabled && "pointer-events-none opacity-50",
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
