"use client";

import { EmptyState, PageContainer } from "@/components/layout/page-layout";
import { CategorySection } from "@/components/menu/category-section";
import { MenuHeader } from "@/components/menu/menu-header";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { useCartStore } from "@/stores/cart-store";
import { ShoppingCart, Store } from "lucide-react";
import { useEffect, useState } from "react";

interface MenuClientProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    config: unknown;
  };
  categories: Array<{
    id: string;
    name: string;
    image: string | null;
    products: Array<{
      id: string;
      name: string;
      description: string | null;
      image: string | null;
      price: number;
      stock: number;
      trackStock: boolean;
      variants: Array<{
        id: string;
        name: string;
        price: number;
        stock: number;
      }>;
    }>;
  }>;
}

function getBrandingColors(config: unknown) {
  const cfg = config as Record<string, unknown> | null;
  const branding = (cfg?.branding as Record<string, unknown>) ?? {};
  const colors = (branding.colors as Record<string, string>) ?? {};
  return {
    primary: colors.primary ?? undefined,
    secondary: colors.secondary ?? undefined,
    background: colors.background ?? undefined,
    text: colors.text ?? undefined,
    primaryText: colors.primaryText ?? undefined,
    secondaryText: colors.secondaryText ?? undefined,
  };
}

export function MenuClient({ tenant, categories }: MenuClientProps) {
  const [mounted, setMounted] = useState(false);
  const setTenant = useCartStore((state) => state.setTenant);

  const colors = getBrandingColors(tenant.config);
  useTenantBranding(tenant.config, tenant.slug);

  // Debug - log colors to verify they're being extracted
  useEffect(() => {
    console.log("[MenuClient] Tenant config:", tenant.config);
    console.log("[MenuClient] Extracted colors:", colors);
  }, [tenant.config, colors]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set tenant when component mounts (always update to ensure tenantId is set)
  useEffect(() => {
    setTenant(tenant.slug, tenant.name, tenant.id);
  }, [tenant.slug, tenant.name, tenant.id, setTenant]);

  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const openCart = useCartStore((state) => state.openCart);

  return (
    <div
      className="min-h-screen pb-24 md:pb-8"
      style={{ backgroundColor: colors.background ?? undefined }}
    >
      <MenuHeader tenant={tenant} colors={colors} />

      {/* Main Content */}
      <PageContainer className="max-w-7xl mx-auto pt-4">
        {categories.length === 0 ? (
          <EmptyState
            icon={<Store className="w-16 h-16 text-muted-foreground" />}
            title="Cardápio vazio"
            description="Este estabelecimento ainda não adicionou produtos."
          />
        ) : (
          <div className="space-y-6" style={{ color: colors.text ?? undefined }}>
            {categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                tenantSlug={tenant.slug}
                tenantName={tenant.name}
                tenantId={tenant.id}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {/* Mobile Cart Bar */}
      {mounted && totalItems > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 border-t p-4 md:hidden z-50"
          style={{ backgroundColor: colors.background ?? "#fff" }}
        >
          <button
            type="button"
            onClick={openCart}
            className="w-full rounded-lg py-3 px-4 flex items-center justify-between"
            style={{
              backgroundColor: colors.primary ?? undefined,
              color: colors.primaryText ?? undefined,
            }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span>{totalItems} item(s)</span>
            </div>
            <span className="font-bold">
              R${" "}
              {totalPrice.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
