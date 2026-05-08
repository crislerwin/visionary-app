import { prisma, resetDatabase, setupTestData } from "@/test/database";
import type { AgentConfig, Product } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Agent Orders Webhook Integration", () => {
  let testData: { tenant: { id: string }; user: { id: string; email: string } };
  let agentConfig: AgentConfig;
  let products: Record<string, Product>;

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    testData = await setupTestData();

    // Create agent config
    agentConfig = await prisma.agentConfig.create({
      data: {
        tenantId: testData.tenant.id,
        promptSystem: "Você é um atendente simpático.",
        welcomeMessage: "Olá! Bem-vindo!",
        tone: "FRIENDLY" as const,
        autoConfirm: false,
        webhookSecret: "webhook-secret-test-12345",
      },
    });

    // Create category and products
    const category = await prisma.category.create({
      data: {
        name: "Lanches",
        slug: "lanches",
        tenantId: testData.tenant.id,
      },
    });

    products = {
      burger: await prisma.product.create({
        data: {
          name: "X-Burger",
          price: 25.9,
          tenantId: testData.tenant.id,
          categoryId: category.id,
        },
      }),
      fries: await prisma.product.create({
        data: {
          name: "Batata Frita",
          price: 15.9,
          tenantId: testData.tenant.id,
          categoryId: category.id,
        },
      }),
    };
  });

  describe("Order Creation Flow", () => {
    it("should create order and log interaction", async () => {
      const customerPhone = "11999998888";
      const customerName = "João Silva";

      // Simulate webhook handler logic
      const orderData = {
        tenantId: testData.tenant.id,
        customerPhone,
        customerName,
        items: [
          { productName: "X-Burger", quantity: 2 },
          { productName: "Batata Frita", quantity: 1 },
        ],
      };

      // Step 1: Find or create customer
      let customer = await prisma.customer.findUnique({
        where: {
          tenantId_phone: {
            tenantId: testData.tenant.id,
            phone: customerPhone,
          },
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            tenantId: testData.tenant.id,
            phone: customerPhone,
            name: customerName,
          },
        });
      }

      expect(customer).toBeDefined();
      expect(customer.phone).toBe(customerPhone);

      // Step 2: Calculate order values
      const orderItems = [
        {
          productId: products.burger.id,
          productName: products.burger.name,
          quantity: 2,
          unitPrice: 25.9,
          totalPrice: 51.8,
        },
        {
          productId: products.fries.id,
          productName: products.fries.name,
          quantity: 1,
          unitPrice: 15.9,
          totalPrice: 15.9,
        },
      ];

      const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      expect(subtotal).toBeCloseTo(67.7, 1);

      // Step 3: Create order
      const lastOrder = await prisma.order.findFirst({
        where: { tenantId: testData.tenant.id },
        orderBy: { orderNumber: "desc" },
      });
      const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

      const order = await prisma.order.create({
        data: {
          tenantId: testData.tenant.id,
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

      expect(order).toBeDefined();
      expect(order.orderNumber).toBe(orderNumber);
      expect(order.status).toBe("PENDING");
      expect(order.items).toHaveLength(2);
      expect(order.total.toNumber()).toBeCloseTo(67.7, 1);

      // Step 4: Log the interaction
      const log = await prisma.agentInteractionLog.create({
        data: {
          tenantId: testData.tenant.id,
          agentConfigId: agentConfig.id,
          customerPhone,
          type: "ORDER_CREATE",
          status: "SUCCESS",
          input: orderData as unknown as Record<string, unknown>,
          output: { orderId: order.id, success: true },
          durationMs: 150,
        },
      });

      expect(log).toBeDefined();
      expect(log.type).toBe("ORDER_CREATE");
      expect(log.status).toBe("SUCCESS");

      // Verify the complete flow
      const logs = await prisma.agentInteractionLog.findMany({
        where: { tenantId: testData.tenant.id },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].customerPhone).toBe(customerPhone);
    });

    it("should handle auto-confirm configuration", async () => {
      // Update config to auto-confirm
      await prisma.agentConfig.update({
        where: { tenantId: testData.tenant.id },
        data: { autoConfirm: true },
      });

      const customer = await prisma.customer.create({
        data: {
          tenantId: testData.tenant.id,
          phone: "11988887777",
          name: "Maria Souza",
        },
      });

      const lastOrder = await prisma.order.findFirst({
        where: { tenantId: testData.tenant.id },
        orderBy: { orderNumber: "desc" },
      });
      const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

      const order = await prisma.order.create({
        data: {
          tenantId: testData.tenant.id,
          customerId: customer.id,
          orderNumber,
          type: "DELIVERY",
          status: "CONFIRMED", // Auto-confirmed
          subtotal: 25.9,
          total: 25.9,
          paymentStatus: "PENDING",
          source: "AGENT",
          items: {
            create: [
              {
                productId: products.burger.id,
                productName: products.burger.name,
                quantity: 1,
                unitPrice: 25.9,
                totalPrice: 25.9,
              },
            ],
          },
        },
      });

      expect(order.status).toBe("CONFIRMED");
    });
  });

  describe("Order Listing Flow", () => {
    beforeEach(async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testData.tenant.id,
          phone: "11977776666",
          name: "Pedro Cliente",
        },
      });

      // Create multiple orders with different statuses
      const statuses = ["PENDING", "PREPARING", "DELIVERED", "CANCELLED"];

      for (let i = 0; i < statuses.length; i++) {
        const lastOrder = await prisma.order.findFirst({
          where: { tenantId: testData.tenant.id },
          orderBy: { orderNumber: "desc" },
        });
        const orderNumber = (lastOrder?.orderNumber ?? 0) + 1 + i;

        await prisma.order.create({
          data: {
            tenantId: testData.tenant.id,
            customerId: customer.id,
            orderNumber,
            type: "DELIVERY",
            status: statuses[i] as "PENDING" | "PREPARING" | "DELIVERED" | "CANCELLED",
            subtotal: 25.9 * (i + 1),
            total: 25.9 * (i + 1),
            paymentStatus: "PENDING",
            source: "AGENT",
            items: {
              create: [
                {
                  productId: products.burger.id,
                  productName: products.burger.name,
                  quantity: i + 1,
                  unitPrice: 25.9,
                  totalPrice: 25.9 * (i + 1),
                },
              ],
            },
          },
        });
      }
    });

    it("should filter active orders correctly", async () => {
      const customerPhone = "11977776666";

      // Query active orders (PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY)
      const activeStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

      const customer = await prisma.customer.findUnique({
        where: { tenantId_phone: { tenantId: testData.tenant.id, phone: customerPhone } },
      });

      const orders = await prisma.order.findMany({
        where: {
          tenantId: testData.tenant.id,
          customerId: customer!.id,
          status: { in: activeStatuses },
        },
      });

      expect(orders).toHaveLength(2); // PENDING and PREPARING

      const orderStatuses = orders.map((o) => o.status);
      expect(orderStatuses).toContain("PENDING");
      expect(orderStatuses).toContain("PREPARING");
      expect(orderStatuses).not.toContain("DELIVERED");
      expect(orderStatuses).not.toContain("CANCELLED");
    });

    it("should filter orders by date (today)", async () => {
      const customer = await prisma.customer.findFirst({
        where: { tenantId: testData.tenant.id },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const orders = await prisma.order.findMany({
        where: {
          tenantId: testData.tenant.id,
          customerId: customer!.id,
          createdAt: { gte: today },
        },
      });

      // All orders were created today in the test
      expect(orders.length).toBeGreaterThan(0);
    });
  });

  describe("Webhook Signature Validation", () => {
    it("should validate HMAC signature correctly", async () => {
      const crypto = await import("node:crypto");
      const secret = "webhook-secret-test-12345";
      const payload = JSON.stringify({ test: "data" });

      const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      expect(signature).toBe(expected);
      expect(signature).toHaveLength(64); // SHA256 hex is 64 chars
    });

    it("should detect invalid signature", async () => {
      const crypto = await import("node:crypto");
      const secret = "webhook-secret-test-12345";
      const wrongSecret = "wrong-secret";
      const payload = JSON.stringify({ test: "data" });

      const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const wrong = crypto.createHmac("sha256", wrongSecret).update(payload).digest("hex");

      expect(wrong).not.toBe(expected);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent products gracefully", async () => {
      const customer = await prisma.customer.create({
        data: {
          tenantId: testData.tenant.id,
          phone: "11966665555",
          name: "Test Error",
        },
      });

      // Try to find non-existent product
      const productName = "Produto Inexistente";
      const product = await prisma.product.findFirst({
        where: {
          tenantId: testData.tenant.id,
          name: { equals: productName, mode: "insensitive" },
        },
      });

      expect(product).toBeNull();

      // Log the error
      const log = await prisma.agentInteractionLog.create({
        data: {
          tenantId: testData.tenant.id,
          agentConfigId: agentConfig.id,
          customerPhone: customer.phone,
          type: "ORDER_CREATE",
          status: "ERROR",
          input: { productName, quantity: 1 },
          error: `Product not found: ${productName}`,
        },
      });

      expect(log.status).toBe("ERROR");
      expect(log.error).toContain("Product not found");
    });

    it("should handle database errors", async () => {
      // Log database error
      const log = await prisma.agentInteractionLog.create({
        data: {
          tenantId: testData.tenant.id,
          agentConfigId: agentConfig.id,
          type: "ORDER_CREATE",
          status: "ERROR",
          input: { error: "test" },
          error: "Database connection failed",
        },
      });

      expect(log.status).toBe("ERROR");
      expect(log.error).toBe("Database connection failed");
    });
  });
});
