"use client";

import { api } from "@/lib/trpc/react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RequestAccessForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [businessSize, setBusinessSize] = React.useState<string>("");

  const createLead = api.lead.create.useMutation({
    onError: (err) => {
      setError(err.message || "Erro ao enviar solicitação");
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
    const phone = (formData.get("phone") as string) || undefined;
    const employeeCount = formData.get("employeeCount") as string;
    const currentTool = (formData.get("currentTool") as string) || undefined;

    createLead.mutate({
      name,
      email,
      phone,
      businessSize: (businessSize || undefined) as
        | "SOLO"
        | "SMALL"
        | "MEDIUM"
        | "LARGE"
        | undefined,
      employeeCount: employeeCount ? Number.parseInt(employeeCount, 10) : undefined,
      currentTool,
    });
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
          <Icons.check className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold">Solicitação enviada!</h3>
        <p className="text-sm text-muted-foreground">Nossa equipe entrará em contato em até 24h.</p>
        <Button asChild variant="outline">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nome completo *</Label>
          <Input id="name" name="name" placeholder="Seu nome" required disabled={isLoading} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nome@exemplo.com"
            required
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(11) 99999-9999"
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="businessSize">Tamanho do negócio</Label>
          <Select value={businessSize} onValueChange={setBusinessSize} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOLO">Solo (apenas eu)</SelectItem>
              <SelectItem value="SMALL">Pequeno (2-10 pessoas)</SelectItem>
              <SelectItem value="MEDIUM">Médio (11-50 pessoas)</SelectItem>
              <SelectItem value="LARGE">Grande (50+ pessoas)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="employeeCount">Quantidade de funcionários</Label>
          <Input
            id="employeeCount"
            name="employeeCount"
            type="number"
            min="0"
            placeholder="10"
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currentTool">Qual ferramenta usa hoje?</Label>
          <Input
            id="currentTool"
            name="currentTool"
            placeholder="Ex: Planilha, WhatsApp, outro sistema..."
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={isLoading} className="w-full rounded-full">
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Solicitar acesso
        </Button>
      </div>
    </form>
  );
}
