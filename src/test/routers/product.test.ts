import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Product Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testData: { tenant: { id: string }; user: { id: string; email: string } };
  let categoryId: string;

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    // Setup fresh test data
    testData = await setupTestData();

    // Create a category for products
    const category = await prisma.category.create({
      data: {
        name: "Test Category",
        slug: "test-category",
        tenantId: testData.tenant.id,
      },
    });
    categoryId = category.id;

    // Create authenticated caller
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
      user: null,
    });
  });

  describe("create", () => {
    it("should create a product", async () => {
      const result = await caller.product.create({
        tenantId: testData.tenant.id,
        name: "Test Product",
        description: "A test product",
        price: 29.99,
        categoryId,
        stock: 10,
        trackStock: true,
      });

      expect(result).toHaveProperty("id");
      expect(result.name).toBe("Test Product");
      expect(result.price.toString()).toBe("29.99");
      expect(result.stock).toBe(10);
      expect(result.trackStock).toBe(true);
    });

    it("should create a product with variants", async () => {
      const result = await caller.product.create({
        tenantId: testData.tenant.id,
        name: "Product with Variants",
        price: 10,
        categoryId,
        variants: [
          { name: "Small", price: 8.99, stock: 5 },
          { name: "Large", price: 12.99, stock: 3 },
        ],
      });

      expect(result.variants).toHaveLength(2);
      expect(result.variants[0].name).toBe("Small");
      expect(result.variants[1].name).toBe("Large");
    });

    it("should throw error for invalid category", async () => {
      await expect(
        caller.product.create({
          tenantId: testData.tenant.id,
          name: "Test Product",
          price: 10,
          categoryId: "invalid-category-id",
        })
      ).rejects.toThrow("Category not found");
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      // Create test products
      await prisma.product.create({
        data: {
          name: "Product A",
          price: 10,
          categoryId,
          tenantId: testData.tenant.id,
          isActive: true,
        },
      });
      await prisma.product.create({
        data: {
          name: "Product B",
          price: 20,
          categoryId,
          tenantId: testData.tenant.id,
          isActive: true,
        },
      });
    });

    it("should list products for tenant", async () => {
      const result = await caller.product.list({
        tenantId: testData.tenant.id,
      });

      expect(result.products).toHaveLength(2);
      expect(result.products[0].name).toBe("Product A");
      expect(result.products[1].name).toBe("Product B");
    });

    it("should not include deleted products", async () => {
      const product = await caller.product.create({
        tenantId: testData.tenant.id,
        name: "To Delete",
        price: 10,
        categoryId,
      });

      await caller.product.delete({
        id: product.id,
        tenantId: testData.tenant.id,
      });

      const result = await caller.product.list({
        tenantId: testData.tenant.id,
      });

      expect(result.products.every((p) => p.name !== "To Delete")).toBe(true);
    });

    it("should filter by category", async () => {
      // Create another category
      const category2 = await prisma.category.create({
        data: {
          name: "Category 2",
          slug: "category-2",
          tenantId: testData.tenant.id,
        },
      });

      await prisma.product.create({
        data: {
          name: "Product in Category 2",
          price: 30,
          categoryId: category2.id,
          tenantId: testData.tenant.id,
          isActive: true,
        },
      });

      const result = await caller.product.list({
        tenantId: testData.tenant.id,
        categoryId: category2.id,
      });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe("Product in Category 2");
    });
  });

  describe("byId", () => {
    it("should get product by id", async () => {
      const created = await caller.product.create({
        tenantId: testData.tenant.id,
        name: "Test Product",
        price: 10,
        categoryId,
      });

      const result = await caller.product.byId({
        id: created.id,
        tenantId: testData.tenant.id,
      });

      expect(result.name).toBe("Test Product");
      expect(result.price.toString()).toBe("10");
    });

    it("should throw error for non-existent product", async () => {
      await expect(
        caller.product.byId({
          id: "invalid-id",
          tenantId: testData.tenant.id,
        })
      ).rejects.toThrow("Product not found");
    });
  });

  describe("update", () => {
    let productId: string;

    beforeEach(async () => {
      const product = await caller.product.create({
        tenantId: testData.tenant.id,
        name: "Original Name",
        price: 10,
        categoryId,
      });
      productId = product.id;
    });

    it("should update product name", async () => {
      const result = await caller.product.update({
        id: productId,
        tenantId: testData.tenant.id,
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
    });

    it("should update product price", async () => {
      const result = await caller.product.update({
        id: productId,
        tenantId: testData.tenant.id,
        price: 25.99,
      });

      expect(result.price.toString()).toBe("25.99");
    });

    it("should update stock settings", async () => {
      const result = await caller.product.update({
        id: productId,
        tenantId: testData.tenant.id,
        trackStock: true,
        stock: 50,
      });

      expect(result.trackStock).toBe(true);
      expect(result.stock).toBe(50);
    });
  });

  describe("delete", () => {
    it("should soft delete product", async () => {
      const product = await caller.product.create({
        tenantId: testData.tenant.id,
        name: "To Delete",
        price: 10,
        categoryId,
      });

      await caller.product.delete({
        id: product.id,
        tenantId: testData.tenant.id,
      });

      const deleted = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(deleted?.isDeleted).toBe(true);
      expect(deleted?.isActive).toBe(false);
    });
  });

  describe("variants", () => {
    let productId: string;

    beforeEach(async () => {
      const product = await caller.product.create({
        tenantId: testData.tenant.id,
        name: "Test Product",
        price: 10,
        categoryId,
      });
      productId = product.id;
    });

    it("should add variant to product", async () => {
      const result = await caller.product.addVariant({
        tenantId: testData.tenant.id,
        productId,
        variant: {
          name: "Medium",
          price: 15,
          stock: 10,
        },
      });

      expect(result).toHaveProperty("id");
      expect(result.name).toBe("Medium");
      expect(result.price.toString()).toBe("15");
    });

    it("should update variant", async () => {
      const variant = await caller.product.addVariant({
        tenantId: testData.tenant.id,
        productId,
        variant: {
          name: "Small",
          price: 8,
          stock: 5,
        },
      });

      const result = await caller.product.updateVariant({
        tenantId: testData.tenant.id,
        variantId: variant.id,
        name: "Extra Small",
        price: 6,
      });

      expect(result.name).toBe("Extra Small");
      expect(result.price.toString()).toBe("6");
    });

    it("should delete variant", async () => {
      const variant = await caller.product.addVariant({
        tenantId: testData.tenant.id,
        productId,
        variant: {
          name: "To Delete",
          price: 10,
          stock: 5,
        },
      });

      await caller.product.deleteVariant({
        tenantId: testData.tenant.id,
        variantId: variant.id,
      });

      const deleted = await prisma.productVariant.findUnique({
        where: { id: variant.id },
      });

      expect(deleted).toBeNull();
    });
  });
});

export {};
