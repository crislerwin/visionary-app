"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TableRowAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface TableRowActionsProps {
  actions: TableRowAction[];
  className?: string;
}

export function TableRowActions({ actions, className }: TableRowActionsProps) {
  const primary = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
          <span className="sr-only">Abrir ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {primary.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            className="gap-2"
          >
            <action.icon className="h-4 w-4 shrink-0" />
            <span>{action.label}</span>
          </DropdownMenuItem>
        ))}
        {destructive.length > 0 && primary.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <action.icon className="h-4 w-4 shrink-0" />
            <span>{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
