import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="flex flex-col items-center gap-3 pt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Bem-vindo de volta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Entre na sua conta para continuar</p>
          </div>
        </CardHeader>

        <CardContent className="pb-8">
          <LoginForm />
        </CardContent>
      </Card>

      <p className="absolute bottom-4 text-center text-xs text-muted-foreground">
        Ao continuar, você concorda com nossos{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Termos de Serviço
        </Link>{" "}
        e{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Política de Privacidade
        </Link>
        .
      </p>
    </main>
  );
}
