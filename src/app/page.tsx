import { auth } from "@/auth";
import { MarketingHero } from "@/components/marketing/hero";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <MarketingHero />

        <section className="container grid items-center gap-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">Features</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Everything you need to build a production-ready SaaS application.
            </p>
          </div>

          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete auth flow with credentials, OAuth providers (Google, GitHub), and email
                    verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Multi-tenancy</h3>
                  <p className="text-sm text-muted-foreground">
                    Full multi-tenant support with tenant switching, isolation, and role-based
                    access control.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Team Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite team members, assign roles, and collaborate within your organization.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Type Safety</h3>
                  <p className="text-sm text-muted-foreground">
                    End-to-end type safety with TypeScript, tRPC, and Prisma ORM.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Modern UI</h3>
                  <p className="text-sm text-muted-foreground">
                    Beautiful components built with Tailwind CSS, shadcn/ui, and Radix UI
                    primitives.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="space-y-2">
                  <h3 className="font-bold">Developer Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    DX optimized with Biome, type-safe routers, hot reload, and Docker support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href="https://github.com/crislerwin"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              crislerwin
            </a>
            . Open source.
          </p>
        </div>
      </footer>
    </div>
  );
}
