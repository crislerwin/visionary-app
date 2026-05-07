"use client";

import { Button } from "@/components/ui/button";
import { Check, Clock, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Store } from "lucide-react";
import { formatBRL } from "../_lib/checkout-utils";
import type { CartItemData } from "./cart-item";
import { Row } from "./option-buttons";

interface OrderSummaryProps {
  items: CartItemData[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  isDelivery: boolean;
  isSubmitting: boolean;
}

export function OrderSummary({
  items,
  subtotal,
  deliveryFee,
  total,
  isDelivery,
  isSubmitting,
}: OrderSummaryProps) {
  return (
    <aside className="lg:sticky lg:top-32 h-fit">
      <div className="rounded-3xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-bold">Resumo</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              {item.productImage ? (
                <img
                  src={item.productImage}
                  alt={item.productName}
                  loading="lazy"
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.productName}
                  {item.variantName ? ` (${item.variantName})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBRL(item.price)} x {item.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold">{formatBRL(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border space-y-2.5 text-sm">
          <Row label="Subtotal" value={formatBRL(subtotal)} />
          <Row
            label={isDelivery ? "Taxa de entrega" : "Retirada"}
            value={deliveryFee === 0 ? "Grátis" : formatBRL(deliveryFee)}
          />
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-end justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-3xl font-bold tracking-tight">{formatBRL(total)}</span>
        </div>

        <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {isDelivery ? "Entrega em breve" : "Pronto para retirada em breve"}
        </div>

        <Button
          type="submit"
          form="checkout-form"
          disabled={isSubmitting}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold disabled:opacity-40 hover:scale-[1.01] transition-transform h-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Finalizar pedido
            </>
          )}
        </Button>

        <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground text-center">
          <div className="rounded-lg bg-muted/50 py-2">
            <ShieldCheck className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
            Seguro
          </div>
          <div className="rounded-lg bg-muted/50 py-2">
            <Clock className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
            Rápido
          </div>
          <div className="rounded-lg bg-muted/50 py-2">
            <Check className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
            Garantido
          </div>
        </div>
      </div>
    </aside>
  );
}
