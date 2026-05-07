"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileX2, MessageCircleX, TrendingDown } from "lucide-react";

const problems = [
  {
    icon: MessageCircleX,
    pain: "Pedidos pelo WhatsApp bagunçados",
    fix: "Pedidos chegam organizados no painel, com status em tempo real.",
  },
  {
    icon: FileX2,
    pain: "Cardápio em PDF desatualizado",
    fix: "Cardápio digital sempre atual, com fotos, variantes e preço certo.",
  },
  {
    icon: TrendingDown,
    pain: "Não sabe quanto vendeu no dia",
    fix: "Caixa registradora com fechamento, entradas, saídas e relatórios.",
  },
];

export function ProblemSolution() {
  return (
    <section className="py-24 bg-secondary/40 border-y border-border">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent-foreground/80">
            O problema
          </p>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-foreground">
            Você não precisa mais conviver com isso.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            As mesmas dores se repetem em todo restaurante. A boa notícia: dá pra resolver em uma
            tarde.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <motion.div
              key={p.pain}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-3xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-shadow"
            >
              <div className="h-11 w-11 rounded-xl bg-destructive/10 grid place-items-center text-destructive">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground line-through decoration-destructive/60 decoration-2">
                {p.pain}
              </h3>
              <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4 mt-0.5 text-accent-foreground shrink-0" />
                <span>{p.fix}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
