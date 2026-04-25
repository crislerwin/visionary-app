import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { prisma, resetDatabase, setupTestData } from "../database";

describe("Category Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testData: { tenant: { id: string }; user: { id: string; email: string } };

  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    // Setup fresh test data
    testData = await setupTestData();

    // Create authenticated caller with tenant context
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

  describe("create", () => {
    it("should create a category", async () => {
      const result = await caller.category.create({
        tenantId: testData.tenant.id,
        name: "Burgers",
        description: "Delicious burgers",
      });

      expect(result).toHaveProperty("id");
      expect(result.name).toBe("Burgers");
      expect(result.slug).toBe("burgers");
      expect(result.description).toBe("Delicious burgers");
    });

    it("should generate slug from name", async () => {
      const result = await caller.category.create({
        tenantId: testData.tenant.id,
        name: "Combo Lanches",
      });

      expect(result.slug).toBe("combo-lanches");
    });

    it("should throw error for duplicate name in same tenant", async () => {
      await caller.category.create({
        tenantId: testData.tenant.id,
        name: "Drinks",
      });

      await expect(
        caller.category.create({
          tenantId: testData.tenant.id,
          name: "Drinks", // Same name
        })
      ).rejects.toThrow("already exists");
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      // Create test categories
      await prisma.category.create({
        data: {
          name: "Category A",
          slug: "category-a",
          tenantId: testData.tenant.id,
          sortOrder: 0,
        },
      });
      await prisma.category.create({
        data: {
          name: "Category B",
          slug: "category-b",
          tenantId: testData.tenant.id,
          sortOrder: 1,
        },
      });
    });

    it("should list categories for tenant", async () => {
      const result = await caller.category.list({
        tenantId: testData.tenant.id,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Category A");
      expect(result[1].name).toBe("Category B");
    });

    it("should not include deleted categories", async () => {
      const category = await caller.category.create({
        tenantId: testData.tenant.id,
        name: "To Delete",
      });

      await caller.category.delete({
        id: category.id,
        tenantId: testData.tenant.id,
      });

      const result = await caller.category.list({
        tenantId: testData.tenant.id,
      });

      expect(result.every((c) => c.name !== "To Delete")).toBe(true);
    });
  });

  describe("update", () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await caller.category.create({
        tenantId: testData.tenant.id,
        name: "Original Name",
      });
      categoryId = category.id;
    });

    it("should update category name", async () => {
      const result = await caller.category.update({
        id: categoryId,
        tenantId: testData.tenant.id,
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
    });

    it("should update slug when name changes", async () => {
      const result = await caller.category.update({
        id: categoryId,
        tenantId: testData.tenant.id,
        name: "New Slug Name",
      });

      expect(result.slug).toBe("new-slug-name");
    });
  });

  describe("delete", () => {
    it("should soft delete category", async () => {
      const category = await caller.category.create({
        tenantId: testData.tenant.id,
        name: "To Delete",
      });

      await caller.category.delete({
        id: category.id,
        tenantId: testData.tenant.id,
      });

      const deleted = await prisma.category.findUnique({
        where: { id: category.id },
      });

      expect(deleted?.isDeleted).toBe(true);
      expect(deleted?.isActive).toBe(false);
    });

    it("should throw error if category has products", async () => {
      const category = await caller.category.create({
        tenantId: testData.tenant.id,
        name: "With Products",
      });

      // Create a product in this category
      await prisma.product.create({
        data: {
          name: "Test Product",
          price: 10.0,
          tenantId: testData.tenant.id,
          categoryId: category.id,
        },
      });

      await expect(
        caller.category.delete({
          id: category.id,
          tenantId: testData.tenant.id,
        })
      ).rejects.toThrow("Cannot delete category with products");
    });
  });
});
