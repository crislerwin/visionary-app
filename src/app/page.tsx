import { auth } from "@/auth";
import { MarketingHero } from "@/components/marketing/hero";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.id) {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
    });

    if (membership) {
      redirect("/dashboard");
    }

    redirect("/setup");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <MarketingHero />

        <section className="container grid items-center gap-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
              Welcome to Food Service
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Your digital menu and point-of-sale platform. Manage tenants, orders, and menus with
              ease.
            </p>
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
