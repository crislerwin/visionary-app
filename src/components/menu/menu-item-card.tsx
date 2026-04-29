"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  stock: number;
  trackStock: boolean;
  variants: MenuItemVariant[];
}

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, variantId?: string | null) => void;
  cartQuantity?: number;
  colors?: {
    primary?: string;
    primaryText?: string;
  };
}

export function MenuItemCard({ item, onAdd, cartQuantity = 0, colors }: MenuItemCardProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    item.variants.length > 0 ? item.variants[0].id : null,
  );
  const [imgError, setImgError] = useState(false);

  const selectedVariant = item.variants.find((v) => v.id === selectedVariantId) ?? null;
  const displayPrice = selectedVariant?.price ?? item.price;
  const isOutOfStock = item.trackStock && item.stock <= 0;
  const variantOutOfStock = selectedVariant && item.trackStock && selectedVariant.stock <= 0;
  const disabled = Boolean(isOutOfStock || variantOutOfStock);

  const handleAdd = () => {
    if (disabled) return;
    onAdd(item, selectedVariantId);
  };

  return (
    <motion.article
      whileHover={{ y: -2 }}
      className="group relative flex gap-4 p-3 rounded-2xl bg-card border border-border hover:border-foreground/20 hover:shadow-[var(--shadow-soft)] transition-all"
    >
      <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-xl bg-muted">
        {item.image && !imgError ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
            unoptimized
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            Sem imagem
          </div>
        )}
        {cartQuantity > 0 && (
          <span
            className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full text-[10px] font-bold px-2 py-0.5"
            style={{
              backgroundColor: colors?.primary ?? "var(--foreground)",
              color: colors?.primaryText ?? "var(--background)",
            }}
          >
            {cartQuantity} no carrinho
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="font-semibold text-foreground leading-tight">{item.name}</h3>
        {item.variants.length > 1 && (
          <select
            value={selectedVariantId ?? ""}
            onChange={(e) => setSelectedVariantId(e.target.value || null)}
            className="mt-1 text-xs bg-transparent border border-border rounded-md px-2 py-0.5 w-fit text-muted-foreground"
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {item.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        {item.variants.length === 1 && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.variants[0].name}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {item.description ?? "Sem descrição"}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-lg text-foreground">{formatBRL(displayPrice)}</span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled}
            aria-label={`Adicionar ${item.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: colors?.primary ?? "var(--foreground)",
              color: colors?.primaryText ?? "var(--background)",
            }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
