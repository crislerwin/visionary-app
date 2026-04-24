import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { prisma, resetDatabase, setupTestData } from "../database";

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
      headers: new Headers(),
    });
  });

  describe("createOrder", () => {
    it("should create an order with items", async () => {
      const product = await prisma.product.create({
        data: {
          name: "Burger",
          price: 29.9,
          tenantId: testData.tenant.id,
          category: {
            create: {
              name: "Food",
              slug: "food",
              tenantId: testData.tenant.id,
            },
          },
        },
      });

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
            productName: "Burger",
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

      const product = await prisma.product.create({
        data: {
          name: "Fries",
          price: 9.9,
          tenantId: testData.tenant.id,
          category: {
            create: {
              name: "Sides",
              slug: "sides",
              tenantId: testData.tenant.id,
            },
          },
        },
      });

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
            unitPrice: 9.9,
            totalPrice: 9.9,
            productName: "Fries",
          },
        ],
        subtotal: 9.9,
        total: 9.9,
        paymentMethod: "CASH",
      });

      expect(result.customerId).toBe(existingCustomer.id);
    });

    it("should update existing customer info when provided", async () => {
      const existingCustomer = await prisma.customer.create({
        data: {
          name: "Old Name",
          phone: "11777777777",
          tenantId: testData.tenant.id,
        },
      });

      const product = await prisma.product.create({
        data: {
          name: "Soda",
          price: 5.0,
          tenantId: testData.tenant.id,
          category: {
            create: {
              name: "Drinks",
              slug: "drinks",
              tenantId: testData.tenant.id,
            },
          },
        },
      });

      const result = await caller.order.createOrder({
        tenantId: testData.tenant.id,
        type: "DINE_IN",
        customer: {
          name: "New Name",
          phone: "11777777777",
          email: "new@example.com",
        },
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 5.0,
            totalPrice: 5.0,
            productName: "Soda",
          },
        ],
        subtotal: 5.0,
        total: 5.0,
        paymentMethod: "CREDIT_CARD",
      });

      expect(result.customerId).toBe(existingCustomer.id);
      expect(result.customer.name).toBe("New Name");
      expect(result.customer.email).toBe("new@example.com");
    });

    it("should generate sequential order numbers per tenant", async () => {
      const product = await prisma.product.create({
        data: {
          name: "Pizza",
          price: 49.9,
          tenantId: testData.tenant.id,
          category: {
            create: {
              name: "Pizzas",
              slug: "pizzas",
              tenantId: testData.tenant.id,
            },
          },
        },
      });

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
              unitPrice: 49.9,
              totalPrice: 49.9,
              productName: "Pizza",
            },
          ],
          subtotal: 49.9,
          total: 49.9,
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
      const product = await prisma.product.create({
        data: {
          name: "Salad",
          price: 19.9,
          tenantId: testData.tenant.id,
          category: {
            create: {
              name: "Salads",
              slug: "salads",
              tenantId: testData.tenant.id,
            },
          },
        },
      });

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
            unitPrice: 19.9,
            totalPrice: 19.9,
            productName: "Salad",
          },
        ],
        subtotal: 19.9,
        total: 19.9,
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
          slug: "other-restaurant",
          owner: {
            create: {
              email: "other@example.com",
              name: "Other Owner",
            },
          },
        },
      });

      const product = await prisma.product.create({
        data: {
          name: "Taco",
          price: 14.9,
          tenantId: testData.tenant.id,
          category: {
            create: {
              name: "Mexican",
              slug: "mexican",
              tenantId: testData.tenant.id,
            },
          },
        },
      });

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
            unitPrice: 14.9,
            totalPrice: 14.9,
            productName: "Taco",
          },
        ],
        subtotal: 14.9,
        total: 14.9,
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

export {};
