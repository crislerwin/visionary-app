import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

interface AgentOrderCreateRequest {
  tenantId: string;
  customerPhone: string;
  customerName?: string;
  message: string;
  items: {
    productName: string;
    quantity: number;
    notes?: string;
  }[];
}

interface AgentOrderCreateResponse {
  success: boolean;
  draftOrder?: {
    id: string;
    items: {
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    subtotal: number;
    total: number;
  };
  message: string;
  error?: string;
}

function verifyWebhookSignature(payload: string, secret: string, signature: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest): Promise<NextResponse<AgentOrderCreateResponse>> {
  try {
    const signature = request.headers.get("x-webhook-signature");
    const rawBody = await request.text();
    const body: AgentOrderCreateRequest = JSON.parse(rawBody);

    const { tenantId, customerPhone, customerName, items } = body;

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

    const agentConfig = tenant.agentConfig;
    if (!agentConfig || !agentConfig.isActive) {
      return NextResponse.json(
        { success: false, message: "Agente de IA não configurado ou inativo" },
        { status: 400 },
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nenhum item no pedido" },
        { status: 400 },
      );
    }

    let customer = await prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: customerPhone } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId,
          phone: customerPhone,
          name: customerName || null,
        },
      });
    }

    const productNames = items.map((i) => i.productName);
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        isDeleted: false,
        name: { in: productNames, mode: "insensitive" },
      },
      include: { variants: { where: { isActive: true } } },
    });

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find((p) => p.name.toLowerCase() === item.productName.toLowerCase());
      if (!product) continue;

      const unitPrice = product.price.toNumber();
      const totalPrice = unitPrice * item.quantity;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        notes: item.notes || null,
      });

      subtotal += totalPrice;
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nenhum produto válido encontrado no pedido" },
        { status: 400 },
      );
    }

    const lastOrder = await prisma.order.findFirst({
      where: { tenantId },
      orderBy: { orderNumber: "desc" },
    });
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    const order = await prisma.order.create({
      data: {
        tenantId,
        customerId: customer.id,
        orderNumber,
        type: "DELIVERY",
        status: agentConfig.autoConfirm ? "CONFIRMED" : "PENDING",
        subtotal,
        total: subtotal,
        paymentStatus: "PENDING",
        source: "AGENT",
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });

    await prisma.agentInteractionLog.create({
      data: {
        tenantId,
        agentConfigId: agentConfig.id,
        customerPhone: customer.phone,
        type: "ORDER_CREATE",
        status: "SUCCESS",
        input: body as unknown as object,
        output: { orderId: order.id, success: true },
      },
    });

    const response: AgentOrderCreateResponse = {
      success: true,
      draftOrder: {
        id: order.id,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
          totalPrice: item.totalPrice.toNumber(),
        })),
        subtotal: order.subtotal.toNumber(),
        total: order.total.toNumber(),
      },
      message: agentConfig.autoConfirm
        ? `Pedido #${order.orderNumber} criado e confirmado! Total: R$ ${order.total.toFixed(2).replace(".", ",")}`
        : `Rascunho criado! Pedido #${order.orderNumber} - Total: R$ ${order.total.toFixed(2).replace(".", ",")}. Confirme para prosseguir.`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Webhook order create error:", error);
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
