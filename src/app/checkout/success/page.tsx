"use client";

import {
  ArrowLeft,
  CheckCircle,
  ChefHat,
  Clock,
  Home,
  MessageCircle,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { OrderStatus, PaymentMethod } from "@prisma/client";

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
  [OrderStatus.OUT_FOR_DELIVERY]: {
    label: "Saiu para Entrega",
    icon: Truck,
    color: "text-blue-600",
  },
  [OrderStatus.DELIVERED]: { label: "Entregue", icon: Home, color: "text-green-600" },
  [OrderStatus.CANCELLED]: { label: "Cancelado", icon: Clock, color: "text-red-500" },
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.CREDIT_CARD]: "Cartão de Crédito",
  [PaymentMethod.DEBIT_CARD]: "Cartão de Débito",
  [PaymentMethod.OTHERS]: "Outros",
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const orderId = searchParams.get("orderId");
  const [hasOpenedWhatsApp, setHasOpenedWhatsApp] = useState(false);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string | null>(null);

  const tenantId = searchParams.get("tenantId");

  const { data: order, isLoading } = api.order.getOrderById.useQuery(
    { id: orderId || "", tenantId: tenantId || "" },
    { enabled: !!orderId && !!tenantId },
  );

  const { data: whatsAppData } = api.order.generateWhatsAppMessage.useQuery(
    { id: orderId || "", tenantId: tenantId || "" },
    { enabled: !!orderId && !!tenantId },
  );

  useEffect(() => {
    if (whatsAppData?.message && order?.tenant?.whatsappPhone && !hasOpenedWhatsApp) {
      const encodedMessage = encodeURIComponent(whatsAppData.message);
      const phone = order.tenant.whatsappPhone.replace(/\D/g, "");
      const url = `https://wa.me/${phone}?text=${encodedMessage}`;
      setWhatsAppUrl(url);
      window.open(url, "_blank");

      toast({
        title: "Pedido salvo!",
        description: "Abrindo WhatsApp para enviar seu pedido...",
      });

      setHasOpenedWhatsApp(true);
    }
  }, [whatsAppData?.message, order?.tenant?.whatsappPhone, hasOpenedWhatsApp, toast]);

  const handleOpenWhatsApp = () => {
    if (whatsAppUrl) {
      window.open(whatsAppUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-md px-3 py-8 sm:px-4 sm:py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">Carregando pedido...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-md px-3 py-8 sm:px-4 sm:py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10">
            <p className="text-muted-foreground text-sm mb-3">Pedido não encontrado</p>
            <Link href="/">
              <Button className="h-11">Voltar à Loja</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = orderStatusConfig[order.status];
  const StatusIcon = statusConfig.icon;
  const isPixPayment = order.paymentMethod === PaymentMethod.PIX;

  return (
    <div className="mx-auto w-full max-w-md px-3 py-4 sm:px-4 sm:py-6">
      <Card className="text-center">
        <CardHeader className="pb-2 pt-4 sm:pt-5 px-4">
          <div className="mx-auto mb-2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
          </div>
          <CardTitle className="text-base sm:text-lg">Pedido Confirmado!</CardTitle>
          <CardDescription className="text-xs">
            Seu pedido foi recebido e está sendo processado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          {/* Número do Pedido e Status */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Número do Pedido</p>
            <p className="text-xl font-bold">#{order.orderNumber}</p>
            <div className={`mt-1 flex items-center justify-center gap-1.5 ${statusConfig.color}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{statusConfig.label}</span>
            </div>
          </div>

          {/* Timeline de Status */}
          <div>
            <h3 className="text-xs font-semibold mb-2">Acompanhamento</h3>
            <div className="flex justify-between gap-1 overflow-x-auto pb-1">
              {[
                { status: OrderStatus.PENDING, short: "Pendente" },
                { status: OrderStatus.CONFIRMED, short: "Confirmado" },
                { status: OrderStatus.PREPARING, short: "Preparo" },
                { status: OrderStatus.READY, short: "Pronto" },
                { status: OrderStatus.DELIVERED, short: "Entregue" },
              ].map(({ status, short }) => {
                const isCompleted =
                  Object.values(OrderStatus).indexOf(order.status) >=
                  Object.values(OrderStatus).indexOf(status);
                const stepConfig = orderStatusConfig[status];
                const StepIcon = stepConfig.icon;

                return (
                  <div
                    key={status}
                    className={`flex flex-col items-center gap-1 min-w-0 flex-1 ${
                      isCompleted ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                        isCompleted ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <StepIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-medium leading-tight text-center truncate w-full px-0.5">
                      {short}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* PIX / WhatsApp */}
          {isPixPayment && order.tenant?.whatsappPhone && (
            <div className="rounded-lg border bg-blue-50 p-3 text-left">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                <h3 className="text-xs font-semibold text-blue-900">Pagamento via PIX</h3>
              </div>
              <p className="text-xs text-blue-800 mb-2">
                Envie o comprovante de pagamento via WhatsApp.
              </p>
              {whatsAppUrl && (
                <Button
                  onClick={handleOpenWhatsApp}
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Enviar Comprovante
                </Button>
              )}
            </div>
          )}

          {!isPixPayment && whatsAppUrl && (
            <div className="rounded-lg border bg-green-50 p-3">
              <p className="text-xs text-green-800 mb-2">
                Seu pedido foi enviado! Abra o WhatsApp novamente.
              </p>
              <Button
                onClick={handleOpenWhatsApp}
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Abrir WhatsApp
              </Button>
            </div>
          )}

          {/* Resumo do Pedido */}
          <div className="text-left space-y-2">
            <h3 className="text-xs font-semibold">Resumo</h3>
            <div className="space-y-1">
              {order.items.map(
                (item: {
                  id: string;
                  quantity: number;
                  productName: string;
                  totalPrice: number | string;
                }) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="font-medium">R$ {Number(item.totalPrice).toFixed(2)}</span>
                  </div>
                ),
              )}
            </div>
            <Separator />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {Number(order.subtotal).toFixed(2)}</span>
            </div>
            {order.deliveryFee ? (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Entrega</span>
                <span>R$ {Number(order.deliveryFee).toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span>R$ {Number(order.total).toFixed(2)}</span>
            </div>
            {order.paymentMethod && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{paymentMethodLabels[order.paymentMethod]}</span>
              </div>
            )}
          </div>

          {order.customerNotes && (
            <div className="text-left">
              <h3 className="text-xs font-semibold mb-1">Observações</h3>
              <p className="text-xs text-muted-foreground">{order.customerNotes}</p>
            </div>
          )}

          <Separator />

          {/* Botões */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={order.tenant?.slug ? `/menu/${order.tenant.slug}` : "/"} className="flex-1">
              <Button variant="outline" className="w-full h-11">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à Loja
              </Button>
            </Link>
            <Button className="flex-1 h-11" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
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
        <div className="mx-auto w-full max-w-md px-3 py-8 sm:px-4 sm:py-12">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
