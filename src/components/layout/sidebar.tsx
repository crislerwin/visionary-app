"use client";

import { Button } from "@/components/ui/button";
import { type NavSection, sidebarNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("navigation");

  return (
    <div className="px-3 py-2">
      {section.titleKey && !collapsed && (
        <h3 suppressHydrationWarning className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t(section.titleKey)}
        </h3>
      )}
      <div className="space-y-1">
        {section.items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const title = t(item.titleKey);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground",
                item.disabled && "pointer-events-none opacity-50",
                collapsed && "justify-center",
              )}
              title={collapsed ? title : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span suppressHydrationWarning>{title}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, setCollapsed, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className,
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
            key={section.titleKey || section.items[0]?.href}
            section={section}
            collapsed={collapsed}
          />
        ))}
      </div>
    </aside>
  );
}
