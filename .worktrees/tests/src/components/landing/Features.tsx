"use client";

import { motion } from "framer-motion";
import { Calculator, CreditCard, Palette, QrCode, ShoppingBag, Users } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Cardápio Digital",
    desc: "QR Code, link personalizado, fotos dos pratos e variantes (tamanhos, sabores, adicionais).",
  },
  {
    icon: ShoppingBag,
    title: "Pedidos Online",
    desc: "Receba delivery, retirada e pedidos na mesa com notificações em tempo real.",
  },
  {
    icon: Calculator,
    title: "Caixa Registradora",
    desc: "Abertura e fechamento de caixa, entradas, saídas e relatórios diários.",
  },
  {
    icon: Palette,
    title: "Personalização",
    desc: "Cores, logo e identidade visual do seu estabelecimento aplicados ao cardápio.",
  },
  {
    icon: Users,
    title: "Múltiplos usuários",
    desc: "Convide sua equipe com permissões: admin, atendente ou visualizador.",
  },
  {
    icon: CreditCard,
    title: "Pagamentos",
    desc: "PIX, cartão, dinheiro e outros métodos prontos para uso.",
  },
];

export function Features() {
  return (
    <section id="funcionalidades" className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-5xl">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-foreground/80">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-foreground max-w-2xl">
              Tudo que seu restaurante precisa, em um só painel.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Sem integrações complicadas. Sem mensalidade absurda. Foco no que importa: vender mais e
            atender melhor.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-3xl overflow-hidden border border-border">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="bg-card p-8 hover:bg-secondary/60 transition-colors group"
            >
              <div
                className="h-12 w-12 rounded-2xl grid place-items-center text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
