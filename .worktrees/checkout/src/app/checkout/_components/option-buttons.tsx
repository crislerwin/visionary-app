"use client";

import { Check } from "lucide-react";

export function ModeOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all ${
        active
          ? "border-foreground bg-foreground/5 shadow-[var(--shadow-soft)]"
          : "border-border hover:border-foreground/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl inline-flex items-center justify-center ${
            active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {active && <Check className="h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}

export function PayOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all ${
        active
          ? "border-foreground bg-foreground/5 shadow-[var(--shadow-soft)]"
          : "border-border hover:border-foreground/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl inline-flex items-center justify-center ${
            active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {active && <Check className="h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}

export function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "text-primary font-semibold" : "text-foreground font-medium"}>
        {value}
      </span>
    </div>
  );
}
