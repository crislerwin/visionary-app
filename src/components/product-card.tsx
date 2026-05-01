"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image as ImageIcon } from "lucide-react";
import type * as React from "react";

export interface ProductCardVariant {
  id: string;
  name: string;
  price: number | string;
  stock: number;
}

export interface ProductCardProduct {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number | string;
  stock: number;
  trackStock: boolean;
  variants: ProductCardVariant[];
  category?: { id: string; name: string } | null;
}

interface ProductCardProps {
  product: ProductCardProduct;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  /** Controlled variant selector. If omitted, no selector is shown. */
  selectedVariantId?: string | null;
  onVariantChange?: (variantId: string | null) => void;
}

function formatBRL(value: number | string) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });
}

export function ProductCard({
  product,
  badge,
  footer,
  headerAction,
  selectedVariantId,
  onVariantChange,
}: ProductCardProps) {
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null;

  const displayPrice = selectedVariant?.price ?? product.price;

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md gap-0 p-0">
      {/* Product Image - flush to top */}
      <div className="relative h-32 bg-muted overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {badge}
          {headerAction}
        </div>
      </div>

      <CardHeader className="px-3 pt-2 pb-0 gap-0.5">
        <CardTitle className="text-sm font-semibold leading-tight line-clamp-2 break-words">
          {product.name}
        </CardTitle>
        {product.category && (
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {product.category.name}
          </span>
        )}
        {product.description && (
          <CardDescription className="text-xs line-clamp-2 leading-tight">
            {product.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="px-3 py-1.5 flex-1 space-y-1">
        {/* Variant Selector */}
        {product.variants.length > 0 && onVariantChange && (
          <Select
            value={selectedVariantId ?? ""}
            onValueChange={(value) => onVariantChange(value || null)}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {product.variants.map((variant) => (
                <SelectItem key={variant.id} value={variant.id}>
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span>{variant.name}</span>
                    <span className="text-muted-foreground">R$ {formatBRL(variant.price)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Variant badges (read-only, used in dashboard) */}
        {product.variants.length > 0 && !onVariantChange && (
          <div className="flex flex-wrap gap-1">
            {product.variants.slice(0, 3).map((variant) => (
              <Badge key={variant.id} variant="outline" className="text-[10px] h-5 px-1.5">
                {variant.name}: R$ {formatBRL(variant.price)}
              </Badge>
            ))}
            {product.variants.length > 3 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                +{product.variants.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-foreground">R$ {formatBRL(displayPrice)}</span>
        </div>

        {/* Stock info */}
        {product.trackStock && (
          <p
            className={`text-xs leading-tight ${
              product.stock <= 0
                ? "text-destructive"
                : product.stock <= 5
                  ? "text-amber-600"
                  : "text-muted-foreground"
            }`}
          >
            {product.stock <= 0
              ? "Fora de estoque"
              : product.stock <= 5
                ? `Apenas ${product.stock} em estoque`
                : `${product.stock} em estoque`}
          </p>
        )}
      </CardContent>

      {footer && <CardFooter className="px-3 pb-3 pt-0">{footer}</CardFooter>}
    </Card>
  );
}
