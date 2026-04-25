"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useCartStore } from "@/stores/cart-store";
import { Check, Plus, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  stock: number;
  trackStock: boolean;
  variants: ProductVariant[];
}

interface ProductCardProps {
  product: Product;
  tenantSlug: string;
  tenantName: string;
}

export function ProductCard({ product, tenantSlug, tenantName }: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length > 0 ? product.variants[0] : null,
  );
  const [added, setAdded] = useState(false);
  const { addItem, setTenant, getItemCount } = useCartStore();

  const displayPrice = selectedVariant?.price ?? product.price;
  const isOutOfStock = product.trackStock && product.stock <= 0;
  const variantOutOfStock = selectedVariant && product.trackStock && selectedVariant.stock <= 0;

  const currentQuantity = getItemCount(product.id, selectedVariant?.id ?? null);

  const handleAddToCart = () => {
    if (isOutOfStock || variantOutOfStock) return;

    // Set tenant if not set
    setTenant(tenantSlug, tenantName);

    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      price: Number(displayPrice),
      quantity: 1,
      notes: "",
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Product Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <ShoppingCart className="size-12 opacity-50" />
          </div>
        )}
        {currentQuantity > 0 && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
            {currentQuantity} no carrinho
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
        {product.description && (
          <CardDescription className="line-clamp-2">{product.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Variant Selector */}
        {product.variants.length > 0 && (
          <Select
            value={selectedVariant?.id ?? ""}
            onValueChange={(value) => {
              const variant = product.variants.find((v) => v.id === value);
              setSelectedVariant(variant ?? null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {product.variants.map((variant) => (
                <SelectItem key={variant.id} value={variant.id}>
                  <span className="flex items-center justify-between gap-2">
                    <span>{variant.name}</span>
                    <span className="text-muted-foreground">
                      R${" "}
                      {variant.price.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            R${" "}
            {displayPrice.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </span>
          {product.variants.length === 0 && product.variants[0] && (
            <span className="text-sm text-muted-foreground">{product.variants[0].name}</span>
          )}
        </div>

        {/* Stock Warning */}
        {product.trackStock && product.stock <= 5 && product.stock > 0 && (
          <p className="text-xs text-amber-600">Apenas {product.stock} em estoque</p>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          disabled={isOutOfStock || variantOutOfStock || added}
          variant={added ? "secondary" : "default"}
          onClick={handleAddToCart}
        >
          {added ? (
            <>
              <Check className="size-4 mr-2" />
              Adicionado!
            </>
          ) : isOutOfStock || variantOutOfStock ? (
            "Indisponível"
          ) : (
            <>
              <Plus className="size-4 mr-2" />
              Adicionar
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
