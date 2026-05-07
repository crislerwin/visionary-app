import type { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "@prisma/client";

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  image?: string | null;
}

export interface OrderAddress {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  complement?: string;
  reference?: string;
}

export interface OrderWithItemsAndTenant {
  id: string;
  type: OrderType;
  status: OrderStatus;
  total: number;
  subtotal: number;
  deliveryFee: number | null;
  discount: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  readyAt: Date | null;
  deliveredAt: Date | null;
  paidAt: Date | null;
  tenantId: string;
  items: OrderItem[];
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    addresses: unknown;
  } | null;
  tenant: {
    name: string;
    whatsappPhone: string | null;
  } | null;
  address: unknown | null;
}

export type OrderListOutput = OrderWithItemsAndTenant[];
