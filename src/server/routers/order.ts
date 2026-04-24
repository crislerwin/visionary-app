import { z } from "zod";
import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "@/lib/trpc/trpc";
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "@prisma/client";

const orderItemInputSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  notes: z.string().optional(),
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
    name: z.string().min(1, "Nome é obrigatório"),
    phone: z.string().min(1, "Telefone é obrigatório"),
    email: z.string().email().optional(),
  }),
  address: addressInputSchema.optional(),
  items: z.array(orderItemInputSchema).min(1, "Adicione pelo menos um item"),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  total: z.number().min(0),
  paymentMethod: z.nativeEnum(PaymentMethod),
  customerNotes: z.string().optional(),
});

const getOrderByIdInputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
});

export const orderRouter = router({
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(async ({ input }) => {
      const { tenantId } = input;

      // Buscar ou criar cliente
      let customer = await prisma.customer.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone: input.customer.phone,
          },
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: input.customer.name,
            phone: input.customer.phone,
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
          paymentMethod: input.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          address: input.address,
          customerNotes: input.customerNotes,
          customerId: customer.id,
          tenantId,
          items: {
            create: input.items.map((item) => ({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              notes: item.notes,
              productName: item.productName,
              productId: item.productId,
              variantId: item.variantId,
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
        },
      });

      return order;
    }),

  getOrderById: publicProcedure
    .input(getOrderByIdInputSchema)
    .query(async ({ input }) => {
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
});
