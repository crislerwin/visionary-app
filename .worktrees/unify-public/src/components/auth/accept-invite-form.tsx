"use client";

import { api } from "@/lib/trpc/react";
import { MemberRole } from "@prisma/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  [MemberRole.ADMIN]: "Administrador",
  [MemberRole.MEMBER]: "Membro",
  [MemberRole.VIEWER]: "Visualizador",
  OWNER: "Proprietário",
};

export function AcceptInviteForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const params = useParams();
  const token = params.token as string;
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Verifica se convite é válido
  const {
    data: invite,
    isLoading: isChecking,
    error: checkError,
  } = api.auth.checkInvite.useQuery({ token }, { enabled: !!token });

  const acceptInvite = api.auth.acceptInvite.useMutation({
    onError: (err) => {
      setError(err.message);
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
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

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

    acceptInvite.mutate({ token, name, password });
  }

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Verificando convite...</p>
      </div>
    );
  }

  if (checkError) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive">
          <Icons.close className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold">Convite inválido</h3>
        <p className="text-sm text-muted-foreground">
          {checkError.message || "Este convite não é válido ou já expirou."}
        </p>
        <Button asChild variant="outline">
          <Link href="/sign-in">Ir para login</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
          <Icons.check className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold">Convite aceito!</h3>
        <p className="text-sm text-muted-foreground">
          Você agora faz parte do time. Faça login para acessar.
        </p>
        <Button asChild className="rounded-full">
          <Link href="/sign-in">Fazer login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {invite && (
        <div className="text-center space-y-2 mb-4">
          <p className="text-sm text-muted-foreground">Você foi convidado para</p>
          <p className="font-semibold text-lg">{invite.tenant?.name}</p>
          <p className="text-sm text-muted-foreground">
            como{" "}
            <span className="font-medium text-foreground">
              {roleLabels[invite.role] ?? invite.role}
            </span>
          </p>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" name="name" placeholder="Seu nome" required disabled={isLoading} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Criar senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              required
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isLoading} className="w-full rounded-full">
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Aceitar convite
          </Button>
        </div>
      </form>
    </div>
  );
}
