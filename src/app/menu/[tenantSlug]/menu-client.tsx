"use client";

import { EmptyState, PageContainer } from "@/components/layout/page-layout";
import { CategorySection } from "@/components/menu/category-section";
import { MenuHeader } from "@/components/menu/menu-header";
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
  };
  categories: Array<{
    id: string;
    name: string;
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

export function MenuClient({ tenant, categories }: MenuClientProps) {
  const [mounted, setMounted] = useState(false);
  const setTenant = useCartStore((state) => state.setTenant);
  const tenantSlug = useCartStore((state) => state.tenantSlug);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set tenant when component mounts (only when slug actually changes)
  useEffect(() => {
    if (tenantSlug !== tenant.slug) {
      setTenant(tenant.slug, tenant.name);
    }
  }, [tenant.slug, tenant.name, tenantSlug, setTenant]);

  const totalItems = useCartStore((state) => state.getTotalItems());
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const openCart = useCartStore((state) => state.openCart);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <MenuHeader tenant={tenant} />

      {/* Main Content */}
      <PageContainer className="max-w-7xl mx-auto pt-4">
        {categories.length === 0 ? (
          <EmptyState
            icon={<Store className="w-16 h-16 text-muted-foreground" />}
            title="Cardápio vazio"
            description="Este estabelecimento ainda não adicionou produtos."
          />
        ) : (
          <div className="space-y-6">
            {categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                tenantSlug={tenant.slug}
                tenantName={tenant.name}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {/* Mobile Cart Bar */}
      {mounted && totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-50">
          <button
            type="button"
            onClick={openCart}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 px-4 flex items-center justify-between"
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
