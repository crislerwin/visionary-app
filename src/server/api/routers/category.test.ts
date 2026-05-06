import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { categoryRouter } from "@/server/routers/category";
import { CategoryType } from "@prisma/client";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

const mockPrisma = {
  category: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

describe("categoryRouter", () => {
  const mockTenantId = "tenant-1";
  const mockUserId = "user-1";

  const mockCtx = {
    session: {
      user: { id: mockUserId, name: "Test User", email: "test@test.com" },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    user: { id: mockUserId, name: "Test User", email: "test@test.com" },
    tenantId: mockTenantId,
    headers: new Headers(),
  };

  const caller = categoryRouter.createCaller(mockCtx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return categories with pagination", async () => {
      const mockCategories = [
        {
          id: "cat-1",
          name: "Salary",
          type: CategoryType.INCOME,
          color: "#10B981",
          icon: "dollar-sign",
          tenantId: mockTenantId,
          parentId: null,
          isDefault: true,
          parent: null,
          _count: { children: 0, transactions: 10 },
        },
        {
          id: "cat-2",
          name: "Food",
          type: CategoryType.EXPENSE,
          color: "#F59E0B",
          icon: "utensils",
          tenantId: mockTenantId,
          parentId: null,
          isDefault: false,
          parent: null,
          _count: { children: 2, transactions: 50 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await caller.list({});

      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].name).toBe("Salary");
      expect(result.categories[1].name).toBe("Food");
    });

    it("should filter by type", async () => {
      const incomeCategories = [
        {
          id: "cat-1",
          name: "Salary",
          type: CategoryType.INCOME,
          tenantId: mockTenantId,
          parent: null,
          _count: { children: 0, transactions: 5 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(incomeCategories);

      const result = await caller.list({ type: "INCOME" });

      expect(result.categories).toHaveLength(1);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "INCOME",
            tenantId: mockTenantId,
          }),
        })
      );
    });

    it("should filter by parentId", async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      await caller.list({ parentId: "parent-cat-id" });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: "parent-cat-id",
          }),
        })
      );
    });

    it("should handle cursor pagination", async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      await caller.list({ cursor: "cursor-id", limit: 10 });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: "cursor-id" },
          take: 11, // limit + 1 to check for next page
        })
      );
    });
  });

  describe("getById", () => {
    it("should return category with details", async () => {
      const mockCategory = {
        id: "cat-1",
        name: "Food",
        type: CategoryType.EXPENSE,
        color: "#F59E0B",
        icon: "utensils",
        tenantId: mockTenantId,
        parent: null,
        children: [],
        _count: { transactions: 25 },
      };

      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);

      const result = await caller.getById({ id: "cat-1" });

      expect(result.id).toBe("cat-1");
      expect(result.name).toBe("Food");
    });

    it("should throw NOT_FOUND for non-existent category", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(caller.getById({ id: "non-existent" })).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    const validInput = {
      name: "New Category",
      type: "EXPENSE" as const,
      color: "#6366F1",
      icon: "shopping-bag",
    };

    it("should create category successfully", async () => {
      const mockCreatedCategory = {
        id: "new-cat-id",
        ...validInput,
        tenantId: mockTenantId,
        parentId: null,
        isDefault: false,
        parent: null,
      };

      mockPrisma.category.create.mockResolvedValue(mockCreatedCategory);

      const result = await caller.create(validInput);

      expect(result.name).toBe("New Category");
      expect(result.type).toBe("EXPENSE");
    });

    it("should create subcategory with parent", async () => {
      const inputWithParent = {
        ...validInput,
        parentId: "parent-cat-id",
      };

      mockPrisma.category.findFirst.mockResolvedValue({
        id: "parent-cat-id",
        type: "EXPENSE",
        tenantId: mockTenantId,
      });

      mockPrisma.category.create.mockResolvedValue({
        id: "subcat-id",
        ...inputWithParent,
        tenantId: mockTenantId,
        isDefault: false,
        parent: { id: "parent-cat-id", name: "Parent" },
      });

      const result = await caller.create(inputWithParent);

      expect(result.parent).toBeDefined();
      expect(result.parent?.id).toBe("parent-cat-id");
    });

    it("should throw NOT_FOUND for invalid parent", async () => {
      const inputWithInvalidParent = {
        ...validInput,
        parentId: "invalid-parent",
      };

      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(caller.create(inputWithInvalidParent)).rejects.toThrow(TRPCError);
    });

    it("should throw BAD_REQUEST for mismatched parent type", async () => {
      const inputWithMismatchedType = {
        ...validInput,
        parentId: "parent-id",
      };

      mockPrisma.category.findFirst.mockResolvedValue({
        id: "parent-id",
        type: "INCOME", // Different from EXPENSE in input
        tenantId: mockTenantId,
      });

      await expect(caller.create(inputWithMismatchedType)).rejects.toThrow(TRPCError);
    });
  });

  describe("update", () => {
    const existingCategory = {
      id: "cat-1",
      name: "Old Name",
      type: CategoryType.EXPENSE,
      color: "#F59E0B",
      icon: "utensils",
      tenantId: mockTenantId,
      isDefault: false,
      children: [],
    };

    it("should update category name", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(existingCategory);
      mockPrisma.category.update.mockResolvedValue({
        ...existingCategory,
        name: "New Name",
      });

      const result = await caller.update({ id: "cat-1", name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("should throw FORBIDDEN for default categories", async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        ...existingCategory,
        isDefault: true,
      });

      await expect(
        caller.update({ id: "cat-1", name: "New Name" })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.update({ id: "cat-1", name: "New Name" })
      ).rejects.toThrow("Cannot modify default categories");
    });

    it("should throw BAD_REQUEST for circular parent reference", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(existingCategory);

      await expect(
        caller.update({ id: "cat-1", parentId: "cat-1" })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.update({ id: "cat-1", parentId: "cat-1" })
      ).rejects.toThrow("cannot be its own parent");
    });

    it("should throw NOT_FOUND for non-existent category", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        caller.update({ id: "non-existent", name: "New Name" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    const existingCategory = {
      id: "cat-1",
      name: "Food",
      type: CategoryType.EXPENSE,
      tenantId: mockTenantId,
      isDefault: false,
      _count: { children: 0, transactions: 0 },
    };

    it("should delete category with no dependencies", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(existingCategory);
      mockPrisma.category.delete.mockResolvedValue(existingCategory);

      const result = await caller.delete({ id: "cat-1" });

      expect(result.success).toBe(true);
    });

    it("should throw FORBIDDEN for default categories", async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        ...existingCategory,
        isDefault: true,
      });

      await expect(caller.delete({ id: "cat-1" })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: "cat-1" })).rejects.toThrow("Cannot delete default");
    });

    it("should throw CONFLICT for categories with children", async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        ...existingCategory,
        _count: { children: 2, transactions: 0 },
      });

      await expect(caller.delete({ id: "cat-1" })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: "cat-1" })).rejects.toThrow("subcategories");
    });

    it("should throw CONFLICT for categories with transactions", async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        ...existingCategory,
        _count: { children: 0, transactions: 5 },
      });

      await expect(caller.delete({ id: "cat-1" })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: "cat-1" })).rejects.toThrow("transactions");
    });

    it("should throw NOT_FOUND for non-existent category", async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(caller.delete({ id: "non-existent" })).rejects.toThrow(TRPCError);
    });
  });
});
