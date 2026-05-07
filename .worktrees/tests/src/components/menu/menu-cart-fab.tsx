"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ShoppingBag } from "lucide-react";

interface MenuCartFabProps {
  totalQty: number;
  totalPrice: number;
  onClick: () => void;
  colors?: {
    primary?: string;
    primaryText?: string;
  };
}

export function MenuCartFab({ totalQty, totalPrice, onClick, colors }: MenuCartFabProps) {
  return (
    <AnimatePresence>
      {totalQty > 0 && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={onClick}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 sm:gap-3 rounded-full px-5 sm:px-8 py-3.5 sm:py-4 shadow-[var(--shadow-elegant)] hover:scale-[1.02] transition-transform whitespace-nowrap min-w-max max-w-[92vw]"
          style={{
            backgroundColor: colors?.primary ?? "var(--foreground)",
            color: colors?.primaryText ?? "var(--background)",
          }}
        >
          <span className="relative">
            <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
            <span
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{
                backgroundColor: colors?.primaryText ?? "var(--background)",
                color: colors?.primary ?? "var(--foreground)",
              }}
            >
              {totalQty}
            </span>
          </span>
          <span className="font-semibold text-sm sm:text-base">Ver pedido</span>
          <span className="h-4 w-px bg-background/30 hidden sm:inline" />
          <span className="font-semibold text-sm sm:text-base">{formatBRL(totalPrice)}</span>
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
