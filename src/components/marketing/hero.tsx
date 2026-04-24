import Link from "next/link"

import { Icons } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

export function MarketingHero() {
  return (
    <section className="container flex flex-col items-center justify-center gap-6 py-12 md:py-24 lg:py-32">
      <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
          The Ultimate SaaS Boilerplate
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Built with Next.js 15, TypeScript, Tailwind CSS, Prisma, tRPC, and NextAuth.js.
          Everything you need to build a multi-tenant SaaS application.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/sign-in">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="https://github.com/crislerwin/boilerplate-saas">
            <Button size="lg" variant="outline">
              <Icons.gitHub className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
