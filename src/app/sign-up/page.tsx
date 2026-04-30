import { auth } from "@/auth";
import { SignUpForm } from "@/components/auth/signup-form";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

import "../landing-theme.css";

export default async function SignUpPage() {
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
    <div className="landing-theme min-h-screen bg-background text-foreground">
      <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        {/* Left Panel — Brand */}
        <div className="relative hidden h-full flex-col p-10 lg:flex text-foreground bg-white/10 backdrop-blur-sm border-r border-white/10">
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: "var(--gradient-hero)" }}
            aria-hidden
          />
          <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
              >
                <title>Meu Rango logo</title>
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
            </span>
            <span className="font-semibold tracking-tight">Meu Rango</span>
          </div>
          <div className="relative z-20 mt-auto space-y-4">
            <blockquote className="text-xl font-medium leading-relaxed text-foreground">
              "Comece a vender online em minutos."
            </blockquote>
            <p className="text-sm text-muted-foreground">
              Crie sua conta gratuita e tenha acesso a um cardápio digital profissional, pedidos via
              WhatsApp e controle de caixa integrado.
            </p>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="flex h-full items-center justify-center p-6 lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                Criar conta
              </h1>
              <p className="text-sm text-muted-foreground">Preencha os dados abaixo para começar</p>
            </div>
            <SignUpForm />
            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/sign-in" className="underline underline-offset-4 hover:text-primary">
                Faça login
              </Link>
            </p>
            <p className="px-8 text-center text-xs text-muted-foreground">
              Ao criar uma conta, você concorda com nossos{" "}
              <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                Termos de Serviço
              </Link>{" "}
              e{" "}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
