import { appRouter } from "@/server/routers/_app";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Like Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testData: { tenant: { id: string }; user: { id: string; email: string } };
  let productId: string;

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    testData = await setupTestData();

    const category = await prisma.category.create({
      data: {
        name: "Test Category",
        slug: "test-category",
        tenantId: testData.tenant.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: "Test Product",
        price: 10,
        categoryId: category.id,
        tenantId: testData.tenant.id,
        isActive: true,
      },
    });
    productId = product.id;

    // Public caller (no auth needed for likes)
    caller = appRouter.createCaller({
      session: null,
      tenantId: testData.tenant.id,
      user: null,
    });
  });

  describe("add", () => {
    it("should increment like count for a product", async () => {
      const result = await caller.like.add({
        productId,
        tenantId: testData.tenant.id,
      });

      expect(result.likeCount).toBe(1);

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.likeCount).toBe(1);
    });

    it("should increment like count multiple times", async () => {
      await caller.like.add({ productId, tenantId: testData.tenant.id });
      await caller.like.add({ productId, tenantId: testData.tenant.id });
      const result = await caller.like.add({ productId, tenantId: testData.tenant.id });

      expect(result.likeCount).toBe(3);
    });

    it("should throw error for non-existent product", async () => {
      await expect(
        caller.like.add({
          productId: "invalid-id",
          tenantId: testData.tenant.id,
        }),
      ).rejects.toThrow("Product not found");
    });

    it("should throw error for deleted product", async () => {
      await prisma.product.update({
        where: { id: productId },
        data: { isDeleted: true },
      });

      await expect(
        caller.like.add({
          productId,
          tenantId: testData.tenant.id,
        }),
      ).rejects.toThrow("Product not found");
    });

    it("should throw error for inactive product", async () => {
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      });

      await expect(
        caller.like.add({
          productId,
          tenantId: testData.tenant.id,
        }),
      ).rejects.toThrow("Product not found");
    });
  });

  describe("remove", () => {
    it("should decrement like count for a product", async () => {
      await prisma.product.update({
        where: { id: productId },
        data: { likeCount: 5 },
      });

      const result = await caller.like.remove({
        productId,
        tenantId: testData.tenant.id,
      });

      expect(result.likeCount).toBe(4);

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.likeCount).toBe(4);
    });

    it("should not go below zero", async () => {
      await prisma.product.update({
        where: { id: productId },
        data: { likeCount: 0 },
      });

      const result = await caller.like.remove({
        productId,
        tenantId: testData.tenant.id,
      });

      expect(result.likeCount).toBe(0);

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      expect(product?.likeCount).toBe(0);
    });

    it("should throw error for non-existent product", async () => {
      await expect(
        caller.like.remove({
          productId: "invalid-id",
          tenantId: testData.tenant.id,
        }),
      ).rejects.toThrow("Product not found");
    });
  });
});
