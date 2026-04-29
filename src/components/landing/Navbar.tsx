import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-soft)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <UtensilsCrossed className="h-4.5 w-4.5" size={18} />
          </span>
          Food Service
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#funcionalidades" className="hover:text-foreground transition-colors">
            Funcionalidades
          </a>
          <a href="#como-funciona" className="hover:text-foreground transition-colors">
            Como funciona
          </a>
          <a href="#depoimentos" className="hover:text-foreground transition-colors">
            Depoimentos
          </a>
          <a href="#precos" className="hover:text-foreground transition-colors">
            Preços
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/sign-up"
            className="hidden sm:inline text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Criar conta
          </Link>
          <a
            href="https://wa.me/5562981878663"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            Fale conosco
          </a>
        </div>
      </div>
    </header>
  );
}
