"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/react";
import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SetupForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const createTenant = trpc.tenant.create.useMutation({
    onSuccess: async () => {
      await utils.tenant.list.invalidate();
      router.push("/dashboard");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTenant.mutateAsync({ name, slug });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">Criar estabelecimento</CardTitle>
        <CardDescription className="text-center">
          Crie seu primeiro estabelecimento para começar a usar o Meu Rango
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do estabelecimento *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Restaurante Sabor & Arte"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="Ex: sabor-e-arte"
              required
            />
            <p className="text-xs text-muted-foreground">
              O slug será usado na URL do seu cardápio. Use apenas letras minúsculas, números e
              hífens.
            </p>
          </div>
          {createTenant.error && (
            <p className="text-sm text-red-500">{createTenant.error.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={createTenant.isPending}>
            {createTenant.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar estabelecimento"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
