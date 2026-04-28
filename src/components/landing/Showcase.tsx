"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const highlights = [
  "Painel administrativo completo no desktop",
  "Cardápio rápido e bonito no celular do cliente",
  "Checkout com PIX, cartão e dinheiro",
  "Gestão de caixa com fechamento diário",
];

export function Showcase() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-2 gap-14 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="rounded-[2rem] overflow-hidden border border-border shadow-[var(--shadow-elegant)]">
            <img
              src="/images/landing/owner-dashboard.jpg"
              alt="Dono de restaurante usando o painel Food Service"
              loading="lazy"
              width={1280}
              height={960}
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -right-4 sm:right-6 rounded-2xl bg-card border border-border shadow-[var(--shadow-soft)] px-5 py-4 max-w-xs">
            <p className="text-xs text-muted-foreground">Vendas hoje</p>
            <p className="text-2xl font-bold text-foreground">R$ 2.847,90</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full w-[72%] rounded-full"
                style={{ background: "var(--gradient-accent)" }}
              />
            </div>
            <p className="mt-2 text-xs text-accent-foreground font-medium">+24% vs. ontem</p>
          </div>
        </motion.div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent-foreground/80">
            Mockup
          </p>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-foreground">
            Bonito de usar. Fácil de ensinar.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            A mesma plataforma roda no notebook do dono, no tablet do atendente e no celular do
            cliente — sem perder nenhum pedido.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-accent-foreground shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
