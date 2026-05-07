import Link from "next/link";

import { Button } from "@/components/ui/button";

export function MarketingHero() {
  return (
    <section className="container flex flex-col items-center justify-center gap-6 py-12 md:py-24 lg:py-32">
      <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
          Meu Rango — Cardápio Digital &amp; PDV
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          The modern platform to manage your restaurant menus, tenants, and point-of-sale
          operations.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/sign-in">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
