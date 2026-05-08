import { prisma } from "@/lib/db";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export function createTools(tenantId: string) {
  return [
    new DynamicStructuredTool({
      name: "list_categories",
      description:
        "Lista todas as categorias do cardápio com seus produtos, preços, descrições e variações (tamanhos).",
      schema: z.object({}),
      func: async () => {
        const categories = await prisma.category.findMany({
          where: { tenantId, isActive: true, isDeleted: false },
          include: {
            products: {
              where: { isActive: true, isDeleted: false },
              include: { variants: { where: { isActive: true } } },
              orderBy: { name: "asc" },
            },
          },
          orderBy: { sortOrder: "asc" },
        });

        return JSON.stringify(
          categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            products: cat.products.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: Number(p.price),
              variants: p.variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: Number(v.price),
              })),
              image: p.image,
            })),
          })),
        );
      },
    }),

    new DynamicStructuredTool({
      name: "create_order",
      description:
        "Cria um pedido no sistema. Use quando o cliente confirmar todos os dados: itens, tipo e endereço (se delivery). Aceita nomes de produtos em vez de IDs.",
      schema: z.object({
        customerPhone: z.string().describe("Telefone do cliente com DDD (ex: 11999998888)"),
        customerName: z.string().optional().describe("Nome do cliente"),
        items: z
          .array(
            z.object({
              productName: z.string().describe("Nome do produto (ex: Calabresa, Marguerita)"),
              quantity: z.number().int().positive().describe("Quantidade"),
              variantName: z.string().optional().describe("Nome da variação/tamanho se houver"),
              notes: z.string().optional().describe("Observações para este item"),
            }),
          )
          .min(1),
        type: z
          .enum(["DELIVERY", "PICKUP", "DINE_IN"])
          .describe(
            "Tipo do pedido: DELIVERY (entrega), PICKUP (retirada) ou DINE_IN (consumo local)",
          ),
        deliveryAddress: z
          .string()
          .optional()
          .describe("Endereço de entrega (obrigatório para DELIVERY)"),
        customerNotes: z.string().optional().describe("Observações gerais do pedido"),
      }),
      func: async ({
        customerPhone,
        customerName,
        items,
        type,
        deliveryAddress,
        customerNotes,
      }) => {
        const customer = await prisma.customer.upsert({
          where: { tenantId_phone: { tenantId, phone: customerPhone } },
          update: { name: customerName ?? undefined },
          create: { tenantId, phone: customerPhone, name: customerName ?? null },
        });

        // Get all products for lookup
        const products = await prisma.product.findMany({
          where: { tenantId, isActive: true, isDeleted: false },
          include: { variants: true },
        });
        const productMap = new Map(products.map((p) => [p.name.toLowerCase(), p]));

        const lastOrder = await prisma.order.findFirst({
          where: { tenantId },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        });
        const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

        let subtotal = 0;
        const orderItemsData = [];

        for (const item of items) {
          const product = productMap.get(item.productName.toLowerCase());
          if (!product) {
            throw new Error(`Produto não encontrado: ${item.productName}`);
          }

          let unitPrice = Number(product.price);
          let variantId = null;

          if (item.variantName) {
            const name = item.variantName;
            const variant = product.variants.find(
              (v) => v.name.toLowerCase() === name.toLowerCase(),
            );
            if (variant) {
              unitPrice = Number(variant.price);
              variantId = variant.id;
            }
          }

          const totalPrice = unitPrice * item.quantity;
          subtotal += totalPrice;

          orderItemsData.push({
            productId: product.id,
            variantId,
            productName: product.name,
            quantity: item.quantity,
            unitPrice,
            totalPrice,
            notes: item.notes ?? null,
          });
        }

        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { config: true },
        });
        const tenantConfig = (tenant?.config as Record<string, unknown>) ?? {};
        const deliveryFee = type === "DELIVERY" ? Number(tenantConfig.deliveryFee) || 0 : 0;
        const total = subtotal + deliveryFee;

        const order = await prisma.order.create({
          data: {
            orderNumber,
            type,
            status: "PENDING",
            subtotal,
            deliveryFee,
            total,
            source: "WHATSAPP",
            address: deliveryAddress
              ? JSON.parse(JSON.stringify({ address: deliveryAddress }))
              : undefined,
            customerNotes: customerNotes ?? null,
            customerId: customer.id,
            tenantId,
            items: { create: orderItemsData },
          },
          include: { items: true },
        });

        return JSON.stringify({
          orderNumber: order.orderNumber,
          items: order.items.map((i) => ({
            product: i.productName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            totalPrice: Number(i.totalPrice),
          })),
          subtotal: Number(order.subtotal),
          deliveryFee: Number(order.deliveryFee),
          total: Number(order.total),
          type: order.type,
          status: order.status,
        });
      },
    }),

    new DynamicStructuredTool({
      name: "get_customer_orders",
      description: "Consulta os pedidos recentes de um cliente pelo telefone.",
      schema: z.object({
        customerPhone: z.string().describe("Telefone do cliente com DDD (ex: 11999998888)"),
      }),
      func: async ({ customerPhone }) => {
        const customer = await prisma.customer.findUnique({
          where: { tenantId_phone: { tenantId, phone: customerPhone } },
        });

        if (!customer) {
          return JSON.stringify({
            error: "Cliente não encontrado. Peça o telefone para cadastro.",
          });
        }

        const orders = await prisma.order.findMany({
          where: { customerId: customer.id, tenantId },
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        if (orders.length === 0) {
          return JSON.stringify({ message: "Nenhum pedido encontrado para este cliente." });
        }

        return JSON.stringify(
          orders.map((o) => ({
            orderNumber: o.orderNumber,
            status: o.status,
            type: o.type,
            total: Number(o.total),
            items: o.items.map((i) => ({
              product: i.productName,
              quantity: i.quantity,
              totalPrice: Number(i.totalPrice),
            })),
            createdAt: o.createdAt.toISOString(),
          })),
        );
      },
    }),
  ];
}
