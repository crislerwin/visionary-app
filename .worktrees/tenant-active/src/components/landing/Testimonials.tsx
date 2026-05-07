"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Mariana Costa",
    role: "Dona da Hamburgueria Trinca",
    quote:
      "Em uma semana parei de perder pedido no WhatsApp. O fechamento de caixa que antes levava 1h agora sai em 5 minutos.",
  },
  {
    name: "Rafael Souza",
    role: "Food truck Tacos do Rafa",
    quote:
      "Coloquei o QR Code no balcão e pronto. O cliente pede, paga no PIX e eu só preparo. Mudou meu negócio.",
  },
  {
    name: "Juliana Mendes",
    role: "Padaria Pão & Mel",
    quote:
      "Meu marido ainda não acredita que conseguimos colocar tudo no ar em uma tarde. O suporte respondeu na hora.",
  },
];

export function Testimonials() {
  return (
    <section id="depoimentos" className="py-24 bg-secondary/40 border-y border-border">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent-foreground/80">
            Depoimentos
          </p>
          <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-foreground">
            Quem usa, recomenda.
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-3xl bg-card border border-border p-7 shadow-[var(--shadow-soft)] flex flex-col"
            >
              <div className="flex gap-1 text-warm">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={`${t.name}-star-${k}`} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-foreground leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-border">
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
