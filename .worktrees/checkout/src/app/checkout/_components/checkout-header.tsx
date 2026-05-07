"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Stepper } from "./stepper";

interface CheckoutHeaderProps {
  tenantSlug: string | null;
  showStepper?: boolean;
  step?: 1 | 2 | 3;
}

export function CheckoutHeader({ tenantSlug, showStepper = false, step = 2 }: CheckoutHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href={tenantSlug ? `/menu/${tenantSlug}` : "/"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao cardápio
        </Link>
        <div className="font-semibold text-foreground">Finalizar pedido</div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento seguro
        </div>
      </div>
      {showStepper && <Stepper step={step} />}
    </header>
  );
}
