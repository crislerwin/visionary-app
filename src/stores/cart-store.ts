import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  variantId?: string | null;
  variantName?: string | null;
  price: number;
  quantity: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  tenantSlug: string | null;
  tenantName: string | null;
  isOpen: boolean;
}

interface CartActions {
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  clearCart: () => void;
  setTenant: (slug: string, name: string) => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemCount: (productId: string, variantId?: string | null) => number;
}

const generateCartItemId = (productId: string, variantId?: string | null): string => {
  return variantId ? `${productId}:${variantId}` : productId;
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      items: [],
      tenantSlug: null,
      tenantName: null,
      isOpen: false,

      addItem: (item) => {
        const { items, tenantSlug: currentTenantSlug } = get();
        const itemId = generateCartItemId(item.productId, item.variantId);

        // Reset cart if different tenant
        let newItems = items;
        if (currentTenantSlug && currentTenantSlug !== item.productId.split("-")[0]) {
          // Check if this is a different tenant by comparing slugs
          // We'll rely on the component to set the tenant before adding items
        }

        const existingItem = items.find(
          (i) => i.productId === item.productId && i.variantId === item.variantId,
        );

        if (existingItem) {
          newItems = items.map((i) =>
            i.id === existingItem.id ? { ...i, quantity: i.quantity + item.quantity } : i,
          );
        } else {
          newItems = [
            ...items,
            {
              ...item,
              id: itemId,
            },
          ];
        }

        set({ items: newItems, isOpen: true });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, quantity } : item)),
        }));
      },

      updateNotes: (id, notes) => {
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, notes } : item)),
        }));
      },

      clearCart: () => {
        set({ items: [], tenantSlug: null, tenantName: null });
      },

      setTenant: (slug, name) => {
        const { tenantSlug } = get();
        if (tenantSlug && tenantSlug !== slug) {
          // Different tenant - clear cart
          set({ items: [], tenantSlug: slug, tenantName: name });
        } else {
          set({ tenantSlug: slug, tenantName: name });
        }
      },

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getItemCount: (productId, variantId) => {
        const item = get().items.find(
          (i) => i.productId === productId && i.variantId === variantId,
        );
        return item?.quantity ?? 0;
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        tenantSlug: state.tenantSlug,
        tenantName: state.tenantName,
      }),
    },
  ),
);
