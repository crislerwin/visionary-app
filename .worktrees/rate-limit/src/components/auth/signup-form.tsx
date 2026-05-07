"use client";

import { api } from "@/lib/trpc/react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SignUpFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SignUpForm({ className, ...props }: SignUpFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);

  const signUp = api.auth.signUp.useMutation({
    onError: (err) => {
      setError(err.message || "Erro ao criar conta");
      setIsLoading(false);
    },
    onSuccess: () => {
      setSuccess(true);
      setIsLoading(false);
    },
  });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const terms = (event.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>(
      'input[name="terms"]',
    )?.checked;

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    if (!terms) {
      setError("Você deve aceitar os termos de serviço");
      setIsLoading(false);
      return;
    }

    signUp.mutate({
      name,
      email,
      password,
    });
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
          <Icons.check className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold">Conta criada!</h3>
        <p className="text-sm text-muted-foreground">
          Sua conta foi criada com sucesso. Agora você pode fazer login.
        </p>
        <Button asChild className="w-full rounded-full">
          <Link href="/sign-in">Fazer login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nome completo
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Seu nome"
              type="text"
              autoCapitalize="words"
              autoComplete="name"
              disabled={isLoading}
              required
              className="h-11 rounded-xl border-border bg-card px-4 transition-colors focus-visible:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-sm font-medium">
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              placeholder="nome@exemplo.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              required
              className="h-11 rounded-xl border-border bg-card px-4 transition-colors focus-visible:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Senha
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              disabled={isLoading}
              required
              minLength={8}
              className="h-11 rounded-xl border-border bg-card px-4 transition-colors focus-visible:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmar senha
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              autoComplete="new-password"
              disabled={isLoading}
              required
              className="h-11 rounded-xl border-border bg-card px-4 transition-colors focus-visible:ring-ring"
            />
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox id="terms" name="terms" className="mt-1" />
            <Label
              htmlFor="terms"
              className="text-xs text-muted-foreground font-normal leading-tight"
            >
              Aceito os{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-primary">
                Termos de Serviço
              </Link>{" "}
              e{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-primary">
                Política de Privacidade
              </Link>
            </Label>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button
            disabled={isLoading}
            className="h-11 w-full rounded-full bg-foreground text-background font-semibold shadow-[var(--shadow-elegant)] hover:translate-y-[-1px] transition-transform"
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Criar conta
          </Button>
        </div>
      </form>
    </div>
  );
}
