"use client";

import { ProductCard as BaseProductCard, type ProductCardProduct } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  stock: number;
  trackStock: boolean;
  variants: ProductVariant[];
}

interface MenuProductCardProps {
  product: Product;
  tenantSlug: string;
  tenantName: string;
}

export function ProductCard({ product, tenantSlug, tenantName }: MenuProductCardProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants.length > 0 ? product.variants[0].id : null,
  );
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { addItem, setTenant, getItemCount } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null;
  const displayPrice = selectedVariant?.price ?? product.price;
  const isOutOfStock = product.trackStock && product.stock <= 0;
  const variantOutOfStock = selectedVariant && product.trackStock && selectedVariant.stock <= 0;

  const currentQuantity = getItemCount(product.id, selectedVariantId);

  const handleAddToCart = () => {
    if (isOutOfStock || variantOutOfStock) return;

    setTenant(tenantSlug, tenantName);

    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      variantId: selectedVariantId,
      variantName: selectedVariant?.name ?? null,
      price: Number(displayPrice),
      quantity: 1,
      notes: "",
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const baseProduct: ProductCardProduct = {
    ...product,
    category: undefined,
  };

  return (
    <BaseProductCard
      product={baseProduct}
      selectedVariantId={selectedVariantId}
      onVariantChange={setSelectedVariantId}
      badge={
        mounted && currentQuantity > 0 ? (
          <Badge className="bg-primary text-primary-foreground shadow-sm text-xs">
            {currentQuantity} no carrinho
          </Badge>
        ) : undefined
      }
      footer={
        <Button
          className="w-full"
          size="sm"
          disabled={isOutOfStock || variantOutOfStock || added}
          variant={added ? "secondary" : "default"}
          onClick={handleAddToCart}
        >
          {added ? (
            <>
              <Check className="size-4 mr-1.5" />
              Adicionado!
            </>
          ) : isOutOfStock || variantOutOfStock ? (
            "Indisponível"
          ) : (
            <>
              <Plus className="size-4 mr-1.5" />
              Adicionar
            </>
          )}
        </Button>
      }
    />
  );
}
