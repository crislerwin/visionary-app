"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { Building, Shield, Store } from "lucide-react";

export default function DashboardPage() {
  const { currentTenant, tenants, isLoading } = useCurrentTenant();

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid gap-2 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!currentTenant || !tenants || tenants.length === 0) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <h1 className="text-2xl font-bold">Bem-vindo ao Food Service</h1>
          <p className="text-muted-foreground">
            Você ainda não tem nenhum estabelecimento. Crie um para começar.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Dashboard" description={`Bem-vindo de volta, ${currentTenant.name}`} />

        <div className="grid gap-2 sm:grid-cols-3">
          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Estabelecimentos
              </CardTitle>
              <Building className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <p className="text-xl font-bold">{tenants.length}</p>
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Ativo</CardTitle>
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <p className="text-xl font-bold truncate">{currentTenant.name}</p>
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Slug</CardTitle>
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <p className="text-xl font-bold">{currentTenant.slug}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
