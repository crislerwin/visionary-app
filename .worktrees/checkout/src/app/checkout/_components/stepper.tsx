"use client";

import { Check } from "lucide-react";

export function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = [
    { n: 1, label: "Itens" },
    { n: 2, label: "Dados" },
    { n: 3, label: "Pagamento" },
  ];
  return (
    <div className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-2">
        {items.map((it, i) => {
          const active = step === it.n;
          const completed = step > it.n;
          return (
            <div key={it.n} className="flex items-center gap-2 flex-1">
              <div
                className={`h-7 w-7 rounded-full inline-flex items-center justify-center text-xs font-bold transition-colors ${
                  completed
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {completed ? <Check className="h-3.5 w-3.5" /> : it.n}
              </div>
              <span
                className={`text-xs sm:text-sm font-medium ${active || completed ? "text-foreground" : "text-muted-foreground"}`}
              >
                {it.label}
              </span>
              {i < items.length - 1 && (
                <div className={`flex-1 h-px ${completed ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
