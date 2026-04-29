"use client";

import { MenuCartDrawer } from "@/components/menu/menu-cart-drawer";
import { MenuCartFab } from "@/components/menu/menu-cart-fab";
import { MenuHero } from "@/components/menu/menu-hero";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { MenuSearchBar } from "@/components/menu/menu-search-bar";
import type { CustomerForm, PaymentOptions } from "@/components/settings/checkout-config-editor";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { getSocialConfig } from "@/lib/tenant-social";
import { useCartStore } from "@/stores/cart-store";
import { Store } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface MenuClientProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    whatsappPhone: string | null;
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
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [cartOpen, setCartOpen] = useState(false);

  const colors = getBrandingColors(tenant.config);
  const social = getSocialConfig(tenant.config, tenant);
  const cfg = tenant.config as Record<string, unknown> | null;
  const businessHours = cfg?.businessHours;
  const timezone = (cfg?.timezone as string) || "America/Sao_Paulo";
  const paymentOptions = cfg?.paymentOptions;
  useTenantBranding(tenant.config, tenant.slug);

  const { addItem, setTenant, getTotalItems, getTotalPrice, getProductTotalCount } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTenant(tenant.slug, tenant.name, tenant.id);
  }, [tenant.slug, tenant.name, tenant.id, setTenant]);

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, query]);

  // Scroll spy — detecta qual seção está visível e ativa a respectiva categoria
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const categoryIds = useMemo(() => filteredCategories.map((c) => c.id), [filteredCategories]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pega a entrada que está mais próxima do topo da viewport
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topmost = visible.reduce((prev, curr) =>
            curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev,
          );
          setActiveCategory(topmost.target.id);
        }
      },
      { rootMargin: "-25% 0px -50% 0px", threshold: 0 },
    );

    for (const el of Object.values(sectionRefs.current)) {
      if (el) observer.observe(el);
    }

    // Fallback: quando o usuário rola até o final da página,
    // seleciona a última categoria se ela estiver visível
    const handleScroll = () => {
      const scrollBottom = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollBottom >= docHeight - 100 && categoryIds.length > 0) {
        setActiveCategory(categoryIds[categoryIds.length - 1]);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [categoryIds]);

  const scrollToCategory = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 180;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveCategory(id);
    }
  };

  const handleAddToCart = (
    product: MenuClientProps["categories"][number]["products"][number],
    variantId?: string | null,
  ) => {
    const variant = product.variants.find((v) => v.id === variantId) ?? null;
    const price = variant?.price ?? product.price;

    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      variantId: variantId ?? null,
      variantName: variant?.name ?? null,
      price: Number(price),
      quantity: 1,
      notes: "",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <MenuHero
        tenant={tenant}
        colors={colors}
        social={social}
        businessHours={businessHours}
        timezone={timezone}
      />

      <MenuSearchBar
        categories={filteredCategories.map((c) => ({ id: c.id, name: c.name }))}
        query={query}
        onQueryChange={setQuery}
        activeCategory={activeCategory}
        onCategoryClick={scrollToCategory}
        colors={colors}
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 mt-8 space-y-14">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {query.trim() ? `Nenhum item encontrado para "${query}"` : "Cardápio vazio"}
            </p>
            <p className="text-sm">
              {query.trim()
                ? "Tente buscar por outro termo."
                : "Este estabelecimento ainda não adicionou produtos."}
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section
              key={category.id}
              id={category.id}
              ref={(el) => {
                sectionRefs.current[category.id] = el;
              }}
              className="scroll-mt-44"
            >
              <div className="flex items-end justify-between mb-5">
                <h2
                  className="text-2xl md:text-3xl font-bold text-foreground"
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                >
                  {category.name}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {category.products.length} {category.products.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {category.products.map((product) => (
                  <MenuItemCard
                    key={product.id}
                    item={product}
                    onAdd={handleAddToCart}
                    cartQuantity={getProductTotalCount(product.id)}
                    colors={colors}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {mounted && (
        <>
          <MenuCartFab
            totalQty={totalItems}
            totalPrice={totalPrice}
            onClick={() => setCartOpen(true)}
            colors={colors}
          />
          <MenuCartDrawer
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            tenantId={tenant.id}
            tenantSlug={tenant.slug}
            colors={colors}
            paymentOptions={paymentOptions as PaymentOptions}
            whatsappPhone={tenant.whatsappPhone}
            customerForm={cfg?.customerForm as CustomerForm}
          />
        </>
      )}
    </div>
  );
}
