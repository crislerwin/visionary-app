"use client";

import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrderType, PaymentMethod } from "@prisma/client";
import {
  Banknote,
  ChevronDown,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/trpc/react";
import { useCartStore } from "@/stores/cart-store";

const checkoutFormSchema = z.object({
  customerName: z.string().min(1, "Nome é obrigatório"),
  customerPhone: z.string().min(1, "Telefone é obrigatório"),
  customerEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  addressStreet: z.string().min(1, "Rua é obrigatória"),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().min(1, "Bairro é obrigatório"),
  addressCity: z.string().min(1, "Cidade é obrigatória"),
  addressState: z.string().min(1, "Estado é obrigatório"),
  addressZipCode: z.string().min(1, "CEP é obrigatório"),
  addressReference: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: "Selecione um método de pagamento" }),
  }),
  customerNotes: z.string().optional(),
  orderType: z.nativeEnum(OrderType, {
    errorMap: () => ({ message: "Selecione o tipo de pedido" }),
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.CREDIT_CARD]: "Cartão de Crédito",
  [PaymentMethod.DEBIT_CARD]: "Cartão de Débito",
  [PaymentMethod.OTHERS]: "Outros",
};

const paymentMethodIcons: Record<PaymentMethod, typeof Banknote> = {
  [PaymentMethod.CASH]: Banknote,
  [PaymentMethod.PIX]: QrCode,
  [PaymentMethod.CREDIT_CARD]: CreditCard,
  [PaymentMethod.DEBIT_CARD]: CreditCard,
  [PaymentMethod.OTHERS]: CreditCard,
};

