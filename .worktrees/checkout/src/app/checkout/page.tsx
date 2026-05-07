"use client";

import type { CustomerForm } from "@/components/settings/checkout-config-editor";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrderType, PaymentMethod } from "@prisma/client";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trash2,
  User,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { useCartStore } from "@/stores/cart-store";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { CheckoutCard } from "./_components/checkout-card";
import { ModeOption, PayOption, Row } from "./_components/option-buttons";
import { Stepper } from "./_components/stepper";
import {
  type CheckoutFormValues,
  buildCheckoutSchema,
  getDefaultValues,
  getFieldConfig,
} from "./_lib/checkout-schema";
import {
  buildWhatsAppMessage,
  formatBRL,
  paymentMethodIcons,
  paymentMethodLabels,
} from "./_lib/checkout-utils";

const orderTypeLabels: Record<OrderType, string> = {
  [OrderType.DELIVERY]: "Entrega",
  [OrderType.PICKUP]: "Retirada",
  [OrderType.DINE_IN]: "Comer no Local",
};

const orderTypeSubtitles: Record<OrderType, string> = {
  [OrderType.DELIVERY]: "Receba em casa",
  [OrderType.PICKUP]: "Retire no balcão",
  [OrderType.DINE_IN]: "Mesa do restaurante",
};

