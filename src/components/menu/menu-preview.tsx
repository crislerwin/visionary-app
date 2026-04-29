"use client";

import { Clock, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface MenuPreviewProps {
  name: string;
  description: string;
  imageUrl: string | null;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    primaryText: string;
    secondaryText: string;
  };
}

const mockCategories = [
  { id: "1", name: "Destaques" },
  { id: "2", name: "Burgers" },
  { id: "3", name: "Bebidas" },
];

const mockProducts = [
  {
    id: "p1",
    name: "Smash Duplo",
    description: "Dois smash de costela 90g, cheddar e cebola caramelizada.",
    price: 42.9,
    image: null,
  },
  {
    id: "p2",
    name: "Bowl Mediterrâneo",
    description: "Quinoa, grão de bico, tomate confit e hummus.",
    price: 36.0,
    image: null,
  },
];

export function MenuPreview({ name, description, imageUrl, colors }: MenuPreviewProps) {
  const [imgError, setImgError] = useState(false);
  const hasImage = imageUrl && !imgError;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {/* Hero */}
      <section className="relative h-[120px] w-full overflow-hidden">
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 h-full w-full" style={{ background: colors.primary }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
        <div className="relative z-10 h-full px-3 flex flex-col justify-end pb-3">
          <div className="flex items-center gap-1.5 text-white/90 text-[9px] font-medium mb-1">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: "rgba(16,185,129,0.9)", color: "#fff" }}
            >
              <span className="h-1 w-1 rounded-full bg-white" /> Aberto agora
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-1.5 py-0.5">
              <Clock className="h-2 w-2" /> 30–45 min
            </span>
          </div>
          <h1 className="text-lg font-bold text-white leading-tight">
            {name || "Seu Restaurante"}
          </h1>
          {description && (
            <p className="mt-0.5 text-white/80 text-[10px] max-w-sm line-clamp-1">{description}</p>
          )}
        </div>
      </section>

      {/* Categories */}
      <div className="px-3 py-2 border-b" style={{ borderColor: `${colors.text}15` }}>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {mockCategories.map((c, i) => (
            <button
              type="button"
              key={c.id}
              className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium transition-all"
              style={{
                backgroundColor: i === 0 ? colors.primary : `${colors.text}08`,
                color: i === 0 ? colors.primaryText : colors.text,
                border: `1px solid ${i === 0 ? colors.primary : `${colors.text}15`}`,
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="px-3 py-3 space-y-2">
        <h2 className="text-sm font-bold" style={{ fontFamily: "var(--font-fraunces), serif" }}>
          Destaques
        </h2>
        <div className="space-y-2">
          {mockProducts.map((product) => (
            <div
              key={product.id}
              className="group flex gap-2 p-2 rounded-lg border transition-all"
              style={{
                borderColor: `${colors.text}15`,
                backgroundColor: `${colors.text}05`,
              }}
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center text-[9px] opacity-50">
                Sem imagem
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <h3 className="font-semibold text-xs leading-tight">{product.name}</h3>
                <p className="mt-0.5 text-[10px] opacity-60 line-clamp-1">{product.description}</p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="font-bold text-sm">
                    {product.price.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.primaryText,
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart FAB */}
      <div className="px-3 pb-3 flex justify-center">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold"
          style={{
            backgroundColor: colors.primary,
            color: colors.primaryText,
          }}
        >
          <span className="relative">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span
              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full text-[8px] font-bold flex items-center justify-center"
              style={{
                backgroundColor: colors.primaryText,
                color: colors.primary,
              }}
            >
              2
            </span>
          </span>
          Ver pedido
          <span className="h-2.5 w-px opacity-30" />
          R$ 90,90
        </button>
      </div>
    </div>
  );
}
