"use client";

import { motion } from "framer-motion";
import { BellRing, ListPlus, Share2, Store } from "lucide-react";

const steps = [
  {
    icon: Store,
    title: "Crie seu estabelecimento",
    desc: "Cadastre nome, logo e cores em poucos cliques.",
  },
  {
    icon: ListPlus,
    title: "Cadastre produtos e categorias",
    desc: "Adicione fotos, preços e variantes do cardápio.",
  },
  {
    icon: Share2,
    title: "Compartilhe o QR Code",
    desc: "Imprima na mesa ou envie o link para o cliente.",
  },
  {
    icon: BellRing,
    title: "Receba e gerencie pedidos",
    desc: "Acompanhe pelo painel e feche o caixa no fim do dia.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 bg-secondary/40 border-y border-border">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent-foreground/80">
            Como funciona
          </p>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-foreground">
            Quatro passos. Uma tarde. Pronto.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Sem treinamento, sem instalação. Você sai daqui com o cardápio funcionando hoje mesmo.
          </p>
          <div className="mt-8 rounded-3xl overflow-hidden border border-border shadow-[var(--shadow-soft)]">
            <img
              src="/images/landing/food-spread.jpg"
              alt="Pratos diversos representando o cardápio"
              loading="lazy"
              width={1280}
              height={960}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
        <ol className="lg:col-span-7 space-y-4">
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex items-start gap-5 rounded-3xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]"
            >
              <div
                className="shrink-0 h-14 w-14 rounded-2xl grid place-items-center text-primary-foreground relative"
                style={{ background: "var(--gradient-primary)" }}
              >
                <s.icon className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-accent text-accent-foreground text-xs font-bold grid place-items-center border-2 border-background">
                  {i + 1}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