const orderTypeIcons: Record<OrderType, typeof Bike> = {
  [OrderType.DELIVERY]: Bike,
  [OrderType.PICKUP]: Store,
  [OrderType.DINE_IN]: UtensilsCrossed,
};

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    items,
    updateQuantity,
    removeItem,
    getTotalPrice,
    clearCart,
    tenantId: cartTenantId,
    tenantSlug,
  } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlTenantId, setUrlTenantId] = useState<string | null>(null);
  const [urlTenantSlug, setUrlTenantSlug] = useState<string | null>(null);
  const [isAddressOpen, setIsAddressOpen] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrlTenantId(params.get("tenantId"));
    setUrlTenantSlug(params.get("tenantSlug"));
  }, []);

  const tenantId = urlTenantId ?? cartTenantId;
  const queryTenantSlug = urlTenantSlug ?? tenantSlug;

  const { data: tenant } = api.tenant.bySlug.useQuery(
    { slug: queryTenantSlug || "" },
    { enabled: !!queryTenantSlug },
  );

  const tenantConfig =
    tenant != null ? ((tenant as unknown as Record<string, unknown>).config ?? null) : null;
  useTenantBranding(tenantConfig, queryTenantSlug || undefined);

  const rawConfig = (tenantConfig ?? {}) as Record<string, unknown>;
  const paymentOptions =
    (rawConfig.paymentOptions as Record<string, { enabled?: boolean }> | null) ?? null;
  const customerForm = (rawConfig.customerForm as CustomerForm | null) ?? null;
  const tenantDeliveryFee = (rawConfig.deliveryFee as number | undefined) ?? 0;

  const enabledPaymentMethods = Object.values(PaymentMethod).filter((method) => {
    const map: Record<string, string> = {
      [PaymentMethod.PIX]: "pix",
      [PaymentMethod.CREDIT_CARD]: "creditCard",
      [PaymentMethod.DEBIT_CARD]: "debitCard",
      [PaymentMethod.CASH]: "cash",
    };
    const key = map[method];
    if (!key) return false;
    if (!paymentOptions) return true;
    return paymentOptions[key]?.enabled !== false;
  });

  const schema = useMemo(() => buildCheckoutSchema(customerForm), [customerForm]);
  const defaultValues = useMemo(() => getDefaultValues(customerForm), [customerForm]);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

  const orderType = form.watch("orderType");
  const isDelivery = orderType === OrderType.DELIVERY;

  const subtotal = getTotalPrice();
  const deliveryFee = isDelivery ? tenantDeliveryFee : 0;
  const total = subtotal + deliveryFee;

  const nameConfig = getFieldConfig(customerForm, "name");
  const phoneConfig = getFieldConfig(customerForm, "phone");
  const emailConfig = getFieldConfig(customerForm, "email");
  const addressConfig = getFieldConfig(customerForm, "address");
  const notesConfig = getFieldConfig(customerForm, "notes");
  const tableNumberConfig = getFieldConfig(customerForm, "tableNumber");

  const hasAnyCustomerField =
    nameConfig.enabled ||
    phoneConfig.enabled ||
    emailConfig.enabled ||
    addressConfig.enabled ||
    notesConfig.enabled ||
    tableNumberConfig.enabled;

  const whatsappPhone =
    (tenant as unknown as { whatsappPhone?: string | null } | null)?.whatsappPhone ?? null;
  const whatsappEnabled = paymentOptions?.whatsappOrder?.enabled === true;
  const showWhatsAppOnly = !hasAnyCustomerField && whatsappEnabled && !!whatsappPhone;

  const createOrderMutation = api.order.createOrder.useMutation({
    onSuccess: (data: { id: string }) => {
      clearCart();
      const params = new URLSearchParams(window.location.search);
      const successTenantId = params.get("tenantId") ?? cartTenantId;
      router.push(`/checkout/success?orderId=${data.id}&tenantId=${successTenantId}`);
    },
    onError: (error: { message: string }) => {
      toast({
        title: "Erro ao criar pedido",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleWhatsAppOrder = () => {
    if (!whatsappPhone) return;
    const cleanPhone = whatsappPhone.replace(/\D/g, "");
    if (!cleanPhone) return;
    const message = buildWhatsAppMessage(items, total);
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    clearCart();
    router.push(queryTenantSlug ? `/menu/${queryTenantSlug}` : "/");
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione itens ao carrinho antes de finalizar o pedido.",
        variant: "destructive",
      });
      return;
    }

    if (!tenantId) {
      toast({
        title: "Erro",
        description:
          "Não foi possível identificar o estabelecimento. Volte ao cardápio e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const orderItems = items.map((item) => {
      const orderItem: {
        productId: string;
        variantId?: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        notes?: string;
        productName: string;
      } = {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        notes: item.notes ?? undefined,
        productName: item.productName,
      };

      if (typeof item.variantId === "string" && item.variantId.length > 0) {
        orderItem.variantId = item.variantId;
      }

      return orderItem;
    });

    createOrderMutation.mutate({
      tenantId,
      type: values.orderType,
      customer: {
        name: nameConfig.enabled ? values.customerName : undefined,
        phone: phoneConfig.enabled ? values.customerPhone : undefined,
        email: emailConfig.enabled ? values.customerEmail || undefined : undefined,
      },
      address:
        isDelivery && addressConfig.enabled
          ? {
              street: values.addressStreet ?? "",
              number: values.addressNumber ?? "",
              complement: values.addressComplement,
              neighborhood: values.addressNeighborhood ?? "",
              city: values.addressCity ?? "",
              state: values.addressState ?? "",
              zipCode: values.addressZipCode ?? "",
              reference: values.addressReference,
            }
          : undefined,
      items: orderItems,
      subtotal,
      deliveryFee: isDelivery ? deliveryFee : undefined,
      total,
      paymentMethod: values.paymentMethod,
      customerNotes: notesConfig.enabled ? values.customerNotes : undefined,
      tableNumber: tableNumberConfig.enabled ? values.tableNumber : undefined,
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link
              href={queryTenantSlug ? `/menu/${queryTenantSlug}` : "/"}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar ao cardápio
            </Link>
            <div className="font-semibold text-foreground">Finalizar pedido</div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento seguro
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 sm:px-6 mt-8">
          <CheckoutCard title="Carrinho">
            <div className="py-10 text-center text-sm text-muted-foreground">
              Seu carrinho está vazio.{" "}
              <Link
                href={queryTenantSlug ? `/menu/${queryTenantSlug}` : "/"}
                className="text-foreground font-semibold underline"
              >
                Voltar ao cardápio
              </Link>
            </div>
          </CheckoutCard>
        </main>
      </div>
    );
  }

  if (showWhatsAppOnly) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link
              href={queryTenantSlug ? `/menu/${queryTenantSlug}` : "/"}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar ao cardápio
            </Link>
            <div className="font-semibold text-foreground">Finalizar pedido</div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento seguro
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 sm:px-6 mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            <CheckoutCard
              title="Resumo do Pedido"
              badge={`${items.length} ${items.length === 1 ? "item" : "itens"}`}
            >
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="py-4 flex gap-4">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        loading="lazy"
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
                        <Store className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-tight text-sm">
                          {item.productName}
                          {item.variantName ? ` (${item.variantName})` : ""}
                        </h3>
                        <span className="font-bold text-sm">
                          {formatBRL(item.price * item.quantity)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBRL(item.price)} / un
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Diminuir"
                          className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted rounded-l-full"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Aumentar"
                          className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted rounded-r-full"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CheckoutCard>
          </div>

          <aside className="lg:sticky lg:top-32 h-fit">
            <div className="rounded-3xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-bold">Resumo</h2>
              <div className="mt-4 space-y-2.5 text-sm">
                <Row label="Subtotal" value={formatBRL(subtotal)} />
                {isDelivery && <Row label="Taxa de entrega" value={formatBRL(deliveryFee)} />}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-end justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-3xl font-bold tracking-tight">{formatBRL(total)}</span>
              </div>
              <button
                type="button"
                onClick={handleWhatsAppOrder}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: "#25d366", color: "#ffffff" }}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar pedido pelo WhatsApp
              </button>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href={queryTenantSlug ? `/menu/${queryTenantSlug}` : "/"}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao cardápio
          </Link>
          <div className="font-semibold text-foreground">Finalizar pedido</div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento seguro
          </div>
        </div>
        <Stepper step={2} />
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
        {/* LEFT — FORM */}
        <div className="space-y-6">
          <Form {...form}>
            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* STEP 1: ITENS */}
              <CheckoutCard
                title="1. Revise seus itens"
                badge={`${items.length} ${items.length === 1 ? "item" : "itens"}`}
              >
                <ul className="divide-y divide-border">
                  {items.map((item) => (
                    <li key={item.id} className="py-4 flex gap-4">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          loading="lazy"
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
                          <Store className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold leading-tight text-sm">
                            {item.productName}
                            {item.variantName ? ` (${item.variantName})` : ""}
                          </h3>
                          <span className="font-bold text-sm">
                            {formatBRL(item.price * item.quantity)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatBRL(item.price)} / un
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label="Diminuir"
                            className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted rounded-l-full"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Aumentar"
                            className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted rounded-r-full"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label="Remover"
                            className="h-7 w-7 inline-flex items-center justify-center hover:bg-destructive/10 text-destructive rounded-r-full"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Obs: {item.notes}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CheckoutCard>

              {/* STEP 2: DADOS */}
              <CheckoutCard title="2. Dados do pedido">
                {/* Tipo de Pedido */}
                <FormField
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Tipo de Pedido
                      </FormLabel>
                      <FormControl>
                        <div className="grid sm:grid-cols-3 gap-3 mt-2">
                          {Object.values(OrderType).map((type) => {
                            const Icon = orderTypeIcons[type];
                            return (
                              <ModeOption
                                key={type}
                                active={field.value === type}
                                onClick={() => field.onChange(type)}
                                icon={<Icon className="h-5 w-5" />}
                                title={orderTypeLabels[type]}
                                subtitle={orderTypeSubtitles[type]}
                              />
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Dados do Cliente */}
                {(nameConfig.enabled || phoneConfig.enabled || emailConfig.enabled) && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Dados do Cliente
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {nameConfig.enabled && (
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {nameConfig.label || "Nome Completo"}
                                {nameConfig.required && (
                                  <span className="text-destructive ml-0.5">*</span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <div className="relative mt-1.5">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                  </span>
                                  <Input
                                    placeholder={nameConfig.placeholder || "Seu nome"}
                                    className="pl-10 rounded-xl h-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      )}

                      {phoneConfig.enabled && (
                        <FormField
                          control={form.control}
                          name="customerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {phoneConfig.label || "Telefone / WhatsApp"}
                                {phoneConfig.required && (
                                  <span className="text-destructive ml-0.5">*</span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <div className="relative mt-1.5">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                  </span>
                                  <Input
                                    placeholder={phoneConfig.placeholder || "(11) 99999-9999"}
                                    className="pl-10 rounded-xl h-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {emailConfig.enabled && (
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {emailConfig.label || "Email"}
                              {emailConfig.required && (
                                <span className="text-destructive ml-0.5">*</span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder={emailConfig.placeholder || "seu@email.com"}
                                className="rounded-xl h-10"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}

                {/* Endereço */}
                {isDelivery && addressConfig.enabled && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setIsAddressOpen(!isAddressOpen)}
                      className="flex items-center justify-between w-full group"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {addressConfig.label || "Endereço de Entrega"}
                          {addressConfig.required && (
                            <span className="text-destructive ml-0.5">*</span>
                          )}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isAddressOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isAddressOpen && (
                      <div className="space-y-3 pt-3">
                        <FormField
                          control={form.control}
                          name="addressZipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                CEP
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="00000-000"
                                  className="rounded-xl h-10"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                          <FormField
                            control={form.control}
                            name="addressStreet"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Rua
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Nome da rua"
                                    className="rounded-xl h-10"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="addressNumber"
                            render={({ field }) => (
                              <FormItem className="sm:w-28">
                                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Número
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="123" className="rounded-xl h-10" {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="addressComplement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Complemento (opcional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Apto, sala, etc."
                                  className="rounded-xl h-10"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="addressNeighborhood"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Bairro
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Bairro"
                                    className="rounded-xl h-10"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="addressCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Cidade
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Cidade"
                                    className="rounded-xl h-10"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="addressState"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Estado
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="UF" className="rounded-xl h-10" {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="addressReference"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Referência
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Próximo a..."
                                    className="rounded-xl h-10"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Número da Mesa */}
                {tableNumberConfig.enabled && (
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="tableNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {tableNumberConfig.label || "Número da Mesa"}
                            {tableNumberConfig.required && (
                              <span className="text-destructive ml-0.5">*</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={tableNumberConfig.placeholder || "Ex: 12"}
                              className="rounded-xl h-10"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Pagamento - oculto para DINE_IN */}
                {orderType !== OrderType.DINE_IN && (
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" /> Pagamento
                          </FormLabel>
                          <FormControl>
                            <div className="grid sm:grid-cols-2 gap-3 mt-2">
                              {enabledPaymentMethods.map((method) => {
                                const Icon = paymentMethodIcons[method];
                                return (
                                  <PayOption
                                    key={method}
                                    active={field.value === method}
                                    onClick={() => field.onChange(method)}
                                    icon={<Icon className="h-5 w-5" />}
                                    title={paymentMethodLabels[method]}
                                    subtitle={
                                      method === PaymentMethod.PIX
                                        ? "Aprovação imediata"
                                        : method === PaymentMethod.CASH
                                          ? "Pagar na entrega"
                                          : method === PaymentMethod.CREDIT_CARD
                                            ? "Visa, Master, Elo"
                                            : method === PaymentMethod.DEBIT_CARD
                                              ? "Pagamento à vista"
                                              : "Outra forma"
                                    }
                                  />
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Observações */}
                {notesConfig.enabled && (
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="customerNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {notesConfig.label || "Observações"}
                            {notesConfig.required && (
                              <span className="text-destructive ml-0.5">*</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={
                                notesConfig.placeholder || "Alguma observação sobre o pedido?"
                              }
                              className="rounded-xl text-sm min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CheckoutCard>
            </form>
          </Form>
        </div>

        {/* RIGHT — RESUMO */}
        <aside className="lg:sticky lg:top-32 h-fit">
          <div className="rounded-3xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl font-bold">Resumo</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      loading="lazy"
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.productName}
                      {item.variantName ? ` (${item.variantName})` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBRL(item.price)} x {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatBRL(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2.5 text-sm">
              <Row label="Subtotal" value={formatBRL(subtotal)} />
              <Row
                label={isDelivery ? "Taxa de entrega" : "Retirada"}
                value={deliveryFee === 0 ? "Grátis" : formatBRL(deliveryFee)}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-end justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-3xl font-bold tracking-tight">{formatBRL(total)}</span>
            </div>

            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {isDelivery ? "Entrega em breve" : "Pronto para retirada em breve"}
            </div>

            <Button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold disabled:opacity-40 hover:scale-[1.01] transition-transform h-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Finalizar pedido
                </>
              )}
            </Button>

            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground text-center">
              <div className="rounded-lg bg-muted/50 py-2">
                <ShieldCheck className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
                Seguro
              </div>
              <div className="rounded-lg bg-muted/50 py-2">
                <Clock className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
                Rápido
              </div>
              <div className="rounded-lg bg-muted/50 py-2">
                <Check className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
                Garantido
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
