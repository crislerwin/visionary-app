"use client";

import { cn } from "@/lib/utils";
import { MobileSidebarTrigger } from "./sidebar";
import { UserNav } from "./user-nav";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <div className={cn("border-b", className)}>
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Mobile Menu - only visible on mobile */}
        <div className="lg:hidden">
          <MobileSidebarTrigger />
        </div>

        <div className="ml-auto">
          <UserNav />
        </div>
      </div>
    </div>
  );
}
