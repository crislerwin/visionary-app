// Types for AI Agent webhooks and configuration

// Use uppercase values to match Prisma enum
export enum AgentTone {
  FRIENDLY = "FRIENDLY",
  PROFESSIONAL = "PROFESSIONAL",
  CASUAL = "CASUAL",
  FORMAL = "FORMAL",
}

export enum AgentInteractionStatus {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  PENDING = "PENDING",
}

export enum AgentInteractionType {
  ORDER_CREATE = "ORDER_CREATE",
  ORDER_LIST = "ORDER_LIST",
  CONFIG_GET = "CONFIG_GET",
  CONFIG_UPDATE = "CONFIG_UPDATE",
  UNKNOWN = "UNKNOWN",
}

export interface WorkingHoursSlot {
  open: string;
  close: string;
}

export interface WorkingHours {
  monday?: WorkingHoursSlot[];
  tuesday?: WorkingHoursSlot[];
  wednesday?: WorkingHoursSlot[];
  thursday?: WorkingHoursSlot[];
  friday?: WorkingHoursSlot[];
  saturday?: WorkingHoursSlot[];
  sunday?: WorkingHoursSlot[];
}

export interface AgentConfig {
  id: string;
  tenantId: string;
  promptSystem: string;
  welcomeMessage?: string | null;
  tone: AgentTone;
  autoConfirm: boolean;
  workingHours?: WorkingHours | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentInteractionLog {
  id: string;
  tenantId: string;
  agentConfigId: string;
  type: AgentInteractionType;
  status: AgentInteractionStatus;
  customerPhone?: string | null;
  input?: unknown | null;
  output?: unknown | null;
  error?: string | null;
  durationMs?: number | null;
  ipAddress?: string | null;
  createdAt: Date;
}

// Webhook input types

export interface AgentOrderItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  notes?: string | null;
}

export interface AgentAddressInput {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string | null;
}

export interface AgentCustomerInput {
  name?: string | null;
  phone: string;
  email?: string | null;
}

export interface AgentOrderCreateInput {
  tenantId: string;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
  customer: AgentCustomerInput;
  items: AgentOrderItemInput[];
  address?: AgentAddressInput | null;
  customerNotes?: string | null;
  tableNumber?: string | null;
}

export interface AgentOrderListInput {
  tenantId: string;
  customerPhone: string;
  limit?: number;
}

export interface AgentWebhookResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AgentOrderCreateResponse {
  orderId: string;
  orderNumber: number;
  total: number;
  status: string;
  estimatedTime?: string | null;
}

export interface AgentOrderListItem {
  orderId: string;
  orderNumber: number;
  status: string;
  total: number;
  createdAt: Date;
  items: Array<{
    productName: string;
    quantity: number;
    totalPrice: number;
  }>;
}

export interface AgentOrderListResponse {
  orders: AgentOrderListItem[];
  total: number;
}

// API Response types

export interface AgentConfigResponse {
  id: string;
  promptSystem: string;
  welcomeMessage?: string | null;
  tone: AgentTone;
  autoConfirm: boolean;
  workingHours?: WorkingHours | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAgentConfigInput {
  promptSystem?: string;
  welcomeMessage?: string | null;
  tone?: AgentTone;
  autoConfirm?: boolean;
  workingHours?: WorkingHours | null;
  isActive?: boolean;
}
