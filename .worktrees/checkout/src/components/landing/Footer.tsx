import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-14 grid gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-xl text-foreground">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <UtensilsCrossed size={18} />
            </span>
            Meu Rango
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            Cardápio digital, pedidos e PDV — feito para o pequeno comércio alimentício brasileiro.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm md:col-span-2 md:justify-end">
          <div>
            <p className="font-semibold text-foreground mb-3">Plataforma</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#funcionalidades" className="hover:text-foreground">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#precos" className="hover:text-foreground">
                  Preços
                </a>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-foreground">
                  Entrar
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-3">Legal</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="/terms" className="hover:text-foreground">
                  Termos de uso
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-foreground">
                  Privacidade
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Meu Rango. Todos os direitos reservados.</p>
          <p>
            Desenvolvido por{" "}
            <span className="font-semibold text-foreground">Reactive Software</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
