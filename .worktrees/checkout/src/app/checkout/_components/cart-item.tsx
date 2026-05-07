"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Store } from "lucide-react";
import { formatBRL } from "../_lib/checkout-utils";

export interface CartItemData {
  id: string;
  productId: string;
  productName: string;
  variantName?: string | null;
  price: number;
  quantity: number;
  productImage?: string | null;
  notes?: string | null;
}

interface CartItemProps {
  item: CartItemData;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({ item, onQuantityChange, onRemove }: CartItemProps) {
  return (
    <li className="py-4 flex gap-4">
      {item.productImage ? (
        <img
          src={item.productImage}
          alt={item.productName}
          loading="lazy"
          className="h-20 w-20 rounded-xl object-cover"
        />
      ) : (
        <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
          <Store className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-tight text-sm">
            {item.productName}
            {item.variantName ? ` (${item.variantName})` : ""}
          </h3>
          <span className="font-bold text-sm">{formatBRL(item.price * item.quantity)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{formatBRL(item.price)} / un</p>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border">
          <button
            type="button"
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            aria-label="Diminuir"
            className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted rounded-l-full"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
            aria-label="Aumentar"
            className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted rounded-r-full"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label="Remover"
            className="h-7 w-7 inline-flex items-center justify-center hover:bg-destructive/10 text-destructive rounded-r-full"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        {item.notes && <p className="text-[11px] text-muted-foreground mt-1">Obs: {item.notes}</p>}
      </div>
    </li>
  );
}
