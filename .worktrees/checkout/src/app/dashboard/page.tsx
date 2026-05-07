"use client";

import { PageContainer, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentTenant } from "@/hooks/use-current-tenant";
import { api } from "@/lib/trpc/react";
import { OrderStatus } from "@prisma/client";
import {
  DollarSign,
  Lock,
  LockOpen,
  Package,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { currentTenant, tenants, isLoading } = useCurrentTenant();
  const tenantId = currentTenant?.id;

  const { data: cashRegister } = api.cashRegister.getCurrent.useQuery(undefined, {
    enabled: !!tenantId,
  });

  const { data: ordersRaw } = api.order.list.useQuery(
    { tenantId: tenantId || "", status: undefined },
    { enabled: !!tenantId, refetchInterval: 15000 },
  );

  const orders = (ordersRaw ?? []) as Array<{
    id: string;
    status: OrderStatus;
    total: number | string;
    orderNumber: number;
    createdAt: string | Date;
  }>;

  const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
  const todayOrders = orders.filter((o) => {
    const created = new Date(o.createdAt);
    const now = new Date();
    return (
      created.getDate() === now.getDate() &&
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);

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
          <h1 className="text-2xl font-bold">Bem-vindo ao Meu Rango</h1>
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

        {/* Cards de resumo */}
        <div className="grid gap-2 sm:grid-cols-3">
          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Caixa</CardTitle>
              {cashRegister ? (
                <LockOpen className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              {cashRegister ? (
                <div className="space-y-1">
                  <p className="text-xl font-bold">R$ {cashRegister.currentBalance.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">Caixa aberto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Caixa fechado</p>
                  <Button size="sm" className="h-7 text-xs" asChild>
                    <Link href="/dashboard/cash-register">Abrir caixa</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Pedidos Pendentes
              </CardTitle>
              <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="space-y-1">
                <p className="text-xl font-bold">{pendingOrders.length}</p>
                <p className="text-[10px] text-muted-foreground">
                  {pendingOrders.length === 1 ? "aguardando" : "aguardando"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 p-0">
            <CardHeader className="px-3 pt-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Vendas Hoje
              </CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="space-y-1">
                <p className="text-xl font-bold">R$ {todayRevenue.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {todayOrders.length} {todayOrders.length === 1 ? "pedido" : "pedidos"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações rápidas */}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/orders">
              <Receipt className="mr-1.5 h-4 w-4" />
              Ver pedidos
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/cash-register">
              <DollarSign className="mr-1.5 h-4 w-4" />
              Caixa
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/products">
              <Package className="mr-1.5 h-4 w-4" />
              Produtos
            </Link>
          </Button>
        </div>

        {/* Pedidos recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pedidos Recentes</CardTitle>
            <CardDescription>Últimos pedidos do dia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido hoje</p>
            ) : (
              todayOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">#{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">R$ {Number(order.total).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.status === OrderStatus.PENDING
                        ? "Pendente"
                        : order.status === OrderStatus.DELIVERED
                          ? "Entregue"
                          : order.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
