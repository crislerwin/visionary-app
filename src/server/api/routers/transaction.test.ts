import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { transactionRouter } from "@/server/routers/transaction";
import { TransactionStatus, TransactionType } from "@prisma/client";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

const mockPrisma = {
  transaction: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  bankAccount: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  category: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn((callback) =>
    callback({
      transaction: mockPrisma.transaction,
      bankAccount: mockPrisma.bankAccount,
    })
  ),
};

describe("transactionRouter", () => {
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

  const caller = transactionRouter.createCaller(mockCtx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return transactions with pagination", async () => {
      const mockTransactions = [
        {
          id: "trans-1",
          amount: 100,
          type: TransactionType.INCOME,
          description: "Salary",
          date: new Date(),
          bankAccountId: "account-1",
          bankAccount: { id: "account-1", name: "Main", currency: "BRL" },
          category: null,
          status: TransactionStatus.COMPLETED,
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await caller.list({});

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bankAccount: { tenantId: mockTenantId },
          }),
          take: 50,
          skip: 0,
        })
      );
    });

    it("should filter by type", async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await caller.list({ type: TransactionType.EXPENSE });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: TransactionType.EXPENSE,
          }),
        })
      );
    });

    it("should filter by date range", async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      await caller.list({ startDate, endDate });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: startDate, lte: endDate },
          }),
        })
      );
    });
  });

  describe("byId", () => {
    it("should return transaction by id", async () => {
      const mockTransaction = {
        id: "trans-1",
        amount: 100,
        type: TransactionType.INCOME,
        description: "Salary",
        date: new Date(),
        bankAccountId: "account-1",
        bankAccount: { id: "account-1", name: "Main", currency: "BRL" },
        category: null,
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);

      const result = await caller.byId({ id: "trans-1" });

      expect(result.id).toBe("trans-1");
    });

    it("should throw NOT_FOUND for non-existent transaction", async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(caller.byId({ id: "non-existent" })).rejects.toThrow(TRPCError);
      await expect(caller.byId({ id: "non-existent" })).rejects.toThrow("not found");
    });
  });

  describe("create", () => {
    const validInput = {
      amount: 100,
      type: TransactionType.INCOME,
      description: "Test transaction",
      date: new Date(),
      bankAccountId: "account-1",
      categoryId: "category-1",
      status: TransactionStatus.COMPLETED,
    };

    it("should create transaction and update balance", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue({
        id: "account-1",
        tenantId: mockTenantId,
      });
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-1",
        tenantId: mockTenantId,
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: "trans-new",
        ...validInput,
      });
      mockPrisma.bankAccount.update.mockResolvedValue({ id: "account-1" });

      const result = await caller.create(validInput);

      expect(result).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw NOT_FOUND for invalid bank account", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      await expect(caller.create(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.create(validInput)).rejects.toThrow("Bank account not found");
    });

    it("should throw NOT_FOUND for invalid category", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue({
        id: "account-1",
        tenantId: mockTenantId,
      });
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(caller.create(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.create(validInput)).rejects.toThrow("Category not found");
    });
  });

  describe("update", () => {
    const existingTransaction = {
      id: "trans-1",
      amount: 100,
      type: TransactionType.INCOME,
      description: "Old description",
      date: new Date(),
      bankAccountId: "account-1",
      categoryId: "category-1",
      status: TransactionStatus.COMPLETED,
      bankAccount: { id: "account-1", tenantId: mockTenantId },
    };

    it("should update transaction and adjust balance", async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(existingTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...existingTransaction,
        amount: 200,
      });
      mockPrisma.bankAccount.update.mockResolvedValue({ id: "account-1" });

      const result = await caller.update({ id: "trans-1", amount: 200 });

      expect(result).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw NOT_FOUND for non-existent transaction", async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        caller.update({ id: "non-existent", amount: 200 })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should delete transaction and revert balance", async () => {
      const existingTransaction = {
        id: "trans-1",
        amount: 100,
        type: TransactionType.INCOME,
        bankAccountId: "account-1",
        bankAccount: { id: "account-1", tenantId: mockTenantId },
      };

      mockPrisma.transaction.findFirst.mockResolvedValue(existingTransaction);
      mockPrisma.bankAccount.update.mockResolvedValue({ id: "account-1" });
      mockPrisma.transaction.delete.mockResolvedValue(existingTransaction);

      const result = await caller.delete({ id: "trans-1" });

      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw NOT_FOUND for non-existent transaction", async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(caller.delete({ id: "non-existent" })).rejects.toThrow(TRPCError);
    });
  });

  describe("getSummary", () => {
    it("should return income, expense, and balance", async () => {
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 5000 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 2000 } }); // expense
      mockPrisma.transaction.groupBy.mockResolvedValue([]);

      const result = await caller.getSummary({});

      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpense).toBe(2000);
      expect(result.balance).toBe(3000);
    });

    it("should filter by date range", async () => {
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })
        .mockResolvedValueOnce({ _sum: { amount: 500 } });
      mockPrisma.transaction.groupBy.mockResolvedValue([]);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await caller.getSummary({ startDate, endDate });

      expect(mockPrisma.transaction.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: startDate, lte: endDate },
          }),
        })
      );
    });
  });
});
