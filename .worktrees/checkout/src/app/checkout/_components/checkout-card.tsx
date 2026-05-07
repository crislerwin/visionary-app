"use client";

import { motion } from "framer-motion";

export function CheckoutCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-xl">{title}</h2>
        {badge && (
          <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground bg-muted rounded-full px-3 py-1">
            {badge}
          </span>
        )}
      </div>
      {children}
    </motion.section>
  );
}
