import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  updateNotes: (productId: string, notes: string, variantId?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find(
          (i) => i.productId === item.productId && i.variantId === item.variantId,
        );

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.productId === item.productId && i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            ),
          });
        } else {
          set({ items: [...items, item] });
        }
      },

      removeItem: (productId, variantId) => {
        const { items } = get();
        set({
          items: items.filter((i) => !(i.productId === productId && i.variantId === variantId)),
        });
      },

      updateQuantity: (productId, quantity, variantId) => {
        const { items } = get();
        if (quantity <= 0) {
          set({
            items: items.filter((i) => !(i.productId === productId && i.variantId === variantId)),
          });
        } else {
          set({
            items: items.map((i) =>
              i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i,
            ),
          });
        }
      },

      updateNotes: (productId, notes, variantId) => {
        const { items } = get();
        set({
          items: items.map((i) =>
            i.productId === productId && i.variantId === variantId ? { ...i, notes } : i,
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: "cart-storage",
    },
  ),
);
