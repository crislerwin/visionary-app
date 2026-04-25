import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { prisma, resetDatabase, setupTestData } from "../database";

// Helper para criar categoria e produto
async function createCategoryAndProduct(tenantId: string) {
  const category = await prisma.category.create({
    data: {
      name: "Test Category",
      slug: "test-category",
      tenantId,
    },
  });

  const product = await prisma.product.create({
    data: {
      name: "Test Product",
      price: 29.9,
      tenantId,
      categoryId: category.id,
    },
  });

  return { category, product };
}

describe("Order Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testData: { tenant: { id: string }; user: { id: string; email: string } };

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    testData = await setupTestData();

    caller = appRouter.createCaller({
      session: {
        user: {
          id: testData.user.id,
          email: testData.user.email,
          name: "Test User",
          image: null,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      tenantId: testData.tenant.id,
      user: {
        id: testData.user.id,
        email: testData.user.email,
        name: "Test User",
        image: null,
      }
    });
  });

  describe("createOrder", () => {
    it("should create an order with items", async () => {
      const { product } = await createCategoryAndProduct(testData.tenant.id);

      const result = await caller.order.createOrder({
        tenantId: testData.tenant.id,
        type: "DELIVERY",
        customer: {
          name: "John Doe",
          phone: "11999999999",
          email: "john@example.com",
        },
        address: {
          street: "Main St",
          number: "123",
          neighborhood: "Downtown",
          city: "São Paulo",
          state: "SP",
          zipCode: "01001000",
        },
        items: [
          {
            productId: product.id,
            quantity: 2,
            unitPrice: 29.9,
            totalPrice: 59.8,
            productName: "Test Product",
          },
        ],
        subtotal: 59.8,
        deliveryFee: 5.0,
        total: 64.8,
        paymentMethod: "PIX",
        customerNotes: "Extra sauce",
      });

      expect(result).toHaveProperty("id");
      expect(result.orderNumber).toBe(1);
      expect(result.status).toBe("PENDING");
      expect(result.paymentStatus).toBe("PENDING");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.customer.name).toBe("John Doe");
    });

    it("should reuse existing customer with same phone", async () => {
      const existingCustomer = await prisma.customer.create({
        data: {
          name: "Jane Doe",
          phone: "11888888888",
          tenantId: testData.tenant.id,
        },
      });

      const { product } = await createCategoryAndProduct(testData.tenant.id);

      const result = await caller.order.createOrder({
        tenantId: testData.tenant.id,
        type: "PICKUP",
        customer: {
          name: "Jane Doe",
          phone: "11888888888",
        },
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 29.9,
            totalPrice: 29.9,
            productName: "Test Product",
          },
        ],
        subtotal: 29.9,
        total: 29.9,
        paymentMethod: "CASH",
      });

      expect(result.customerId).toBe(existingCustomer.id);
    });

    it("should generate sequential order numbers per tenant", async () => {
      const { product } = await createCategoryAndProduct(testData.tenant.id);

      const createOrder = () =>
        caller.order.createOrder({
          tenantId: testData.tenant.id,
          type: "DELIVERY",
          customer: {
            name: "Customer",
            phone: "11666666666",
          },
          items: [
            {
              productId: product.id,
              quantity: 1,
              unitPrice: 29.9,
              totalPrice: 29.9,
              productName: "Test Product",
            },
          ],
          subtotal: 29.9,
          total: 29.9,
          paymentMethod: "PIX",
        });

      const first = await createOrder();
      const second = await createOrder();

      expect(first.orderNumber).toBe(1);
      expect(second.orderNumber).toBe(2);
    });

    it("should throw error when items array is empty", async () => {
      await expect(
        caller.order.createOrder({
          tenantId: testData.tenant.id,
          type: "PICKUP",
          customer: {
            name: "Customer",
            phone: "11555555555",
          },
          items: [],
          subtotal: 0,
          total: 0,
          paymentMethod: "CASH",
        })
      ).rejects.toThrow();
    });
  });

  describe("getOrderById", () => {
    it("should return an existing order", async () => {
      const { product } = await createCategoryAndProduct(testData.tenant.id);

      const created = await caller.order.createOrder({
        tenantId: testData.tenant.id,
        type: "DELIVERY",
        customer: {
          name: "Mary",
          phone: "11444444444",
        },
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 29.9,
            totalPrice: 29.9,
            productName: "Test Product",
          },
        ],
        subtotal: 29.9,
        total: 29.9,
        paymentMethod: "DEBIT_CARD",
      });

      const result = await caller.order.getOrderById({
        id: created.id,
        tenantId: testData.tenant.id,
      });

      expect(result.id).toBe(created.id);
      expect(result.customer.name).toBe("Mary");
      expect(result.items).toHaveLength(1);
    });

    it("should throw NOT_FOUND for non-existent order", async () => {
      await expect(
        caller.order.getOrderById({
          id: "non-existent-id",
          tenantId: testData.tenant.id,
        })
      ).rejects.toThrow("Pedido não encontrado");
    });

    it("should throw NOT_FOUND when tenant does not match", async () => {
      const otherTenant = await prisma.tenant.create({
        data: {
          name: "Other Restaurant",
          slug: `other-restaurant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          owner: {
            create: {
              email: `other-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
              name: "Other Owner",
            },
          },
        },
      });

      const { product } = await createCategoryAndProduct(testData.tenant.id);

      const created = await caller.order.createOrder({
        tenantId: testData.tenant.id,
        type: "PICKUP",
        customer: {
          name: "Pedro",
          phone: "11333333333",
        },
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 29.9,
            totalPrice: 29.9,
            productName: "Test Product",
          },
        ],
        subtotal: 29.9,
        total: 29.9,
        paymentMethod: "CASH",
      });

      await expect(
        caller.order.getOrderById({
          id: created.id,
          tenantId: otherTenant.id,
        })
      ).rejects.toThrow("Pedido não encontrado");
    });
  });
});