const orderTypeLabels: Record<OrderType, string> = {
  [OrderType.DELIVERY]: "Delivery",
  [OrderType.PICKUP]: "Retirada",
  [OrderType.DINE_IN]: "Comer no Local",
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

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      addressStreet: "",
      addressNumber: "",
      addressComplement: "",
      addressNeighborhood: "",
      addressCity: "",
      addressState: "",
      addressZipCode: "",
      addressReference: "",
      paymentMethod: undefined,
      customerNotes: "",
      orderType: OrderType.DELIVERY,
    },
  });

  const orderType = form.watch("orderType");
  const isDelivery = orderType === OrderType.DELIVERY;

  const subtotal = getTotalPrice();
  const deliveryFee = isDelivery ? 5.0 : 0;
  const total = subtotal + deliveryFee;

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
        name: values.customerName,
        phone: values.customerPhone,
        email: values.customerEmail || undefined,
      },
      address: isDelivery
        ? {
            street: values.addressStreet,
            number: values.addressNumber,
            complement: values.addressComplement,
            neighborhood: values.addressNeighborhood,
            city: values.addressCity,
            state: values.addressState,
            zipCode: values.addressZipCode,
            reference: values.addressReference,
          }
        : undefined,
      items: orderItems,
      subtotal,
      deliveryFee: isDelivery ? deliveryFee : undefined,
      total,
      paymentMethod: values.paymentMethod,
      customerNotes: values.customerNotes,
    });
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
        <Card className="text-center py-6 sm:py-8">
          <CardContent className="px-4 py-2">
            <p className="text-muted-foreground mb-4 text-sm">Seu carrinho está vazio</p>
            <Button onClick={() => router.push(queryTenantSlug ? `/menu/${queryTenantSlug}` : "/")}>
              Continuar Comprando
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-2 sm:px-4 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-6">Finalizar Pedido</h1>

      <div className="flex flex-col gap-3">
        {/* Resumo do Pedido - Mobile (topo, colapsado) */}
        <div className="lg:hidden">
          <Card className="overflow-hidden rounded-md">
            <CardContent className="px-3 py-2 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Resumo
              </p>
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate leading-tight">
                      {item.productName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[11px] text-muted-foreground mr-1">x{item.quantity}</span>
                    <span className="text-[11px] font-medium">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-[10px] text-muted-foreground">+{items.length - 3} itens</p>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {isDelivery && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Entrega</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
          {/* Formulário de Checkout */}
          <Card className="gap-0 py-0 px-3 pt-3 pb-3 border-0 shadow-none lg:border lg:shadow">
            <CardHeader className="px-0 pt-0 pb-0 lg:px-4 lg:pt-3">
              <CardTitle className="text-base sm:text-lg">Dados do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-2 pb-0 lg:px-4 lg:pb-3">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 sm:space-y-4">
                  {/* Tipo de Pedido */}
                  <FormField
                    control={form.control}
                    name="orderType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Tipo de Pedido</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs sm:text-sm">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(OrderType).map((type) => (
                              <SelectItem key={type} value={type} className="text-xs sm:text-sm">
                                {orderTypeLabels[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Dados do Cliente */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                      Dados do Cliente
                    </h3>
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm">Nome Completo</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Seu nome"
                              className="h-9 text-xs sm:text-sm"
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
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">
                              Telefone / WhatsApp
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="(11) 99999-9999"
                                className="h-9 text-xs sm:text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">Email (opcional)</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="seu@email.com"
                                className="h-9 text-xs sm:text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Endereço (apenas para Delivery) */}
                  {isDelivery && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsAddressOpen(!isAddressOpen)}
                        className="flex items-center justify-between w-full group"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                            Endereço de Entrega
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
                                <FormLabel className="text-xs sm:text-sm">CEP</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="00000-000"
                                    className="h-9 text-xs sm:text-sm"
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
                                  <FormLabel className="text-xs sm:text-sm">Rua</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Nome da rua"
                                      className="h-9 text-xs sm:text-sm"
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
                                  <FormLabel className="text-xs sm:text-sm">Número</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="123"
                                      className="h-9 text-xs sm:text-sm"
                                      {...field}
                                    />
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
                                <FormLabel className="text-xs sm:text-sm">
                                  Complemento (opcional)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Apto, sala, etc."
                                    className="h-9 text-xs sm:text-sm"
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
                                  <FormLabel className="text-xs sm:text-sm">Bairro</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Bairro"
                                      className="h-9 text-xs sm:text-sm"
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
                                  <FormLabel className="text-xs sm:text-sm">Cidade</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Cidade"
                                      className="h-9 text-xs sm:text-sm"
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
                                  <FormLabel className="text-xs sm:text-sm">Estado</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="UF"
                                      className="h-9 text-xs sm:text-sm"
                                      {...field}
                                    />
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
                                  <FormLabel className="text-xs sm:text-sm">Referência</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Próximo a..."
                                      className="h-9 text-xs sm:text-sm"
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

                  {/* Método de Pagamento */}
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs sm:text-sm">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(PaymentMethod).map((method) => {
                              const Icon = paymentMethodIcons[method];
                              return (
                                <SelectItem
                                  key={method}
                                  value={method}
                                  className="text-xs sm:text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5" />
                                    {paymentMethodLabels[method]}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Observações */}
                  <FormField
                    control={form.control}
                    name="customerNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Alguma observação sobre o pedido?"
                            className="text-xs sm:text-sm min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      `Finalizar - R$ ${total.toFixed(2)}`
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Sidebar Resumo do Pedido - Desktop */}
          <div className="hidden lg:block">
            <div className="lg:sticky lg:top-4 space-y-4">
              <Card className="overflow-hidden">
                <CardHeader className="pb-1.5 px-3 pt-3">
                  <CardTitle className="text-xs font-semibold">Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-3 pb-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.productName}</p>
                        {item.variantName && (
                          <p className="text-[10px] text-muted-foreground">{item.variantName}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          R$ {item.price.toFixed(2)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="w-4 text-center text-xs">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    {isDelivery && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Entrega</span>
                        <span>R$ {deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-sm">
                      <span>Total</span>
                      <span>R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
