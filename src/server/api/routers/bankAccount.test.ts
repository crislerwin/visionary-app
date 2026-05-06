import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { bankAccountRouter } from "@/server/routers/bankAccount";
import { BankAccountType } from "@prisma/client";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

const mockPrisma = {
  bankAccount: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  $transaction: vi.fn((callback) =>
    callback({
      bankAccount: mockPrisma.bankAccount,
    })
  ),
};

describe("bankAccountRouter", () => {
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

  const caller = bankAccountRouter.createCaller(mockCtx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all bank accounts for tenant", async () => {
      const mockAccounts = [
        {
          id: "account-1",
          name: "Main Account",
          type: BankAccountType.CHECKING,
          currency: "BRL",
          initialBalance: 1000,
          currentBalance: 1500,
          tenantId: mockTenantId,
          _count: { transactions: 5 },
        },
        {
          id: "account-2",
          name: "Savings",
          type: BankAccountType.SAVINGS,
          currency: "BRL",
          initialBalance: 5000,
          currentBalance: 5500,
          tenantId: mockTenantId,
          _count: { transactions: 2 },
        },
      ];

      mockPrisma.bankAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await caller.list();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Main Account");
      expect(result[1].name).toBe("Savings");
      expect(mockPrisma.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should return empty array when no accounts exist", async () => {
      mockPrisma.bankAccount.findMany.mockResolvedValue([]);

      const result = await caller.list();

      expect(result).toHaveLength(0);
    });
  });

  describe("byId", () => {
    it("should return bank account by id", async () => {
      const mockAccount = {
        id: "account-1",
        name: "Main Account",
        type: BankAccountType.CHECKING,
        currency: "BRL",
        initialBalance: 1000,
        currentBalance: 1500,
        tenantId: mockTenantId,
        _count: { transactions: 5 },
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(mockAccount);

      const result = await caller.byId({ id: "account-1" });

      expect(result.id).toBe("account-1");
      expect(result.name).toBe("Main Account");
    });

    it("should throw NOT_FOUND for non-existent account", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      await expect(caller.byId({ id: "non-existent" })).rejects.toThrow(TRPCError);
      await expect(caller.byId({ id: "non-existent" })).rejects.toThrow("not found");
    });
  });

  describe("create", () => {
    const validInput = {
      name: "New Account",
      type: BankAccountType.CHECKING,
      currency: "BRL",
      initialBalance: 1000,
    };

    it("should create bank account with correct data", async () => {
      const mockCreatedAccount = {
        id: "new-account-id",
        ...validInput,
        currentBalance: 1000,
        tenantId: mockTenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.create.mockResolvedValue(mockCreatedAccount);

      const result = await caller.create(validInput);

      expect(result.name).toBe("New Account");
      expect(result.currentBalance).toBe(1000);
      expect(mockPrisma.bankAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: validInput.name,
            type: validInput.type,
            currency: validInput.currency,
            initialBalance: validInput.initialBalance,
            currentBalance: validInput.initialBalance,
            tenantId: mockTenantId,
          }),
        })
      );
    });

    it("should create account with default values", async () => {
      const minimalInput = {
        name: "Minimal Account",
        type: BankAccountType.SAVINGS,
      };

      mockPrisma.bankAccount.create.mockResolvedValue({
        id: "minimal-id",
        ...minimalInput,
        currency: "BRL",
        initialBalance: 0,
        currentBalance: 0,
        tenantId: mockTenantId,
      });

      const result = await caller.create(minimalInput as { name: string; type: BankAccountType; currency?: string; initialBalance?: number; });

      expect(result.currency).toBe("BRL");
      expect(result.currentBalance).toBe(0);
    });
  });

  describe("update", () => {
    const existingAccount = {
      id: "account-1",
      name: "Old Name",
      type: BankAccountType.CHECKING,
      currency: "BRL",
      tenantId: mockTenantId,
    };

    it("should update bank account name", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(existingAccount);
      mockPrisma.bankAccount.update.mockResolvedValue({
        ...existingAccount,
        name: "Updated Name",
      });

      const result = await caller.update({ id: "account-1", name: "Updated Name" });

      expect(result.name).toBe("Updated Name");
    });

    it("should throw NOT_FOUND for non-existent account", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      await expect(
        caller.update({ id: "non-existent", name: "New Name" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should delete account with no transactions", async () => {
      const accountWithNoTransactions = {
        id: "account-1",
        name: "Empty Account",
        tenantId: mockTenantId,
        _count: { transactions: 0 },
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(accountWithNoTransactions);
      mockPrisma.bankAccount.delete.mockResolvedValue(accountWithNoTransactions);

      const result = await caller.delete({ id: "account-1" });

      expect(result.success).toBe(true);
    });

    it("should throw CONFLICT when account has transactions", async () => {
      const accountWithTransactions = {
        id: "account-1",
        name: "Active Account",
        tenantId: mockTenantId,
        _count: { transactions: 5 },
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(accountWithTransactions);

      await expect(caller.delete({ id: "account-1" })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: "account-1" })).rejects.toThrow("Cannot delete");
    });

    it("should throw NOT_FOUND for non-existent account", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      await expect(caller.delete({ id: "non-existent" })).rejects.toThrow(TRPCError);
    });
  });

  describe("getTotalBalance", () => {
    it("should return total balance across all accounts", async () => {
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 10000 },
      });

      const result = await caller.getTotalBalance();

      expect(result.totalBalance).toBe(10000);
      expect(mockPrisma.bankAccount.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
        })
      );
    });

    it("should return 0 when no accounts exist", async () => {
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: null },
      });

      const result = await caller.getTotalBalance();

      expect(result.totalBalance).toBe(0);
    });
  });
});
