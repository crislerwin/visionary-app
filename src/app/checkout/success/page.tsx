"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, Package, ChefHat, Truck, Home, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/trpc/react";
import { OrderStatus } from "@prisma/client";

type OrderStatusConfig = {
  label: string;
  icon: typeof Clock;
  color: string;
};

const orderStatusConfig: Record<OrderStatus, OrderStatusConfig> = {
  [OrderStatus.PENDING]: { label: "Pendente", icon: Clock, color: "text-yellow-500" },
  [OrderStatus.CONFIRMED]: { label: "Confirmado", icon: CheckCircle, color: "text-blue-500" },
  [OrderStatus.PREPARING]: { label: "Em Preparação", icon: ChefHat, color: "text-orange-500" },
  [OrderStatus.READY]: { label: "Pronto", icon: Package, color: "text-green-500" },
  [OrderStatus.OUT_FOR_DELIVERY]: { label: "Saiu para Entrega", icon: Truck, color: "text-blue-600" },
  [OrderStatus.DELIVERED]: { label: "Entregue", icon: Home, color: "text-green-600" },
  [OrderStatus.CANCELLED]: { label: "Cancelado", icon: Clock, color: "text-red-500" },
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  // TODO: Get tenantId from URL, subdomain, or context
  const tenantId = "dummy-tenant-id";

  const { data: order, isLoading } = api.order.getOrderById.useQuery(
    { id: orderId || "", tenantId },
    { enabled: !!orderId }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Carregando pedido...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Pedido não encontrado</p>
            <Link href="/">
              <Button>Voltar à Loja</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = orderStatusConfig[order.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Pedido Confirmado!</CardTitle>
          <CardDescription>
            Seu pedido foi recebido e está sendo processado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Número do Pedido e Status */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Número do Pedido</p>
            <p className="text-2xl font-bold">#{order.orderNumber}</p>
            <div className={`mt-2 flex items-center justify-center gap-2 ${statusConfig.color}`}>
              <StatusIcon className="h-5 w-5" />
              <span className="font-medium">{statusConfig.label}</span>
            </div>
          </div>

          {/* Timeline de Status */}
          <div className="space-y-4">
            <h3 className="font-semibold">Acompanhamento do Pedido</h3>
            <div className="flex justify-between">
              {[OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERED]
                .map((status: OrderStatus) => {
                  const isCompleted = Object.values(OrderStatus).indexOf(order.status) >= Object.values(OrderStatus).indexOf(status);
                  const stepConfig = orderStatusConfig[status];
                  const StepIcon = stepConfig.icon;

                  return (
                    <div
                      key={status}
                      className={`flex flex-col items-center gap-2 ${
                        isCompleted ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isCompleted ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium">{stepConfig.label}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          <Separator />

          {/* Resumo do Pedido */}
          <div className="text-left">
            <h3 className="mb-4 font-semibold">Resumo do Pedido</h3>
            <div className="space-y-2">
              {order.items.map((item: { id: string; quantity: number; productName: string; totalPrice: number | string }) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="font-medium">
                    R$ {Number(item.totalPrice).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {Number(order.subtotal).toFixed(2)}</span>
              </div>
              {order.deliveryFee && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de Entrega</span>
                  <span>R$ {Number(order.deliveryFee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>R$ {Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {order.customerNotes && (
            <>
              <Separator />
              <div className="text-left">
                <h3 className="mb-2 font-semibold">Observações</h3>
                <p className="text-sm text-muted-foreground">{order.customerNotes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Botões */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à Loja
              </Button>
            </Link>
            <Button className="flex-1" onClick={() => window.location.reload()}>
              Atualizar Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-4 text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
