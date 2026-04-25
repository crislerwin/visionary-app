"use client";

import { CartSheet } from "@/components/menu/cart-sheet";
import { ProductCard } from "@/components/menu/product-card";
import { useCartStore } from "@/stores/cart-store";
import { ShoppingCart, Store } from "lucide-react";
import { useEffect } from "react";

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
  const setTenant = useCartStore((state) => state.setTenant);
  const tenantSlug = useCartStore((state) => state.tenantSlug);

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
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {tenant.image ? (
              <img
                src={tenant.image}
                alt={tenant.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-base">{tenant.name}</h1>
              {tenant.description && (
                <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px] md:max-w-md">
                  {tenant.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CartSheet />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pt-4">
        {categories.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-600">Cardápio vazio</h2>
            <p className="text-gray-500 mt-1">Este estabelecimento ainda não adicionou produtos.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <section key={category.id} className="px-4">
                <h2 className="text-lg font-bold mb-4">{category.name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {category.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={{
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        image: product.image,
                        price: Number(product.price),
                        stock: product.stock,
                        trackStock: product.trackStock,
                        variants: product.variants.map((v) => ({
                          id: v.id,
                          name: v.name,
                          price: Number(v.price),
                          stock: v.stock,
                        })),
                      }}
                      tenantSlug={tenant.slug}
                      tenantName={tenant.name}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Cart Bar */}
      {totalItems > 0 && (
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
