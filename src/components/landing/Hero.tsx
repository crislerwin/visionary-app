"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, PlayCircle, QrCode, Sparkles } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-16 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-12 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-7"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Novidade · PIX integrado e pedidos na mesa
          </span>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] text-foreground">
            Seu restaurante <em className="not-italic text-primary-glow">digital</em>
            <br />
            em minutos.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
            Cardápio digital com QR Code, pedidos online e PDV — tudo em uma única plataforma feita
            para restaurantes, lanchonetes e food trucks no Brasil.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/request-access"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Solicitar acesso
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://wa.me/5562981878663"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Fale com nosso time
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <PlayCircle className="h-4 w-4" />
              Ver demonstração
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-accent" /> Sem taxa por pedido
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-accent" /> Setup em 5 minutos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-accent" /> Suporte humano
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 relative"
        >
          <div className="relative rounded-[2rem] overflow-hidden shadow-[var(--shadow-elegant)] border border-border bg-card">
            <img
              src="/images/landing/hero-phone.jpg"
              alt="Cardápio digital Meu Rango em smartphone"
              width={1024}
              height={1280}
              className="w-full h-auto object-cover"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="absolute -left-6 bottom-10 hidden sm:flex items-center gap-3 rounded-2xl bg-card/95 backdrop-blur border border-border px-4 py-3 shadow-[var(--shadow-soft)]"
          >
            <div className="h-10 w-10 rounded-xl bg-accent/15 grid place-items-center">
              <QrCode className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">QR Code do cardápio</p>
              <p className="text-sm font-semibold text-foreground">/menu/seu-restaurante</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="absolute -right-4 top-10 hidden sm:flex flex-col rounded-2xl bg-card/95 backdrop-blur border border-border px-4 py-3 shadow-[var(--shadow-soft)]"
          >
            <p className="text-xs text-muted-foreground">Pedido recebido</p>
            <p className="text-sm font-semibold text-foreground">Mesa 12 · R$ 87,40</p>
            <span className="mt-1 inline-flex w-fit text-[10px] font-semibold uppercase tracking-wider text-accent-foreground bg-accent/30 rounded-full px-2 py-0.5">
              PIX pago
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
