"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLikedProducts } from "@/hooks/use-liked-products";
import { useMediaQuery } from "@/hooks/use-media-query";
import { api } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MenuItem, MenuItemVariant } from "./menu-item-card";

interface MenuItemDetailSheetProps {
  item: MenuItem | null;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: MenuItem, variantId?: string | null, quantity?: number) => void;
  cartQuantity?: number;
  colors?: {
    primary?: string;
    primaryText?: string;
  };
  isFavorite?: boolean;
  likeCount?: number;
  onLikeCountChange?: (count: number) => void;
  onLikeToggle?: () => void;
}

export function MenuItemDetailSheet({
  item,
  tenantId,
  open,
  onOpenChange,
  onAdd,
  cartQuantity = 0,
  colors,
  isFavorite = false,
  likeCount,
  onLikeCountChange,
  onLikeToggle,
}: MenuItemDetailSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  if (!item) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>Detalhes do produto</DialogDescription>
          </DialogHeader>
          <DetailContent
            item={item}
            tenantId={tenantId}
            onAdd={onAdd}
            cartQuantity={cartQuantity}
            colors={colors}
            onClose={() => onOpenChange(false)}
            isFavorite={isFavorite}
            likeCount={likeCount}
            onLikeCountChange={onLikeCountChange}
            onLikeToggle={onLikeToggle}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>{item.name}</SheetTitle>
          <SheetDescription>Detalhes do produto</SheetDescription>
        </SheetHeader>
        <DetailContent
          item={item}
          tenantId={tenantId}
          onAdd={onAdd}
          cartQuantity={cartQuantity}
          colors={colors}
          onClose={() => onOpenChange(false)}
          isFavorite={isFavorite}
          likeCount={likeCount}
          onLikeCountChange={onLikeCountChange}
          onLikeToggle={onLikeToggle}
        />
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

function DetailContent({
  item,
  tenantId,
  onAdd,
  cartQuantity,
  colors,
  onClose,
  isFavorite,
  likeCount,
  onLikeCountChange,
  onLikeToggle,
}: {
  item: MenuItem;
  tenantId: string;
  onAdd: (item: MenuItem, variantId?: string | null, quantity?: number) => void;
  cartQuantity: number;
  colors?: MenuItemDetailSheetProps["colors"];
  onClose: () => void;
  isFavorite: boolean;
  likeCount?: number;
  onLikeCountChange?: (count: number) => void;
  onLikeToggle?: () => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isLiked, toggleLike } = useLikedProducts();

  const liked = isLiked(item.id);

  const addMutation = api.like.add.useMutation({
    onSuccess: (data) => {
      onLikeCountChange?.(data.likeCount);
      onLikeToggle?.();
    },
  });

  const removeMutation = api.like.remove.useMutation({
    onSuccess: (data) => {
      onLikeCountChange?.(data.likeCount);
      onLikeToggle?.();
    },
  });

  useEffect(() => {
    setSelectedVariantId(item.variants.length > 0 ? item.variants[0].id : null);
    setQuantity(1);
    setCurrentImageIndex(0);
    setImgError({});
  }, [item]);

  const selectedVariant = useMemo(
    () => item.variants.find((v) => v.id === selectedVariantId) ?? null,
    [item, selectedVariantId],
  );

  const displayPrice = selectedVariant?.price ?? item.price;
  const isOutOfStock = item.trackStock && item.stock <= 0;
  const variantOutOfStock = selectedVariant && item.trackStock && selectedVariant.stock <= 0;
  const disabled = Boolean(isOutOfStock || variantOutOfStock);

  const isPending = addMutation.isPending || removeMutation.isPending;

  const allImages = useMemo(() => {
    const imgs: { url: string; alt: string }[] = [];
    if (item.image) imgs.push({ url: item.image, alt: item.name });
    for (const img of item.images) {
      if (img.url !== item.image) imgs.push({ url: img.url, alt: item.name });
    }
    return imgs;
  }, [item]);

  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  const handleNextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  const handleAdd = () => {
    if (disabled) return;
    onAdd(item, selectedVariantId, quantity);
    onClose();
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleLike = () => {
    if (isPending) return;
    const willBeLiked = toggleLike(item.id);
    if (willBeLiked) {
      addMutation.mutate({ productId: item.id, tenantId });
    } else {
      removeMutation.mutate({ productId: item.id, tenantId });
    }
  };

  const currentLikeCount = likeCount ?? item.likeCount;

  return (
    <div className="flex flex-col h-full">
      {/* Image Carousel */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-muted shrink-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {allImages.length > 0 && !imgError[allImages[currentImageIndex]?.url] ? (
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <Image
                src={allImages[currentImageIndex].url}
                alt={allImages[currentImageIndex].alt}
                fill
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-cover"
                unoptimized
                priority
                crossOrigin="anonymous"
                onError={() =>
                  setImgError((prev) => ({ ...prev, [allImages[currentImageIndex].url]: true }))
                }
              />
            </motion.div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              Sem imagem
            </div>
          )}
        </AnimatePresence>

        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((img, idx) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setCurrentImageIndex(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    idx === currentImageIndex ? "w-5 bg-white" : "w-2 bg-white/60",
                  )}
                  aria-label={`Ir para imagem ${idx + 1}`}
                  aria-current={idx === currentImageIndex ? "true" : undefined}
                />
              ))}
            </div>
          </>
        )}

        {cartQuantity > 0 && (
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full text-xs font-bold px-3 py-1 shadow-sm"
            style={{
              backgroundColor: colors?.primary ?? "var(--foreground)",
              color: colors?.primaryText ?? "var(--background)",
            }}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {cartQuantity} no carrinho
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{item.name}</h2>
            {item.variants.length === 1 && (
              <p className="text-sm text-muted-foreground mt-1">{item.variants[0].name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLike}
            disabled={isPending}
            aria-label={liked ? `Descurtir ${item.name}` : `Curtir ${item.name}`}
            className="shrink-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rose-500 transition-colors disabled:opacity-60 px-2 py-1 rounded-lg hover:bg-rose-50"
            title={liked ? "Você curtiu" : "Curtir"}
          >
            <Heart
              className={`h-5 w-5 transition-all ${liked ? "fill-rose-500 text-rose-500 scale-110" : ""} ${isFavorite ? "text-rose-400" : ""}`}
            />
            <span className="tabular-nums font-medium">{currentLikeCount}</span>
          </button>
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        )}

        {item.variants.length > 1 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Escolha uma opção</span>
            <div className="flex flex-wrap gap-2">
              {item.variants.map((variant) => (
                <VariantButton
                  key={variant.id}
                  variant={variant}
                  selected={variant.id === selectedVariantId}
                  onClick={() => setSelectedVariantId(variant.id)}
                  disabled={item.trackStock && variant.stock <= 0}
                />
              ))}
            </div>
          </div>
        )}

        {item.trackStock && (
          <StockInfo
            stock={selectedVariant?.stock ?? item.stock}
            isVariant={item.variants.length > 1}
          />
        )}

        <div className="pt-2">
          <span className="text-3xl font-bold text-foreground">{formatBRL(displayPrice)}</span>
          {quantity > 1 && (
            <span className="ml-2 text-sm text-muted-foreground">
              Total: {formatBRL(displayPrice * quantity)}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t px-5 py-4 space-y-3 bg-background">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors disabled:opacity-40"
            aria-label="Diminuir quantidade"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-lg font-semibold w-6 text-center" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => handleQuantityChange(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
            aria-label="Aumentar quantidade"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-base transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: colors?.primary ?? "var(--foreground)",
            color: colors?.primaryText ?? "var(--background)",
          }}
        >
          <ShoppingBag className="h-5 w-5" />
          {disabled
            ? isOutOfStock || variantOutOfStock
              ? "Indisponível"
              : "Adicionar"
            : `Adicionar ${quantity} ao carrinho`}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VariantButton({
  variant,
  selected,
  onClick,
  disabled,
}: {
  variant: MenuItemVariant;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-all",
        selected
          ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
          : "border-border hover:border-foreground/30",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span className="text-sm font-medium">{variant.name}</span>
      <span className="text-xs text-muted-foreground">{formatBRL(variant.price)}</span>
      {disabled && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-destructive bg-background/80 rounded-xl">
          Esgotado
        </span>
      )}
    </button>
  );
}

function StockInfo({ stock, isVariant }: { stock: number; isVariant: boolean }) {
  if (stock <= 0) {
    return (
      <p className="text-sm text-destructive font-medium">
        {isVariant ? "Opção esgotada" : "Esgotado"}
      </p>
    );
  }
  if (stock <= 5) {
    return (
      <p className="text-sm text-amber-600 font-medium">
        {isVariant ? `Apenas ${stock} disponível` : `Apenas ${stock} em estoque`}
      </p>
    );
  }
  return null;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
