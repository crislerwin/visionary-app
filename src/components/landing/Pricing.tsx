import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

const perks = [
  "Cardápio digital ilimitado",
  "Pedidos online sem taxa por venda",
  "PDV e fechamento de caixa",
  "Pagamentos PIX, cartão e dinheiro",
  "Múltiplos usuários e permissões",
  "Suporte humano por WhatsApp",
];

export function Pricing() {
  return (
    <section id="precos" className="py-24">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <div
          className="relative overflow-hidden rounded-[2.5rem] p-10 sm:p-14 text-primary-foreground shadow-[var(--shadow-elegant)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div
            className="absolute -top-32 -right-20 h-96 w-96 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--gradient-accent)" }}
            aria-hidden
          />
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                Comece grátis
              </p>
              <h2 className="mt-3 text-4xl sm:text-5xl font-bold">Plano único, sem pegadinha.</h2>
              <p className="mt-4 text-primary-foreground/80 text-lg">
                Use de graça enquanto valida. Quando crescer, escolhe um plano simples — sem
                comissão por pedido.
              </p>
              <Link
                href="/sign-in"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-background text-foreground px-6 py-3.5 text-sm font-semibold hover:bg-background/90 transition-colors"
              >
                Criar meu cardápio grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-accent/30 grid place-items-center">
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </span>
                  <span className="text-primary-foreground/95">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
