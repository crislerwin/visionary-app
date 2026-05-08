import { prisma } from "@/lib/db";
import OpenAI from "openai";

const TONE_MAP: Record<string, string> = {
  FRIENDLY: "amigável e caloroso, use emojis quando apropriado",
  PROFESSIONAL: "profissional e objetivo",
  CASUAL: "descontraído e informal",
  FORMAL: "formal e educado",
};

function buildSystemPrompt(promptSystem: string, tone: string): string {
  const toneDesc = TONE_MAP[tone] || TONE_MAP.CASUAL;

  return `Você é um atendente virtual de restaurante.

${promptSystem}

Tom de voz: ${toneDesc}

INSTRUÇÕES:
- Use as ferramentas disponíveis para consultar o cardápio e criar pedidos.
- NUNCA invente produtos ou preços.
- Responda SEMPRE em português.
- Seja breve — mensagens de WhatsApp devem ser curtas.`;
}

function getTools() {
  return [
    {
      type: "function" as const,
      function: {
        name: "list_categories",
        description: "Lista o cardápio completo com produtos, preços e descrições",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "create_order",
        description: "Cria um pedido no sistema",
        parameters: {
          type: "object",
          properties: {
            customerPhone: { type: "string" },
            customerName: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productName: { type: "string" },
                  quantity: { type: "number" },
                  notes: { type: "string" },
                },
                required: ["productName", "quantity"],
              },
            },
            type: { type: "string", enum: ["DELIVERY", "PICKUP", "DINE_IN"] },
            deliveryAddress: { type: "string" },
          },
          required: ["customerPhone", "items", "type"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "get_customer_orders",
        description: "Consulta pedidos anteriores do cliente",
        parameters: {
          type: "object",
          properties: { customerPhone: { type: "string" } },
          required: ["customerPhone"],
        },
      },
    },
  ];
}

async function executeTool(
  tenantId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (toolName === "list_categories") {
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
        name: cat.name,
        products: cat.products.map((p) => ({
          name: p.name,
          price: Number(p.price),
          description: p.description,
          variants: p.variants.map((v) => ({ name: v.name, price: Number(v.price) })),
        })),
      })),
    );
  }

  if (toolName === "create_order") {
    const { customerPhone, customerName, items, type, deliveryAddress } = args as {
      customerPhone: string;
      customerName?: string;
      items: Array<{ productName: string; quantity: number; notes?: string }>;
      type: "DELIVERY" | "PICKUP" | "DINE_IN";
      deliveryAddress?: string;
    };

    const customer = await prisma.customer.upsert({
      where: { tenantId_phone: { tenantId, phone: customerPhone } },
      update: { name: customerName ?? undefined },
      create: { tenantId, phone: customerPhone, name: customerName ?? null },
    });

    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true, isDeleted: false },
    });

    const productMap = new Map(products.map((p) => [p.name.toLowerCase(), p]));

    function findProduct(name: string) {
      const normalized = name.toLowerCase().trim();
      if (productMap.has(normalized)) return productMap.get(normalized);
      const simple = normalized
        .replace(/^pizza\s+de\s+/, "")
        .replace(/^pizza\s+/, "")
        .trim();
      if (productMap.has(simple)) return productMap.get(simple);
      for (const [key, product] of productMap) {
        if (normalized.includes(key) || key.includes(normalized)) return product;
      }
      return undefined;
    }

    const lastOrder = await prisma.order.findFirst({
      where: { tenantId },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = findProduct(item.productName);
      if (!product) continue;

      const unitPrice = Number(product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        notes: item.notes ?? null,
        variantId: null,
      });
    }

    if (orderItemsData.length === 0) {
      return JSON.stringify({ error: "Produtos não encontrados" });
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
        customerId: customer.id,
        tenantId,
        items: { create: orderItemsData },
      },
    });

    return JSON.stringify({
      orderNumber: order.orderNumber,
      total: Number(order.total),
      items: orderItemsData.map((i) => ({ product: i.productName, quantity: i.quantity })),
    });
  }

  if (toolName === "get_customer_orders") {
    const { customerPhone } = args as { customerPhone: string };
    const customer = await prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: customerPhone } },
    });

    if (!customer) return JSON.stringify({ message: "Cliente não encontrado" });

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id, tenantId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (orders.length === 0) return JSON.stringify({ message: "Nenhum pedido encontrado" });

    return JSON.stringify(
      orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        items: o.items.map((i) => ({ product: i.productName, quantity: i.quantity })),
      })),
    );
  }

  return JSON.stringify({ error: `Tool ${toolName} not found` });
}

export interface MessageResult {
  response: string;
  durationMs: number;
  error?: string;
}

export async function processMessage(
  tenantId: string,
  messageContent: string,
  customerPhone: string,
  config: { promptSystem: string; tone: string; isActive: boolean },
): Promise<MessageResult> {
  const startTime = Date.now();

  try {
    const client = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL,
    });

    const systemPrompt = buildSystemPrompt(config.promptSystem, config.tone);
    const tools = getTools();

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Dados do cliente: Telefone ${customerPhone}` },
      { role: "user", content: messageContent },
    ];

    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;

      const response = await client.chat.completions.create({
        model: process.env.LLM_MODEL || "",
        messages,
        tools,
        tool_choice: "auto",
      });

      const choice = response.choices[0];

      if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
        const durationMs = Date.now() - startTime;
        return {
          response: choice.message.content || "",
          durationMs,
        };
      }

      messages.push({
        role: "assistant",
        content: choice.message.content || null,
        tool_calls: choice.message.tool_calls,
      });

      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(tenantId, toolCall.function.name, args);

        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      response: "Desculpe, estou demorando muito. Pode repetir?",
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      response: "Desculpe, tive um problema. Pode repetir?",
      durationMs,
      error: message,
    };
  }
}
