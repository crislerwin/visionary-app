"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Banknote, ChevronDown, CreditCard, MessageCircle, QrCode } from "lucide-react";
import { useState } from "react";

export interface PaymentOption {
  enabled: boolean;
  key?: string;
  change?: boolean;
}

export interface PaymentOptions {
  pix?: PaymentOption;
  creditCard?: PaymentOption;
  debitCard?: PaymentOption;
  cash?: PaymentOption;
  whatsappOrder?: PaymentOption;
}

export interface CustomerFormField {
  enabled: boolean;
  required: boolean;
  label?: string;
  placeholder?: string;
}

export interface CustomerForm {
  name?: CustomerFormField;
  phone?: CustomerFormField;
  email?: CustomerFormField;
  address?: CustomerFormField;
  notes?: CustomerFormField;
  tableNumber?: CustomerFormField;
}

const PAYMENT_METHODS: {
  key: keyof PaymentOptions;
  label: string;
  icon: typeof QrCode;
  hasKey?: boolean;
  hasChange?: boolean;
}[] = [
  { key: "pix", label: "PIX", icon: QrCode, hasKey: true },
  { key: "creditCard", label: "Cartão de crédito", icon: CreditCard },
  { key: "debitCard", label: "Cartão de débito", icon: CreditCard },
  { key: "cash", label: "Dinheiro", icon: Banknote, hasChange: true },
  { key: "whatsappOrder", label: "WhatsApp", icon: MessageCircle },
];

const CUSTOMER_FIELDS: {
  key: keyof CustomerForm;
  label: string;
  defaultLabel: string;
  defaultPlaceholder: string;
}[] = [
  { key: "name", label: "Nome", defaultLabel: "Nome Completo", defaultPlaceholder: "Seu nome" },
  {
    key: "phone",
    label: "Telefone",
    defaultLabel: "Telefone / WhatsApp",
    defaultPlaceholder: "(11) 99999-9999",
  },
  { key: "email", label: "Email", defaultLabel: "Email", defaultPlaceholder: "seu@email.com" },
  {
    key: "address",
    label: "Endereço",
    defaultLabel: "Endereço de entrega",
    defaultPlaceholder: "Rua, número, bairro",
  },
  {
    key: "notes",
    label: "Observações",
    defaultLabel: "Observações",
    defaultPlaceholder: "Alguma observação sobre o pedido?",
  },
  {
    key: "tableNumber",
    label: "Nº da Mesa",
    defaultLabel: "Número da Mesa",
    defaultPlaceholder: "Ex: 12",
  },
];

interface CheckoutConfigEditorProps {
  paymentOptions: PaymentOptions;
  onPaymentOptionsChange: (value: PaymentOptions) => void;
  customerForm: CustomerForm;
  onCustomerFormChange: (value: CustomerForm) => void;
}

