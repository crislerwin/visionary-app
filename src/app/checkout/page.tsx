"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PaymentMethod, OrderType } from "@prisma/client";
import { Loader2, Minus, Plus, Trash2, MapPin, CreditCard, Banknote, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { api } from "@/lib/trpc/react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOrderMutation = api.order.createOrder.useMutation({
    onSuccess: (data: { id: string }) => {
      clearCart();
      router.push(`/checkout/success?orderId=${data.id}`);
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

    setIsSubmitting(true);

    const orderItems = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
      notes: item.notes,
      productName: item.productName,
    }));

    // TODO: Get tenantId from URL, subdomain, or context
    const tenantId = "dummy-tenant-id";

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
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Seu carrinho está vazio
            </p>
            <Button onClick={() => router.push("/")}>Continuar Comprando</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Finalizar Pedido</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId || "default"}`}
                className="flex items-center gap-4 py-2"
              >
                <div className="flex-1">
                  <p className="font-medium">{item.productName}</p>
                  {item.variantName && (
                    <p className="text-sm text-muted-foreground">
                      {item.variantName}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground">
                      Obs: {item.notes}
                    </p>
                  )}
                  <p className="text-sm">
                    R$ {item.price.toFixed(2)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1, item.variantId)
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1, item.variantId)
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(item.productId, item.variantId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {isDelivery && (
                <div className="flex justify-between text-sm">
                  <span>Taxa de Entrega</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Checkout */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Tipo de Pedido */}
                <FormField
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pedido</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de pedido" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(OrderType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {orderTypeLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dados do Cliente */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Dados do Cliente
                  </h3>
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone / WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Endereço (apenas para Delivery) */}
                {isDelivery && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium text-sm text-muted-foreground">
                        Endereço de Entrega
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="addressZipCode"
                        render={({ field }) => (
                          <FormItem className="col-span-1">
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input placeholder="00000-000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="addressStreet"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da rua" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="addressNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="addressComplement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Apto, sala, etc."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="addressNeighborhood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input placeholder="Bairro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="addressCity"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="addressState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input placeholder="UF" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="addressReference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ponto de Referência (opcional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Próximo a..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Método de Pagamento */}
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pagamento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o método de pagamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(PaymentMethod).map((method) => {
                            const Icon = paymentMethodIcons[method];
                            return (
                              <SelectItem key={method} value={method}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {paymentMethodLabels[method]}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Observações */}
                <FormField
                  control={form.control}
                  name="customerNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Alguma observação sobre o pedido?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    `Finalizar Pedido - R$ ${total.toFixed(2)}`
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
