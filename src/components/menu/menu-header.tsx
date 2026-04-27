"use client";

import { CartSheet } from "@/components/menu/cart-sheet";
import { ImageIcon } from "lucide-react";

interface MenuHeaderProps {
  tenant: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    image: string | null;
  };
}

export function MenuHeader({ tenant }: MenuHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background border-b">
      <div className="flex items-center justify-between px-3 md:px-4 py-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {tenant.image ? (
            <img
              src={tenant.image}
              alt={tenant.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-base">{tenant.name}</h1>
            {tenant.description && (
              <p className="text-xs text-gray-500 line-clamp-2 max-w-[200px] md:max-w-md">
                {tenant.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CartSheet tenantId={tenant.id} tenantSlug={tenant.slug} />
        </div>
      </div>
    </header>
  );
}
