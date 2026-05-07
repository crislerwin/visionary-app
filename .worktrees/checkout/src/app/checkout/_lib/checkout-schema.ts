import type { CustomerForm } from "@/components/settings/checkout-config-editor";
import { OrderType, PaymentMethod } from "@prisma/client";
import { z } from "zod";

export type CheckoutFormValues = {
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZipCode?: string;
  addressReference?: string;
  customerNotes?: string;
  tableNumber?: string;
};

export function getFieldConfig(customerForm: CustomerForm | null, key: keyof CustomerForm) {
  const defaults: Record<keyof CustomerForm, { enabled: boolean; required: boolean }> = {
    name: { enabled: true, required: true },
    phone: { enabled: true, required: true },
    email: { enabled: false, required: false },
    address: { enabled: true, required: true },
    notes: { enabled: false, required: false },
    tableNumber: { enabled: false, required: false },
  };
  const field = customerForm?.[key];
  return {
    enabled: field?.enabled ?? defaults[key].enabled,
    required: field?.required ?? defaults[key].required,
    label: field?.label,
    placeholder: field?.placeholder,
  };
}

export function buildCheckoutSchema(customerForm: CustomerForm | null) {
  const shape: Record<string, z.ZodTypeAny> = {
    orderType: z.nativeEnum(OrderType, {
      errorMap: () => ({ message: "Selecione o tipo de pedido" }),
    }),
    paymentMethod: z
      .nativeEnum(PaymentMethod, {
        errorMap: () => ({ message: "Selecione um método de pagamento" }),
      })
      .nullish(),
  };

  const addField = (key: keyof CustomerForm, fieldName: string, base: z.ZodTypeAny) => {
    if (getFieldConfig(customerForm, key).enabled) {
      shape[fieldName] = base;
    }
  };

  addField("name", "customerName", z.string().optional());
  addField("phone", "customerPhone", z.string().optional());
  addField(
    "email",
    "customerEmail",
    z.string().email("Email inválido").optional().or(z.literal("")),
  );
  addField("address", "addressStreet", z.string().optional());
  addField("address", "addressNumber", z.string().optional());
  addField("address", "addressComplement", z.string().optional());
  addField("address", "addressNeighborhood", z.string().optional());
  addField("address", "addressCity", z.string().optional());
  addField("address", "addressState", z.string().optional());
  addField("address", "addressZipCode", z.string().optional());
  addField("address", "addressReference", z.string().optional());
  addField("notes", "customerNotes", z.string().optional());
  addField("tableNumber", "tableNumber", z.string().optional());

  return z.object(shape).superRefine((data, ctx) => {
    const check = (key: keyof CustomerForm, value: unknown, msg: string, path: string[]) => {
      const config = getFieldConfig(customerForm, key);
      if (
        config.enabled &&
        config.required &&
        (!value || (typeof value === "string" && value.trim() === ""))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg,
          path,
        });
      }
    };

    check("name", data.customerName, "Nome é obrigatório", ["customerName"]);
    check("phone", data.customerPhone, "Telefone é obrigatório", ["customerPhone"]);
    check("email", data.customerEmail, "Email é obrigatório", ["customerEmail"]);

    if (data.orderType === OrderType.DELIVERY && getFieldConfig(customerForm, "address").enabled) {
      if (getFieldConfig(customerForm, "address").required) {
        check("address", data.addressStreet, "Rua é obrigatória", ["addressStreet"]);
        check("address", data.addressNumber, "Número é obrigatório", ["addressNumber"]);
        check("address", data.addressNeighborhood, "Bairro é obrigatório", ["addressNeighborhood"]);
        check("address", data.addressCity, "Cidade é obrigatória", ["addressCity"]);
        check("address", data.addressState, "Estado é obrigatório", ["addressState"]);
        check("address", data.addressZipCode, "CEP é obrigatório", ["addressZipCode"]);
      }
    }

    check("tableNumber", data.tableNumber, "Número da mesa é obrigatório", ["tableNumber"]);

    if (
      data.orderType !== OrderType.DINE_IN &&
      (!data.paymentMethod || data.paymentMethod === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione um método de pagamento",
        path: ["paymentMethod"],
      });
    }
  }) as unknown as z.ZodSchema<CheckoutFormValues>;
}

export function getDefaultValues(customerForm: CustomerForm | null): Partial<CheckoutFormValues> {
  const vals: Partial<CheckoutFormValues> = {
    orderType: OrderType.DELIVERY,
    paymentMethod: undefined,
  };
  if (getFieldConfig(customerForm, "name").enabled) vals.customerName = "";
  if (getFieldConfig(customerForm, "phone").enabled) vals.customerPhone = "";
  if (getFieldConfig(customerForm, "email").enabled) vals.customerEmail = "";
  if (getFieldConfig(customerForm, "address").enabled) {
    vals.addressStreet = "";
    vals.addressNumber = "";
    vals.addressComplement = "";
    vals.addressNeighborhood = "";
    vals.addressCity = "";
    vals.addressState = "";
    vals.addressZipCode = "";
    vals.addressReference = "";
  }
  if (getFieldConfig(customerForm, "notes").enabled) vals.customerNotes = "";
  if (getFieldConfig(customerForm, "tableNumber").enabled) vals.tableNumber = "";
  return vals;
}
