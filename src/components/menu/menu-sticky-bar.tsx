"use client";

import type { TenantSocialConfig } from "@/lib/tenant-social";
import { Clock, Instagram, Star } from "lucide-react";

interface MenuStickyBarProps {
  social?: TenantSocialConfig;
}

export function MenuStickyBar({ social }: MenuStickyBarProps) {
  if (!social) return null;

  const stars = social.googleStars ?? 4.9;
  const delivery = social.deliveryTime;
  const hasInstagram = Boolean(social.instagram);

  if (!delivery && !hasInstagram) return null;

  return (
    <div className="sticky top-[env(navbar-height,0px)] z-40 bg-background/85 backdrop-blur-xl border-b border-border">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-2 flex items-center gap-3 text-sm text-muted-foreground">
        {delivery && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {delivery}
          </span>
        )}
        {stars > 0 && (
          <span className="inline-flex items-center gap-1" title="Avaliação Google">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {stars.toFixed(1)}
          </span>
        )}
        {hasInstagram && (
          <a
            href={`https://instagram.com/${social.instagram!.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
          >
            <Instagram className="h-3.5 w-3.5" /> @{social.instagram!.replace(/^@/, "")}
          </a>
        )}
      </div>
    </div>
  );
}
