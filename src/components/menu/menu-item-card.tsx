"use client";

import { useLikedProducts } from "@/hooks/use-liked-products";
import { api } from "@/lib/trpc/react";
import { motion } from "framer-motion";
import { Eye, Heart, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { MenuItemDetailSheet } from "./menu-item-detail-sheet";

export interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface MenuItemImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
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
  images: MenuItemImage[];
  likeCount: number;
}

interface MenuItemCardProps {
  item: MenuItem;
  tenantId: string;
  onAdd: (item: MenuItem, variantId?: string | null, quantity?: number) => void;
  cartQuantity?: number;
  colors?: {
    primary?: string;
    primaryText?: string;
  };
  isFavorite?: boolean;
  onLikeToggle?: () => void;
}

export function MenuItemCard({
  item,
  tenantId,
  onAdd,
  cartQuantity = 0,
  colors,
  isFavorite = false,
  onLikeToggle,
}: MenuItemCardProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    item.variants.length > 0 ? item.variants[0].id : null,
  );
  const [imgError, setImgError] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(item.likeCount);
  const { isLiked, toggleLike } = useLikedProducts();

  const liked = isLiked(item.id);

  const addMutation = api.like.add.useMutation({
    onSuccess: (data) => {
      setLocalLikeCount(data.likeCount);
      onLikeToggle?.();
    },
  });

  const removeMutation = api.like.remove.useMutation({
    onSuccess: (data) => {
      setLocalLikeCount(data.likeCount);
      onLikeToggle?.();
    },
  });

  const selectedVariant = item.variants.find((v) => v.id === selectedVariantId) ?? null;
  const displayPrice = selectedVariant?.price ?? item.price;
  const isOutOfStock = item.trackStock && item.stock <= 0;
  const variantOutOfStock = selectedVariant && item.trackStock && selectedVariant.stock <= 0;
  const disabled = Boolean(isOutOfStock || variantOutOfStock);

  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onAdd(item, selectedVariantId);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;
    const willBeLiked = toggleLike(item.id);
    if (willBeLiked) {
      addMutation.mutate({ productId: item.id, tenantId });
    } else {
      removeMutation.mutate({ productId: item.id, tenantId });
    }
  };

  const handleCardClick = () => {
    setDetailOpen(true);
  };

  const handleSelectPointerDown = (e: React.PointerEvent<HTMLSelectElement>) => {
    e.stopPropagation();
  };

  const handleSelectKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    e.stopPropagation();
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        onClick={handleCardClick}
        className={`group relative flex gap-4 p-3 rounded-2xl bg-card border hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer ${
          isFavorite
            ? "border-rose-400/60 hover:border-rose-500"
            : "border-border hover:border-foreground/20"
        }`}
        // biome-ignore lint/a11y/useSemanticElements: nested interactive elements (select, add button) prevent native <button>
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`Ver detalhes de ${item.name}`}
      >
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-xl bg-muted">
          {item.image && !imgError ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="128px"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
              unoptimized
              loading="lazy"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
              Sem imagem
            </div>
          )}
          {isFavorite && (
            <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full text-[10px] font-bold px-2 py-0.5 bg-rose-500 text-white">
              <Heart className="h-3 w-3 fill-current" />
              Favorito
            </span>
          )}
          {cartQuantity > 0 && !isFavorite && (
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
          {/* Hover overlay to indicate expand */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl">
            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground leading-tight">{item.name}</h3>
            <button
              type="button"
              onClick={handleLike}
              disabled={isPending}
              aria-label={liked ? `Descurtir ${item.name}` : `Curtir ${item.name}`}
              className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition-colors disabled:opacity-60"
              title={liked ? "Você curtiu" : "Curtir"}
            >
              <Heart
                className={`h-4 w-4 transition-all ${liked ? "fill-rose-500 text-rose-500 scale-110" : ""}`}
              />
              <span className="tabular-nums">{localLikeCount}</span>
            </button>
          </div>
          {item.variants.length > 1 && (
            <select
              value={selectedVariantId ?? ""}
              onChange={(e) => setSelectedVariantId(e.target.value || null)}
              className="mt-1 text-xs bg-transparent border border-border rounded-md px-2 py-0.5 w-fit text-muted-foreground"
              onPointerDown={handleSelectPointerDown}
              onKeyDown={handleSelectKeyDown}
              onClick={(e) => e.stopPropagation()}
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
      </motion.div>

      <MenuItemDetailSheet
        item={item}
        tenantId={tenantId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAdd={onAdd}
        cartQuantity={cartQuantity}
        colors={colors}
        isFavorite={isFavorite}
        likeCount={localLikeCount}
        onLikeCountChange={setLocalLikeCount}
        onLikeToggle={onLikeToggle}
      />
    </>
  );
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
