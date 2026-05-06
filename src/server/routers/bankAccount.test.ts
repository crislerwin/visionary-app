import { beforeEach, describe, expect, it, vi } from "vitest";
import { BankAccountType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Mock Prisma (hoisted — must run before imports) ─────────────

const { mockPrisma } = vi.hoisted(() => {
  const mock = {
    bankAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(
      (callback: (tx: typeof mock) => unknown) => callback(mock),
    ),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@opentelemetry/api", () => {
  const noop = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
  };
  return {
    trace: { getTracer: vi.fn(() => ({ startSpan: vi.fn(() => noop) })) },
    SpanStatusCode: { OK: 0, ERROR: 1 },
  };
});

// Import after all mocks
import { bankAccountRouter } from "@/server/routers/bankAccount";

// ─── Helpers ──────────────────────────────────────────────────────

const mockTenantId = "tenant-1";
const mockUserId = "user-1";

function createCaller(overrides?: {
  tenantId?: string;
  user?: Record<string, unknown>;
}) {
  const ctx = {
    session: {
      user: overrides?.user ?? {
        id: mockUserId,
        name: "Test User",
        email: "test@test.com",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    user: overrides?.user ?? {
      id: mockUserId,
      name: "Test User",
      email: "test@test.com",
    },
    tenantId: overrides?.tenantId ?? mockTenantId,
    headers: new Headers(),
  };
  return bankAccountRouter.createCaller(
    ctx as Parameters<typeof bankAccountRouter.createCaller>[0],
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────

describe("bankAccountRouter", () => {
  // ── list ──────────────────────────────────────────────────────

  describe("list", () => {
    it("returns all bank accounts for the tenant, ordered by createdAt desc", async () => {
      const mockAccounts = [
        {
          id: "acct-1",
          name: "Checking",
          type: BankAccountType.CHECKING,
          currency: "BRL",
          initialBalance: 500,
          currentBalance: 750,
          tenantId: mockTenantId,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-02-01"),
          _count: { transactions: 3 },
        },
      ];

      mockPrisma.bankAccount.findMany.mockResolvedValue(mockAccounts);

      const caller = createCaller();
      const result = await caller.list();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Checking");
      expect(mockPrisma.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("returns empty array when tenant has no accounts", async () => {
      mockPrisma.bankAccount.findMany.mockResolvedValue([]);

      const caller = createCaller();
      const result = await caller.list();

      expect(result).toEqual([]);
    });

    it("rejects when no tenant selected", async () => {
      const caller = createCaller({ tenantId: "" });
      await expect(caller.list()).rejects.toThrow(TRPCError);
      await expect(caller.list()).rejects.toThrow("No tenant selected");
    });
  });

  // ── byId ──────────────────────────────────────────────────────

  describe("byId", () => {
    it("returns the bank account when found", async () => {
      const mockAccount = {
        id: "acct-1",
        name: "Savings",
        type: BankAccountType.SAVINGS,
        currency: "BRL",
        initialBalance: 1000,
        currentBalance: 1200,
        tenantId: mockTenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { transactions: 0 },
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(mockAccount);

      const caller = createCaller();
      const result = await caller.byId({ id: "acct-1" });

      expect(result.id).toBe("acct-1");
      expect(result.name).toBe("Savings");
      expect(mockPrisma.bankAccount.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "acct-1", tenantId: mockTenantId },
        }),
      );
    });

    it("throws NOT_FOUND when account does not exist", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      const caller = createCaller();
      const promise = caller.byId({ id: "ghost" });

      await expect(promise).rejects.toThrow(TRPCError);
      await expect(promise).rejects.toHaveProperty("code", "NOT_FOUND");
    });

    it("throws NOT_FOUND when account belongs to different tenant", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      const caller = createCaller();
      await expect(caller.byId({ id: "other-tenant-acct" })).rejects.toThrow(
        TRPCError,
      );
    });
  });

  // ── create ────────────────────────────────────────────────────

  describe("create", () => {
    const validInput = {
      name: "New Checking",
      type: BankAccountType.CHECKING,
      currency: "BRL",
      initialBalance: 500,
    };

    it("creates bank account with all fields", async () => {
      const mockCreated = {
        id: "acct-new",
        name: validInput.name,
        type: validInput.type,
        currency: validInput.currency,
        initialBalance: validInput.initialBalance,
        currentBalance: 500,
        tenantId: mockTenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.create.mockResolvedValue(mockCreated);

      const caller = createCaller();
      const result = await caller.create(validInput);

      expect(result.name).toBe("New Checking");
      expect(result.currentBalance).toBe(500);
      expect(mockPrisma.bankAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Checking",
            type: BankAccountType.CHECKING,
            currency: "BRL",
            initialBalance: 500,
            currentBalance: 500,
            tenantId: mockTenantId,
          }),
        }),
      );
    });

    it("uses default currency (BRL) and initialBalance (0) when omitted", async () => {
      mockPrisma.bankAccount.create.mockResolvedValue({
        id: "acct-min",
        name: "Minimal",
        type: BankAccountType.SAVINGS,
        currency: "BRL",
        initialBalance: 0,
        currentBalance: 0,
        tenantId: mockTenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = createCaller();
      const result = await caller.create({
        name: "Minimal",
        type: BankAccountType.SAVINGS,
      });

      expect(result.currency).toBe("BRL");
      expect(result.currentBalance).toBe(0);
    });

    it("creates credit card account with correct type", async () => {
      const input = {
        name: "Visa",
        type: BankAccountType.CREDIT,
        currency: "USD",
        initialBalance: 0,
      };

      mockPrisma.bankAccount.create.mockResolvedValue({
        id: "acct-cc",
        name: input.name,
        type: input.type,
        currency: input.currency,
        initialBalance: input.initialBalance,
        currentBalance: 0,
        tenantId: mockTenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = createCaller();
      const result = await caller.create(input);

      expect(result.type).toBe(BankAccountType.CREDIT);
      expect(mockPrisma.bankAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: BankAccountType.CREDIT }),
        }),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────

  describe("update", () => {
    const existing = {
      id: "acct-1",
      name: "Old Name",
      type: BankAccountType.CHECKING,
      currency: "BRL",
      tenantId: mockTenantId,
    };

    it("updates account name", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(existing);
      mockPrisma.bankAccount.update.mockResolvedValue({
        ...existing,
        name: "New Name",
      });

      const caller = createCaller();
      const result = await caller.update({ id: "acct-1", name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("updates account type", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(existing);
      mockPrisma.bankAccount.update.mockResolvedValue({
        ...existing,
        type: BankAccountType.SAVINGS,
      });

      const caller = createCaller();
      const result = await caller.update({
        id: "acct-1",
        type: BankAccountType.SAVINGS,
      });

      expect(result.type).toBe(BankAccountType.SAVINGS);
    });

    it("throws NOT_FOUND when account does not exist", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      const caller = createCaller();
      await expect(
        caller.update({ id: "ghost", name: "Nope" }),
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.update({ id: "ghost", name: "Nope" }),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
    });

    it("throws NOT_FOUND when account belongs to another tenant", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      const caller = createCaller();
      await expect(
        caller.update({ id: "other-tenant", name: "X" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  // ── delete ────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes account with no transactions", async () => {
      const emptyAccount = {
        id: "acct-1",
        name: "Empty",
        tenantId: mockTenantId,
        _count: { transactions: 0 },
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(emptyAccount);
      mockPrisma.bankAccount.delete.mockResolvedValue(emptyAccount);

      const caller = createCaller();
      const result = await caller.delete({ id: "acct-1" });

      expect(result).toEqual({ success: true });
    });

    it("throws CONFLICT when account has transactions", async () => {
      const activeAccount = {
        id: "acct-1",
        name: "Active",
        tenantId: mockTenantId,
        _count: { transactions: 12 },
      };

      mockPrisma.bankAccount.findFirst.mockResolvedValue(activeAccount);

      const caller = createCaller();
      const promise = caller.delete({ id: "acct-1" });

      await expect(promise).rejects.toThrow(TRPCError);
      await expect(promise).rejects.toHaveProperty("code", "CONFLICT");
      await expect(promise).rejects.toThrow(
        /Cannot delete bank account with transactions/,
      );
    });

    it("throws NOT_FOUND when account does not exist", async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      const caller = createCaller();
      await expect(caller.delete({ id: "ghost" })).rejects.toThrow(TRPCError);
      await expect(caller.delete({ id: "ghost" })).rejects.toHaveProperty(
        "code",
        "NOT_FOUND",
      );
    });
  });

  // ── getTotalBalance ───────────────────────────────────────────

  describe("getTotalBalance", () => {
    it("returns sum of all account balances for the tenant", async () => {
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 15750 },
      });

      const caller = createCaller();
      const result = await caller.getTotalBalance();

      expect(result.totalBalance).toBe(15750);
      expect(mockPrisma.bankAccount.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
          _sum: { currentBalance: true },
        }),
      );
    });

    it("returns 0 when tenant has no accounts (null sum)", async () => {
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: null },
      });

      const caller = createCaller();
      const result = await caller.getTotalBalance();

      expect(result.totalBalance).toBe(0);
    });

    it("returns 0 when sum is 0 (fresh tenant with zero-balance accounts)", async () => {
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 0 },
      });

      const caller = createCaller();
      const result = await caller.getTotalBalance();

      expect(result.totalBalance).toBe(0);
    });
  });

  // ── tenant isolation ──────────────────────────────────────────

  describe("tenant isolation", () => {
    it("list only returns accounts for the current tenant", async () => {
      const tenantAAccounts = [
        { id: "a1", name: "Tenant A Acct", tenantId: "tenant-a" },
      ];

      mockPrisma.bankAccount.findMany.mockResolvedValue(tenantAAccounts);

      const caller = createCaller({ tenantId: "tenant-a" });
      const result = await caller.list();

      expect(result).toHaveLength(1);
      expect(mockPrisma.bankAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: "tenant-a" } }),
      );
    });

    it("getTotalBalance is scoped to current tenant", async () => {
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 5000 },
      });

      const caller = createCaller({ tenantId: "tenant-b" });
      const result = await caller.getTotalBalance();

      expect(result.totalBalance).toBe(5000);
      expect(mockPrisma.bankAccount.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: "tenant-b" } }),
      );
    });
  });

  // ── edge cases ────────────────────────────────────────────────

  describe("edge cases", () => {
    it("list returns accounts with 0 transactions count", async () => {
      mockPrisma.bankAccount.findMany.mockResolvedValue([
        {
          id: "empty-acct",
          name: "Zero TX",
          type: BankAccountType.CHECKING,
          currency: "BRL",
          initialBalance: 0,
          currentBalance: 0,
          tenantId: mockTenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { transactions: 0 },
        },
      ]);

      const caller = createCaller();
      const result = await caller.list();

      expect(result[0]._count!.transactions).toBe(0);
    });
  });
});
