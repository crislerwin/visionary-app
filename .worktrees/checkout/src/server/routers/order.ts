import { prisma } from "@/lib/db";
import { publicProcedure, router, tenantProcedure } from "@/lib/trpc/trpc";
import {
  CashRegisterStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const orderItemInputSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullish(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  notes: z.string().nullish(),
  productName: z.string(),
});

const addressInputSchema = z.object({
  street: z.string(),
  number: z.string(),
  complement: z.string().optional(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  reference: z.string().optional(),
});

const createOrderInputSchema = z.object({
  tenantId: z.string(),
  type: z.nativeEnum(OrderType),
  customer: z.object({
    name: z.string().nullish(),
    phone: z.string().nullish(),
    email: z.string().email().nullish(),
  }),
  address: addressInputSchema.nullish(),
  items: z.array(orderItemInputSchema).min(1, "Adicione pelo menos um item"),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0).nullish(),
  discount: z.number().min(0).nullish(),
  total: z.number().min(0),
  paymentMethod: z.nativeEnum(PaymentMethod).nullish(),
  customerNotes: z.string().nullish(),
  tableNumber: z.string().nullish(),
  source: z.string().optional(),
});

const getOrderByIdInputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
});

const listOrdersInputSchema = z.object({
  tenantId: z.string(),
  status: z.nativeEnum(OrderStatus).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const updateStatusInputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: z.nativeEnum(OrderStatus),
});

const cancelOrderInputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
});

const generateWhatsAppMessageInputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
});

// Helper function to get allowed next statuses based on current status and order type
function getAllowedNextStatuses(currentStatus: OrderStatus, orderType: OrderType): OrderStatus[] {
  switch (currentStatus) {
    case OrderStatus.PENDING:
      return [OrderStatus.CONFIRMED, OrderStatus.CANCELLED];
    case OrderStatus.CONFIRMED:
      return [OrderStatus.PREPARING, OrderStatus.CANCELLED];
    case OrderStatus.PREPARING:
      return [OrderStatus.READY];
    case OrderStatus.READY:
      return orderType === OrderType.DELIVERY
        ? [OrderStatus.OUT_FOR_DELIVERY]
        : [OrderStatus.DELIVERED];
    case OrderStatus.OUT_FOR_DELIVERY:
      return [OrderStatus.DELIVERED];
    default:
      return [];
  }
}

// Helper function to check if status transition is valid
function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  orderType: OrderType,
): boolean {
  const allowedStatuses = getAllowedNextStatuses(currentStatus, orderType);
  return allowedStatuses.includes(newStatus);
}

// Helper function to get timestamp field for a status
function getTimestampField(status: OrderStatus): string | null {
  switch (status) {
    case OrderStatus.CONFIRMED:
      return "confirmedAt";
    case OrderStatus.READY:
      return "readyAt";
    case OrderStatus.DELIVERED:
      return "deliveredAt";
    default:
      return null;
  }
}

// Helper: cria transação no caixa aberto do tenant quando pedido é pago/entregue
async function syncOrderWithCashRegister(
  tenantId: string,
  orderId: string,
  amount: number,
  paymentMethod: PaymentMethod | null,
  description: string,
  createdBy: string,
) {
  // Evita duplicatas
  const existing = await prisma.cashRegisterTransaction.findFirst({
    where: { orderId },
  });
  if (existing) return;

  let cashRegister = await prisma.cashRegister.findFirst({
    where: { tenantId, status: CashRegisterStatus.OPEN },
    orderBy: { openedAt: "desc" },
  });

  // Se não houver caixa aberto, cria um automaticamente
  if (!cashRegister) {
    cashRegister = await prisma.cashRegister.create({
      data: {
        tenantId,
        openedBy: createdBy,
        initialAmount: 0,
        status: CashRegisterStatus.OPEN,
      },
    });
  }

  await prisma.cashRegisterTransaction.create({
    data: {
      cashRegisterId: cashRegister.id,
      type: TransactionType.SALE,
      amount,
      description,
      paymentMethod: paymentMethod ?? undefined,
      orderId,
      createdBy,
    },
  });
}

