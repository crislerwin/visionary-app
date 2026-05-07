import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

interface AgentOrderListRequest {
  tenantId: string;
  customerPhone: string;
  filter?: "ativo" | "hoje" | "ultimos" | "todos";
  limit?: number;
}

interface OrderItemResponse {
  productName: string;
  quantity: number;
}

interface OrderResponse {
  id: string;
  orderNumber: number;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItemResponse[];
}

interface AgentOrderListResponse {
  success: boolean;
  orders?: OrderResponse[];
  message: string;
  error?: string;
}

function verifyWebhookSignature(payload: string, secret: string, signature: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest): Promise<NextResponse<AgentOrderListResponse>> {
  try {
    const signature = request.headers.get("x-webhook-signature");
    const rawBody = await request.text();
    const body: AgentOrderListRequest = JSON.parse(rawBody);

    const { tenantId, customerPhone, filter = "ativo", limit = 5 } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { agentConfig: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant não encontrado" },
        { status: 404 },
      );
    }

    if (tenant.agentConfig?.webhookSecret && signature) {
      if (!verifyWebhookSignature(rawBody, tenant.agentConfig.webhookSecret, signature)) {
        return NextResponse.json(
          { success: false, message: "Assinatura do webhook inválida" },
          { status: 401 },
        );
      }
    }

    const customer = await prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: customerPhone } },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Cliente não encontrado. Faça um pedido primeiro!" },
        { status: 404 },
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let whereClause: Record<string, unknown> = {
      tenantId,
      customerId: customer.id,
    };

    if (filter === "ativo") {
      whereClause = {
        ...whereClause,
        status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] },
      };
    } else if (filter === "hoje") {
      whereClause = {
        ...whereClause,
        createdAt: { gte: today },
      };
    } else if (filter === "ultimos") {
      // Últimos 7 dias
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      whereClause = {
        ...whereClause,
        createdAt: { gte: lastWeek },
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
          },
        },
      },
    });

    await prisma.agentInteractionLog.create({
      data: {
        tenantId,
        agentConfigId: tenant.agentConfig!.id,
        customerPhone: customer.phone,
        type: "ORDER_LIST",
        status: "SUCCESS",
        input: body as unknown as object,
        output: { count: orders.length },
      },
    });

    if (orders.length === 0) {
      const filterNames: Record<string, string> = {
        ativo: "em andamento",
        hoje: "de hoje",
        ultimos: "dos últimos 7 dias",
        todos: "cadastrados",
      };

      return NextResponse.json({
        success: true,
        orders: [],
        message: `Nenhum pedido ${filterNames[filter] || ""} encontrado.`,
      });
    }

    const ordersResponse: OrderResponse[] = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total.toNumber(),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
      })),
    }));

    const statusNames: Record<string, string> = {
      PENDING: "⏳ Pendente",
      CONFIRMED: "✅ Confirmado",
      PREPARING: "👨‍🍳 Em preparo",
      READY: "🍽️ Pronto",
      OUT_FOR_DELIVERY: "🚚 Saiu para entrega",
      DELIVERED: "✅ Entregue",
      CANCELLED: "❌ Cancelado",
    };

    const summary = orders
      .map(
        (o) =>
          `Pedido #${o.orderNumber} - ${statusNames[o.status] || o.status} - R$ ${o.total.toFixed(2).replace(".", ",")}`,
      )
      .join("\n");

    return NextResponse.json({
      success: true,
      orders: ordersResponse,
      message: `Encontrei ${orders.length} pedido(s):\n${summary}`,
    });
  } catch (error) {
    console.error("Webhook order list error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno do servidor",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
