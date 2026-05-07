import { PaymentMethod } from "@prisma/client";
import { Banknote, CreditCard, QrCode, Wallet } from "lucide-react";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.CREDIT_CARD]: "Cartão de Crédito",
  [PaymentMethod.DEBIT_CARD]: "Cartão de Débito",
  [PaymentMethod.OTHERS]: "Outros",
};

export const paymentMethodIcons = {
  [PaymentMethod.CASH]: Banknote,
  [PaymentMethod.PIX]: QrCode,
  [PaymentMethod.CREDIT_CARD]: CreditCard,
  [PaymentMethod.DEBIT_CARD]: CreditCard,
  [PaymentMethod.OTHERS]: Wallet,
};

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildWhatsAppMessage(
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