export const orderRouter = router({
  createOrder: publicProcedure.input(createOrderInputSchema).mutation(async ({ input }) => {
    const { tenantId } = input;

    // Verificar se o tenant existe e está ativo
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.isActive) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Tenant not found or inactive",
      });
    }

    const customerPhone = input.customer.phone || "";
    const customerName = input.customer.name || "Cliente";

    // Buscar ou criar cliente
    let customer = await prisma.customer.findUnique({
      where: {
        tenantId_phone: {
          tenantId,
          phone: customerPhone,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: customerPhone,
          email: input.customer.email,
          tenantId,
        },
      });
    } else {
      // Atualizar informações do cliente se necessário
      if (input.customer.name || input.customer.email) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            name: input.customer.name || customer.name,
            email: input.customer.email || customer.email,
          },
        });
      }
    }

    // Gerar número do pedido sequencial por tenant
    const lastOrder = await prisma.order.findFirst({
      where: { tenantId },
      orderBy: { orderNumber: "desc" },
    });
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    // Criar o pedido
    const order = await prisma.order.create({
      data: {
        orderNumber,
        type: input.type,
        status: OrderStatus.PENDING,
        subtotal: input.subtotal,
        deliveryFee: input.deliveryFee,
        discount: input.discount,
        total: input.total,
        paymentMethod: input.paymentMethod ?? undefined,
        paymentStatus: PaymentStatus.PENDING,
        source: input.source ?? "WEB",
        address: input.address ?? undefined,
        customerNotes: input.customerNotes ?? undefined,
        tableNumber: input.tableNumber ?? undefined,
        customerId: customer.id,
        tenantId,
        items: {
          create: input.items.map((item) => ({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes ?? undefined,
            productName: item.productName,
            productId: item.productId,
            variantId: item.variantId ?? undefined,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        customer: true,
        tenant: true,
      },
    });

    return order;
  }),

  getOrderById: publicProcedure.input(getOrderByIdInputSchema).query(async ({ input }) => {
    const { tenantId } = input;

    const order = await prisma.order.findFirst({
      where: {
        id: input.id,
        tenantId,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        customer: true,
        tenant: true,
      },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Pedido não encontrado",
      });
    }

    return order;
  }),

  list: tenantProcedure.input(listOrdersInputSchema).query(async ({ input }) => {
    const { tenantId, status, startDate, endDate } = input;

    const where: {
      tenantId: string;
      status?: OrderStatus;
      createdAt?: { gte?: Date; lte?: Date };
    } = { tenantId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        customer: true,
        tenant: true,
      },
    });

    return orders;
  }),

  updateStatus: tenantProcedure.input(updateStatusInputSchema).mutation(async ({ input }) => {
    const { id, tenantId, status: newStatus } = input;

    const order = await prisma.order.findFirst({
      where: { id, tenantId },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Pedido não encontrado",
      });
    }

    // Validate status transition
    if (!isValidStatusTransition(order.status, newStatus, order.type)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Transição de status inválida: ${order.status} -> ${newStatus}`,
      });
    }

    // Build update data with timestamps
    const updateData: {
      status: OrderStatus;
      paymentStatus?: PaymentStatus;
      paidAt?: Date;
      confirmedAt?: Date;
      readyAt?: Date;
      deliveredAt?: Date;
    } = { status: newStatus };

    // Set timestamp for specific statuses
    const timestampField = getTimestampField(newStatus);
    if (timestampField) {
      (updateData as Record<string, unknown>)[timestampField] = new Date();
    }

    // Update payment status when order is confirmed (PAID)
    if (newStatus === OrderStatus.CONFIRMED) {
      updateData.paymentStatus = PaymentStatus.PAID;
      updateData.paidAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        customer: true,
      },
    });

    // Sincroniza com caixa quando pedido é confirmado (pago) ou entregue
    if (newStatus === OrderStatus.CONFIRMED || newStatus === OrderStatus.DELIVERED) {
      await syncOrderWithCashRegister(
        tenantId,
        updatedOrder.id,
        Number(updatedOrder.total),
        updatedOrder.paymentMethod,
        `Pedido #${updatedOrder.orderNumber} - ${updatedOrder.type}`,
        "system",
      );
    }

    return updatedOrder;
  }),

  cancel: tenantProcedure.input(cancelOrderInputSchema).mutation(async ({ input }) => {
    const { id, tenantId } = input;

    const order = await prisma.order.findFirst({
      where: { id, tenantId },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Pedido não encontrado",
      });
    }

    // Only allow cancellation if status is PENDING or CONFIRMED
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Pedido só pode ser cancelado se estiver Pendente ou Confirmado",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        customer: true,
      },
    });

    return updatedOrder;
  }),

  generateWhatsAppMessage: publicProcedure
    .input(generateWhatsAppMessageInputSchema)
    .query(async ({ input }) => {
      const { id, tenantId } = input;

      const order = await prisma.order.findFirst({
        where: { id, tenantId },
        include: {
          items: true,
          customer: true,
          tenant: true,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pedido não encontrado",
        });
      }

      // Não gera mensagem para pedidos DINE_IN
      if (order.type === OrderType.DINE_IN) {
        return { message: null };
      }

      // Format order type
      const orderTypeLabels: Record<OrderType, string> = {
        [OrderType.DELIVERY]: "Delivery",
        [OrderType.PICKUP]: "Retirada",
        [OrderType.DINE_IN]: "Comer no Local",
      };

      // Format payment method
      const paymentMethodLabels: Record<PaymentMethod, string> = {
        [PaymentMethod.CASH]: "Dinheiro",
        [PaymentMethod.PIX]: "PIX",
        [PaymentMethod.CREDIT_CARD]: "Cartão de Crédito",
        [PaymentMethod.DEBIT_CARD]: "Cartão de Débito",
        [PaymentMethod.OTHERS]: "Outros",
      };

      // Build the message
      let message = `*NOVO PEDIDO #${order.orderNumber}*\n\n`;

      // Customer info
      message += "*Cliente:*\n";
      message += `Nome: ${order.customer.name || "Não informado"}\n`;
      message += `Telefone: ${order.customer.phone}\n`;
      if (order.customer.email) {
        message += `Email: ${order.customer.email}\n`;
      }
      message += "\n";

      // Order type and address
      message += `*Tipo:* ${orderTypeLabels[order.type]}\n`;
      if (order.type === OrderType.DELIVERY && order.address) {
        const address = order.address as {
          street: string;
          number: string;
          complement?: string;
          neighborhood: string;
          city: string;
          state: string;
          zipCode: string;
          reference?: string;
        };
        message += "\n*Endereço:*\n";
        message += `${address.street}, ${address.number}\n`;
        if (address.complement) {
          message += `Complemento: ${address.complement}\n`;
        }
        message += `Bairro: ${address.neighborhood}\n`;
        message += `Cidade: ${address.city} - ${address.state}\n`;
        message += `CEP: ${address.zipCode}\n`;
        if (address.reference) {
          message += `Referência: ${address.reference}\n`;
        }
      }
      message += "\n";

      // Items
      message += "*Itens:*\n";
      for (const item of order.items) {
        const _unitPrice = Number(item.unitPrice).toFixed(2);
        const totalPrice = Number(item.totalPrice).toFixed(2);
        message += `${item.quantity}x ${item.productName} - R$ ${totalPrice}`;
        if (item.notes) {
          message += ` (${item.notes})`;
        }
        message += "\n";
      }
      message += "\n";

      // Totals
      message += "*Valores:*\n";
      message += `Subtotal: R$ ${Number(order.subtotal).toFixed(2)}\n`;
      if (order.deliveryFee) {
        message += `Taxa de Entrega: R$ ${Number(order.deliveryFee).toFixed(2)}\n`;
      }
      if (order.discount) {
        message += `Desconto: -R$ ${Number(order.discount).toFixed(2)}\n`;
      }
      message += `*Total: R$ ${Number(order.total).toFixed(2)}*\n`;
      message += "\n";

      // Payment
      if (order.paymentMethod) {
        message += `*Pagamento:* ${paymentMethodLabels[order.paymentMethod]}\n`;
      }

      // Notes
      if (order.customerNotes) {
        message += `\n*Observações:* ${order.customerNotes}\n`;
      }

      return { message };
    }),
});
