"use client";

import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { whatsappUrl } from "@/lib/whatsapp";
import { OrderStatus, OrderType, PaymentMethod } from "@prisma/client";

type OrderStatusConfig = {
  label: string;
  icon: typeof Clock;
  color: string;
};

const orderStatusConfig: Record<OrderStatus, OrderStatusConfig> = {
  [OrderStatus.PENDING]: {
    label: "Pendente",
    icon: Clock,
    color: "text-yellow-500",
  },
  [OrderStatus.CONFIRMED]: {
    label: "Confirmado",
    icon: CheckCircle,
    color: "text-blue-500",
  },
  [OrderStatus.PREPARING]: {
    label: "Em Preparação",
    icon: ChefHat,
    color: "text-orange-500",
  },
  [OrderStatus.READY]: { label: "Pronto", icon: Package, color: "text-green-500" },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    label: "Saiu para Entrega",
    icon: Truck,
    color: "text-blue-600",
  },
  [OrderStatus.DELIVERED]: {
    label: "Entregue",
    icon: Home,
    color: "text-green-600",
  },
  [OrderStatus.CANCELLED]: {
    label: "Cancelado",
    icon: Clock,
    color: "text-red-500",
  },
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.CREDIT_CARD]: "Cartão de Crédito",
  [PaymentMethod.DEBIT_CARD]: "Cartão de Débito",
  [PaymentMethod.OTHERS]: "Outros",
};

function formatBRL(v: number | string) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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
    if (
      whatsAppData?.message &&
      order?.tenant?.whatsappPhone &&
      !hasOpenedWhatsApp &&
      order?.type !== OrderType.DINE_IN
    ) {
      const storageKey = `whatsapp-opened-${orderId}`;
      if (sessionStorage.getItem(storageKey)) return;

      const url = whatsappUrl(order.tenant.whatsappPhone, whatsAppData.message);
      if (!url) return;
      setWhatsAppUrl(url);
      window.open(url, "_blank");
      sessionStorage.setItem(storageKey, "true");

      toast({
        title: "Pedido salvo!",
        description: "Abrindo WhatsApp para enviar seu pedido...",
      });

      setHasOpenedWhatsApp(true);
    }
  }, [
    whatsAppData?.message,
    order?.tenant?.whatsappPhone,
    hasOpenedWhatsApp,
    toast,
    orderId,
    order?.type,
  ]);

  const handleOpenWhatsApp = () => {
    if (whatsAppUrl) {
      window.open(whatsAppUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full rounded-3xl bg-card border border-border p-8 shadow-[var(--shadow-soft)] text-center"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Carregando pedido...</p>
        </motion.div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full rounded-3xl bg-card border border-border p-8 shadow-[var(--shadow-soft)] text-center"
        >
          <p className="text-muted-foreground text-sm mb-3">Pedido não encontrado</p>
          <Link href="/">
            <Button className="h-11 rounded-full">Voltar à Loja</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const statusConfig = orderStatusConfig[order.status];
  const StatusIcon = statusConfig.icon;
  const isPixPayment = order.paymentMethod === PaymentMethod.PIX;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-12">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg w-full"
      >
        {/* Header com ícone animado */}
        <div className="text-center mb-6">
          <div className="relative mx-auto h-24 w-24">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative h-24 w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="h-12 w-12" strokeWidth={3} />
            </div>
          </div>
          <h1 className="mt-6 font-semibold text-3xl tracking-tight">Pedido confirmado!</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Pedido <strong className="text-foreground">#{order.orderNumber}</strong> enviado para a
            cozinha.
          </p>
        </div>

        {/* Card principal */}
        <div className="rounded-3xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] space-y-5">
          {/* Status */}
          <div className="rounded-2xl bg-muted/50 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Status
              </p>
              <div className={`mt-1 flex items-center gap-1.5 ${statusConfig.color}`}>
                <StatusIcon className="h-4 w-4" />
                <span className="text-sm font-semibold">{statusConfig.label}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total pago</p>
              <span className="text-2xl font-bold">{formatBRL(order.total)}</span>
            </div>
          </div>

          {/* Timeline de Status */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Acompanhamento
            </h3>
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
                      className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
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

          {/* PIX / WhatsApp - oculto para DINE_IN */}
          {order.type !== OrderType.DINE_IN && isPixPayment && order.tenant?.whatsappPhone && (
            <div className="rounded-2xl border bg-blue-50 p-4 text-left">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                <h3 className="text-xs font-semibold text-blue-900">Pagamento via PIX</h3>
              </div>
              <p className="text-xs text-blue-800 mb-3">
                Envie o comprovante de pagamento via WhatsApp.
              </p>
              {whatsAppUrl && (
                <Button
                  onClick={handleOpenWhatsApp}
                  className="w-full h-11 rounded-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Enviar Comprovante
                </Button>
              )}
            </div>
          )}

          {order.type !== OrderType.DINE_IN && !isPixPayment && whatsAppUrl && (
            <div className="rounded-2xl border bg-green-50 p-4">
              <p className="text-xs text-green-800 mb-3">
                Seu pedido foi enviado! Abra o WhatsApp novamente.
              </p>
              <Button
                onClick={handleOpenWhatsApp}
                className="w-full h-11 rounded-full bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Abrir WhatsApp
              </Button>
            </div>
          )}

          {/* Resumo do Pedido */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resumo
            </h3>
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
                    <span className="font-medium">{formatBRL(item.totalPrice)}</span>
                  </div>
                ),
              )}
            </div>
            <Separator />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatBRL(order.subtotal)}</span>
            </div>
            {order.deliveryFee ? (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Entrega</span>
                <span>{formatBRL(order.deliveryFee)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span>{formatBRL(order.total)}</span>
            </div>
            {order.paymentMethod && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{paymentMethodLabels[order.paymentMethod]}</span>
              </div>
            )}
          </div>

          {order.customerNotes && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Observações
              </h3>
              <p className="text-xs text-muted-foreground">{order.customerNotes}</p>
            </div>
          )}

          <Separator />

          {/* Botões */}
          <div className="flex flex-col gap-3">
            <Link href={order.tenant?.slug ? `/menu/${order.tenant.slug}` : "/"} className="flex-1">
              <Button variant="outline" className="w-full h-11 rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à Loja
              </Button>
            </Link>
            <Button className="flex-1 h-11 rounded-full" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Status
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SuccessWithTheme() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId");

  const { data: order } = api.order.getOrderById.useQuery(
    {
      id: searchParams.get("orderId") || "",
      tenantId: tenantId || "",
    },
    {
      enabled: !!searchParams.get("orderId") && !!tenantId,
    },
  );

  const tenantConfig =
    order?.tenant != null
      ? ((order.tenant as unknown as Record<string, unknown>).config ?? null)
      : null;
  useTenantBranding(tenantConfig, order?.tenant?.slug || undefined);

  return <SuccessContent />;
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full rounded-3xl bg-card border border-border p-8 shadow-[var(--shadow-soft)] text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      }
    >
      <SuccessWithTheme />
    </Suspense>
  );
}
