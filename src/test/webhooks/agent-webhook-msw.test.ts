import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase, setupTestData } from "../database";
import { server } from "../mocks/server";

describe("Agent Webhooks with MSW", () => {
  let testData: { tenant: { id: string }; user: { id: string; email: string } };
  let webhookSecret: string;

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    testData = await setupTestData();
    webhookSecret = "test-webhook-secret-12345";

    // Create agent config
    await prisma.agentConfig.create({
      data: {
        tenantId: testData.tenant.id,
        promptSystem: "Você é um atendente simpático.",
        welcomeMessage: "Olá! Bem-vindo!",
        tone: "FRIENDLY" as const,
        autoConfirm: false,
        webhookSecret,
      },
    });

    // Setup MSW handlers for this test
    server.use(
      http.post("http://localhost:3000/api/webhooks/agent/orders/create", async ({ request }) => {
        const signature = request.headers.get("x-webhook-signature");
        const body = (await request.json()) as {
          tenantId: string;
          customerPhone: string;
          items: unknown[];
        };

        // Validate signature
        const crypto = await import("node:crypto");
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(JSON.stringify(body))
          .digest("hex");

        if (signature !== expectedSignature) {
          return HttpResponse.json(
            { success: false, message: "Assinatura do webhook inválida" },
            { status: 401 },
          );
        }

        if (!body.items || body.items.length === 0) {
          return HttpResponse.json(
            { success: false, message: "Nenhum item no pedido" },
            { status: 400 },
          );
        }

        // Create order in database
        const customer = await prisma.customer.upsert({
          where: {
            tenantId_phone: { tenantId: body.tenantId, phone: body.customerPhone },
          },
          create: {
            tenantId: body.tenantId,
            phone: body.customerPhone,
          },
          update: {},
        });

        const lastOrder = await prisma.order.findFirst({
          where: { tenantId: body.tenantId },
          orderBy: { orderNumber: "desc" },
        });
        const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

        const order = await prisma.order.create({
          data: {
            tenantId: body.tenantId,
            customerId: customer.id,
            orderNumber,
            type: "DELIVERY",
            status: "PENDING",
            subtotal: 67.7,
            total: 67.7,
            paymentStatus: "PENDING",
            source: "AGENT",
          },
        });

        return HttpResponse.json(
          {
            success: true,
            draftOrder: {
              id: order.id,
              items: body.items,
              subtotal: 67.7,
              total: 67.7,
            },
            message: `Rascunho criado! Pedido #${order.orderNumber} - Total: R$ 67,70. Confirme para prosseguir.`,
          },
          { status: 201 },
        );
      }),

      http.post("http://localhost:3000/api/webhooks/agent/orders/list", async ({ request }) => {
        const body = (await request.json()) as { tenantId: string; customerPhone: string };

        const customer = await prisma.customer.findUnique({
          where: {
            tenantId_phone: { tenantId: body.tenantId, phone: body.customerPhone },
          },
        });

        if (!customer) {
          return HttpResponse.json({
            success: true,
            orders: [],
            message: "Nenhum pedido encontrado.",
          });
        }

        const orders = await prisma.order.findMany({
          where: {
            tenantId: body.tenantId,
            customerId: customer.id,
            status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        return HttpResponse.json({
          success: true,
          orders: orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            total: o.total.toNumber(),
            createdAt: o.createdAt.toISOString(),
          })),
          message: `Encontrei ${orders.length} pedido(s).`,
        });
      }),
    );
  });

  describe("POST /api/webhooks/agent/orders/create", () => {
    it("should create order via webhook with valid signature", async () => {
      const payload = {
        tenantId: testData.tenant.id,
        customerPhone: "11999998888",
        customerName: "João Silva",
        items: [
          { productName: "X-Burger", quantity: 2 },
          { productName: "Batata Frita", quantity: 1 },
        ],
      };

      const crypto = await import("node:crypto");
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex");

      const response = await fetch("http://localhost:3000/api/webhooks/agent/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.draftOrder).toBeDefined();
    });

    it("should reject request with invalid signature", async () => {
      const payload = {
        tenantId: testData.tenant.id,
        customerPhone: "11999998888",
        items: [{ productName: "X-Burger", quantity: 1 }],
      };

      const response = await fetch("http://localhost:3000/api/webhooks/agent/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": "invalid-signature",
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.message).toContain("Assinatura");
    });

    it("should create customer if not exists", async () => {
      const payload = {
        tenantId: testData.tenant.id,
        customerPhone: "11977776666",
        customerName: "Maria Souza",
        items: [{ productName: "X-Burger", quantity: 1 }],
      };

      const crypto = await import("node:crypto");
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex");

      await fetch("http://localhost:3000/api/webhooks/agent/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
        body: JSON.stringify(payload),
      });

      const customer = await prisma.customer.findUnique({
        where: {
          tenantId_phone: {
            tenantId: testData.tenant.id,
            phone: "11977776666",
          },
        },
      });

      expect(customer).toBeDefined();
      expect(customer?.phone).toBe("11977776666");
    });
  });

  describe("POST /api/webhooks/agent/orders/list", () => {
    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testData.tenant.id,
          phone: "11933332222",
          name: "Pedro Cliente",
        },
      });

      await prisma.order.create({
        data: {
          tenantId: testData.tenant.id,
          customerId: customer.id,
          orderNumber: 1,
          type: "DELIVERY",
          status: "PREPARING",
          subtotal: 25.9,
          total: 25.9,
          source: "AGENT",
        },
      });
    });

    it("should list active orders", async () => {
      const payload = {
        tenantId: testData.tenant.id,
        customerPhone: "11933332222",
        filter: "ativo",
      };

      const response = await fetch("http://localhost:3000/api/webhooks/agent/orders/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
    });

    it("should return empty list for unknown customer", async () => {
      const payload = {
        tenantId: testData.tenant.id,
        customerPhone: "11900000000",
        filter: "ativo",
      };

      const response = await fetch("http://localhost:3000/api/webhooks/agent/orders/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(0);
    });
  });
});
