"use client";

import { Loader2, Lock, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { type SmartField, SmartForm } from "@/components/ui/smart-form";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const fields = React.useMemo<SmartField<LoginFormData>[]>(
    () => [
      {
        name: "email",
        label: "E-mail",
        type: "custom",
        required: true,
        disabled: isLoading,
        customRender: ({ field }) => (
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={field.name}
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              className="pl-9"
              autoCapitalize="none"
              autoCorrect="off"
              {...field}
              value={(field.value as string) || ""}
            />
          </div>
        ),
      },
      {
        name: "password",
        label: "Senha",
        type: "custom",
        required: true,
        disabled: isLoading,
        customRender: ({ field }) => (
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={field.name}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-9"
              {...field}
              value={(field.value as string) || ""}
            />
          </div>
        ),
      },
    ],
    [isLoading],
  );

  async function handleLogin(data: LoginFormData) {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setServerError("Credenciais inválidas. Verifique seu e-mail e senha.");
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch (_error) {
      setServerError("Algo deu errado. Tente novamente.");
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <SmartForm
        schema={loginSchema}
        fields={fields}
        onSubmit={handleLogin}
        submitText="Entrar"
        isLoading={isLoading}
        className="space-y-5"
        footer={(form) => (
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center justify-between">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Button
              type="submit"
              disabled={isLoading || form.formState.isSubmitting}
              className="w-full"
            >
              {(isLoading || form.formState.isSubmitting) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Entrar
            </Button>
          </div>
        )}
      />

      {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => signIn("google", { callbackUrl })}
        >
          <Icons.google className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => signIn("github", { callbackUrl })}
        >
          <Icons.gitHub className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{" "}
        <Link href="/sign-up" className="font-medium text-foreground hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
