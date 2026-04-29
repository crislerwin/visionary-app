"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Minus, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type { CustomerForm, PaymentOptions } from "@/components/settings/checkout-config-editor";
import { useCartStore } from "@/stores/cart-store";

interface MenuCartDrawerProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  tenantSlug: string;
  colors?: {
    primary?: string;
    primaryText?: string;
  };
  paymentOptions?: PaymentOptions;
  whatsappPhone?: string | null;
  customerForm?: CustomerForm;
}

function buildWhatsAppMessage(
  items: Array<{
    productName: string;
    variantName?: string | null;
    quantity: number;
    price: number;
    notes?: string;
  }>,
  total: number,
): string {
  let message = "Olá! Gostaria de fazer um pedido:\n\n";
  for (const item of items) {
    const line = `${item.quantity}x ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}`;
    const price = (item.price * item.quantity).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    message += `${line} - ${price}\n`;
    if (item.notes) {
      message += `   Obs: ${item.notes}\n`;
    }
  }
  message += `\n*Total: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*`;
  return message;
}

function getEnabledPaymentMethods(paymentOptions?: PaymentOptions): string[] {
  if (!paymentOptions) return [];
  const methods: string[] = [];
  if (paymentOptions.pix?.enabled) methods.push("pix");
  if (paymentOptions.creditCard?.enabled) methods.push("creditCard");
  if (paymentOptions.debitCard?.enabled) methods.push("debitCard");
  if (paymentOptions.cash?.enabled) methods.push("cash");
  if (paymentOptions.whatsappOrder?.enabled) methods.push("whatsappOrder");
  return methods;
}

export function MenuCartDrawer({
  open,
  onClose,
  tenantId,
  tenantSlug,
  colors,
  paymentOptions,
  whatsappPhone,
  customerForm,
}: MenuCartDrawerProps) {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();
  const total = getTotalPrice();

  const enabledMethods = getEnabledPaymentMethods(paymentOptions);
  const hasWhatsAppOnly = enabledMethods.length === 1 && enabledMethods[0] === "whatsappOrder";
  const hasWhatsAppHybrid = enabledMethods.includes("whatsappOrder") && enabledMethods.length > 1;

  const hasAnyCustomerField =
    customerForm != null && Object.values(customerForm).some((field) => field?.enabled === true);

  const skipCheckout =
    !hasAnyCustomerField && paymentOptions?.whatsappOrder?.enabled === true && !!whatsappPhone;

  const handleCheckout = () => {
    router.push(
      `/checkout?tenantId=${encodeURIComponent(tenantId)}&tenantSlug=${encodeURIComponent(tenantSlug)}`,
    );
  };

  const handleWhatsAppOrder = () => {
    if (!whatsappPhone) return;
    const cleanPhone = whatsappPhone.replace(/\D/g, "");
    if (!cleanPhone) return;
    const message = buildWhatsAppMessage(items, total);
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    clearCart();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border flex flex-col"
          >
            <header className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                >
                  Seu pedido
                </h2>
                <p className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "item" : "itens"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Carrinho vazio
                </div>
              ) : (
                items.map((line) => (
                  <div key={line.id} className="flex gap-3">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {line.productImage ? (
                        <Image
                          src={line.productImage}
                          alt={line.productName}
                          fill
                          className="object-cover"
                          unoptimized
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground text-[10px]">
                          Sem imagem
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-tight">{line.productName}</h3>
                        <button
                          type="button"
                          onClick={() => removeItem(line.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {line.variantName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{line.variantName}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBRL(line.price)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1 rounded-full border border-border">
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.id, line.quantity - 1)}
                            className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted rounded-l-full transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.id, line.quantity + 1)}
                            className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted rounded-r-full transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold">
                          {formatBRL(line.price * line.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-border p-5 space-y-3 bg-card">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatBRL(total)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatBRL(total)}</span>
                  </div>
                </div>

                {(hasWhatsAppOnly || skipCheckout) && whatsappPhone ? (
                  <button
                    type="button"
                    onClick={handleWhatsAppOrder}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold transition-colors hover:opacity-90"
                    style={{
                      backgroundColor: "#25d366",
                      color: "#ffffff",
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar pedido pelo WhatsApp
                  </button>
                ) : hasWhatsAppHybrid && whatsappPhone ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleCheckout}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold transition-colors hover:opacity-90"
                      style={{
                        backgroundColor: colors?.primary ?? "var(--foreground)",
                        color: colors?.primaryText ?? "var(--background)",
                      }}
                    >
                      Finalizar pedido
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsAppOrder}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full py-3 font-semibold transition-colors hover:opacity-90 border-2"
                      style={{
                        borderColor: "#25d366",
                        color: "#25d366",
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar pelo WhatsApp
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold transition-colors hover:opacity-90"
                    style={{
                      backgroundColor: colors?.primary ?? "var(--foreground)",
                      color: colors?.primaryText ?? "var(--background)",
                    }}
                  >
                    Finalizar pedido
                  </button>
                )}
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