export function CheckoutConfigEditor({
  paymentOptions,
  onPaymentOptionsChange,
  customerForm,
  onCustomerFormChange,
}: CheckoutConfigEditorProps) {
  const [openField, setOpenField] = useState<string | null>(null);

  const togglePayment = (key: keyof PaymentOptions) => {
    const current = paymentOptions[key] ?? { enabled: false };
    onPaymentOptionsChange({
      ...paymentOptions,
      [key]: { ...current, enabled: !current.enabled },
    });
  };

  const updatePaymentOption = (
    key: keyof PaymentOptions,
    field: keyof PaymentOption,
    value: unknown,
  ) => {
    const current = paymentOptions[key] ?? { enabled: true };
    onPaymentOptionsChange({
      ...paymentOptions,
      [key]: { ...current, [field]: value },
    });
  };

  const toggleCustomerField = (key: keyof CustomerForm) => {
    const current = customerForm[key] ?? { enabled: false, required: false };
    onCustomerFormChange({
      ...customerForm,
      [key]: { ...current, enabled: !current.enabled },
    });
  };

  const toggleCustomerRequired = (key: keyof CustomerForm) => {
    const current = customerForm[key] ?? { enabled: true, required: false };
    onCustomerFormChange({
      ...customerForm,
      [key]: { ...current, required: !current.required },
    });
  };

  const updateCustomerField = (
    key: keyof CustomerForm,
    field: keyof CustomerFormField,
    value: string,
  ) => {
    const current = customerForm[key] ?? { enabled: true, required: false };
    onCustomerFormChange({
      ...customerForm,
      [key]: { ...current, [field]: value },
    });
  };

  const enabledCount = PAYMENT_METHODS.filter((m) => paymentOptions[m.key]?.enabled).length;

  return (
    <div className="space-y-5">
      {/* Payment Options */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Pagamento</h3>
          {enabledCount === 0 ? (
            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              Selecione pelo menos um
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              {enabledCount} ativo{enabledCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="rounded-lg border divide-y">
          {PAYMENT_METHODS.map((method) => {
            const option = paymentOptions[method.key] ?? { enabled: false };
            const Icon = method.icon;
            const isEnabled = option.enabled;

            return (
              <div key={method.key} className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isEnabled ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span className="text-xs flex-1">{method.label}</span>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => togglePayment(method.key)}
                    className="scale-75"
                  />
                </div>

                {isEnabled && method.hasKey && (
                  <div className="mt-1.5 ml-6.5">
                    <input
                      type="text"
                      value={option.key ?? ""}
                      onChange={(e) => updatePaymentOption(method.key, "key", e.target.value)}
                      placeholder="Chave PIX"
                      className="w-full h-7 rounded-md border border-border bg-background px-2 text-[11px]"
                    />
                  </div>
                )}

                {isEnabled && method.hasChange && (
                  <div className="mt-1.5 ml-6.5 flex items-center gap-2">
                    <Switch
                      checked={option.change ?? false}
                      onCheckedChange={(v) => updatePaymentOption(method.key, "change", v)}
                      id={`change-${method.key}`}
                      className="scale-[0.65]"
                    />
                    <Label htmlFor={`change-${method.key}`} className="text-[10px] cursor-pointer">
                      Aceita troco
                    </Label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Customer Form Fields — Accordion */}
      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold">Campos do cliente</h3>
          <p className="text-[11px] text-muted-foreground">Clique para expandir e configurar</p>
        </div>

        <div className="rounded-lg border divide-y">
          {CUSTOMER_FIELDS.map((field) => {
            const config = customerForm[field.key] ?? {
              enabled: ["name", "phone", "address"].includes(field.key),
              required: ["name", "phone", "address"].includes(field.key),
            };
            const isOpen = openField === field.key;

            return (
              <div key={field.key} className="flex items-center gap-2 px-3 py-2">
                <Switch
                  checked={config.enabled}
                  onCheckedChange={() => toggleCustomerField(field.key)}
                  className="scale-75 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setOpenField(isOpen ? null : field.key)}
                  className="flex-1 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors min-w-0"
                >
                  <span className="text-xs flex-1 truncate">{field.label}</span>
                  {config.enabled && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                        config.required
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {config.required ? "Obrig." : "Opcional"}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && config.enabled && (
                  <div className="px-3 pb-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCustomerRequired(field.key)}
                        className={`text-[10px] h-5 px-2 rounded-full border transition-colors ${
                          config.required
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-muted-foreground"
                        }`}
                      >
                        {config.required ? "Obrigatório" : "Opcional"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">
                          Rótulo
                        </Label>
                        <input
                          type="text"
                          value={config.label ?? field.defaultLabel}
                          onChange={(e) => updateCustomerField(field.key, "label", e.target.value)}
                          className="w-full h-7 rounded-md border border-border bg-background px-2 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">
                          Placeholder
                        </Label>
                        <input
                          type="text"
                          value={config.placeholder ?? field.defaultPlaceholder}
                          onChange={(e) =>
                            updateCustomerField(field.key, "placeholder", e.target.value)
                          }
                          className="w-full h-7 rounded-md border border-border bg-background px-2 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
