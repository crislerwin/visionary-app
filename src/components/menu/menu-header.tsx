"use client";

import { CartSheet } from "@/components/menu/cart-sheet";
import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface BrandingColors {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  primaryText?: string;
  secondaryText?: string;
}

interface MenuHeaderProps {
  tenant: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    image: string | null;
  };
  colors?: BrandingColors;
}

export function MenuHeader({ tenant, colors }: MenuHeaderProps) {
  const [imgError, setImgError] = useState(false);

  const hasImage = tenant.image && !imgError;
  const bgColor = colors?.primary ?? undefined;
  const txtColor = colors?.primaryText ?? undefined;

  return (
    <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: bgColor }}>
      <div className="flex items-center justify-between px-3 md:px-4 py-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {hasImage ? (
            <Image
              src={tenant.image!}
              alt={tenant.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <ImageIcon className="w-5 h-5" style={{ color: txtColor ?? "#fff" }} />
            </div>
          )}
          <div>
            <h1 className="font-bold text-base" style={{ color: txtColor ?? "#fff" }}>
              {tenant.name}
            </h1>
            {tenant.description && (
              <p
                className="text-xs line-clamp-2 max-w-[200px] md:max-w-md"
                style={{ color: txtColor ? `${txtColor}cc` : "rgba(255,255,255,0.8)" }}
              >
                {tenant.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CartSheet tenantId={tenant.id} tenantSlug={tenant.slug} colors={colors} />
        </div>
      </div>
    </header>
  );
}
