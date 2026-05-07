import { appRouter } from "@/server/routers/_app";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Menu Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testData: {
    tenant: { id: string; name: string; slug: string };
    user: { id: string; email: string };
  };

  beforeEach(async () => {
    await resetDatabase();
    testData = await setupTestData();

    // Create public caller (no session required)
    caller = appRouter.createCaller({
      session: null,
      tenantId: null,
      user: null,
    });
  });

  describe("getTenantBySlug", () => {
    it("should return tenant by slug", async () => {
      const result = await caller.menu.getTenantBySlug({
        slug: testData.tenant.slug,
      });

      expect(result).toHaveProperty("id", testData.tenant.id);
      expect(result).toHaveProperty("name", testData.tenant.name);
      expect(result).toHaveProperty("slug", testData.tenant.slug);
    });

    it("should throw NOT_FOUND for non-existent slug", async () => {
      await expect(caller.menu.getTenantBySlug({ slug: "non-existent-slug" })).rejects.toThrow(
        "Tenant not found",
      );
    });

    it("should throw NOT_FOUND for inactive tenant", async () => {
      await prisma.tenant.update({
        where: { id: testData.tenant.id },
        data: { isActive: false },
      });

      await expect(caller.menu.getTenantBySlug({ slug: testData.tenant.slug })).rejects.toThrow(
        "Tenant not found",
      );
    });
  });

  describe("getCategoriesWithProducts", () => {
    beforeEach(async () => {
      // Create test categories
      const categoryA = await prisma.category.create({
        data: {
          name: "Burgers",
          slug: "burgers",
          tenantId: testData.tenant.id,
          sortOrder: 0,
        },
      });

      const categoryB = await prisma.category.create({
        data: {
          name: "Drinks",
          slug: "drinks",
          tenantId: testData.tenant.id,
          sortOrder: 1,
        },
      });

      const categoryC = await prisma.category.create({
        data: {
          name: "Empty Category",
          slug: "empty-category",
          tenantId: testData.tenant.id,
          sortOrder: 2,
        },
      });

      // Create products
      await prisma.product.create({
        data: {
          name: "Classic Burger",
          price: 25.0,
          tenantId: testData.tenant.id,
          categoryId: categoryA.id,
          variants: {
            create: [
              { name: "Single", price: 25.0 },
              { name: "Double", price: 35.0 },
            ],
          },
        },
      });

      await prisma.product.create({
        data: {
          name: "Soda",
          price: 8.0,
          tenantId: testData.tenant.id,
          categoryId: categoryB.id,
        },
      });

      // Product in category C (so category has products)
      await prisma.product.create({
        data: {
          name: "Hidden Product",
          price: 10.0,
          tenantId: testData.tenant.id,
          categoryId: categoryC.id,
          isActive: false,
        },
      });
    });

    it("should return categories with active products", async () => {
      const result = await caller.menu.getCategoriesWithProducts({
        tenantSlug: testData.tenant.slug,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Burgers");
      expect(result[1].name).toBe("Drinks");
    });

    it("should include products in categories", async () => {
      const result = await caller.menu.getCategoriesWithProducts({
        tenantSlug: testData.tenant.slug,
      });

      const burgers = result.find((c) => c.slug === "burgers");
      expect(burgers).toBeDefined();
      expect(burgers!.products).toHaveLength(1);
      expect(burgers!.products[0].name).toBe("Classic Burger");
    });

    it("should include product variants sorted by price", async () => {
      const result = await caller.menu.getCategoriesWithProducts({
        tenantSlug: testData.tenant.slug,
      });

      const burgers = result.find((c) => c.slug === "burgers");
      expect(burgers!.products[0].variants).toHaveLength(2);
      expect(burgers!.products[0].variants[0].name).toBe("Single");
      expect(burgers!.products[0].variants[1].name).toBe("Double");
    });

    it("should filter out categories without active products", async () => {
      const result = await caller.menu.getCategoriesWithProducts({
        tenantSlug: testData.tenant.slug,
      });

      const emptyCategory = result.find((c) => c.slug === "empty-category");
      expect(emptyCategory).toBeUndefined();
    });

    it("should throw NOT_FOUND for non-existent tenant", async () => {
      await expect(
        caller.menu.getCategoriesWithProducts({ tenantSlug: "non-existent" }),
      ).rejects.toThrow("Tenant not found");
    });

    it("should not include deleted categories", async () => {
      await prisma.category.updateMany({
        where: { slug: "burgers", tenantId: testData.tenant.id },
        data: { isDeleted: true, isActive: false },
      });

      const result = await caller.menu.getCategoriesWithProducts({
        tenantSlug: testData.tenant.slug,
      });

      expect(result.find((c) => c.slug === "burgers")).toBeUndefined();
    });

    it("should not include deleted products", async () => {
      await prisma.product.updateMany({
        where: { name: "Soda", tenantId: testData.tenant.id },
        data: { isDeleted: true, isActive: false },
      });

      const result = await caller.menu.getCategoriesWithProducts({
        tenantSlug: testData.tenant.slug,
      });

      expect(result.find((c) => c.slug === "drinks")).toBeUndefined();
    });
  });
});
