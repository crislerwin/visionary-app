import { TransactionStatus, TransactionType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { parseISO } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock Prisma (hoisted — must run before imports) ─────────────

const { mockPrisma } = vi.hoisted(() => {
  const mock = {
    transaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    bankAccount: {
      aggregate: vi.fn(),
    },
    $transaction: vi.fn((callback: (tx: typeof mock) => unknown) => callback(mock)),
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
import { transactionRouter } from "@/server/routers/transaction";

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
  return transactionRouter.createCaller(
    ctx as Parameters<typeof transactionRouter.createCaller>[0],
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────

describe("transactionRouter", () => {
  // ── getMonthlyStats ────────────────────────────────────────────

  describe("getMonthlyStats", () => {
    it("returns monthly aggregated data for the date range", async () => {
      const startDate = parseISO("2025-01-01");
      const endDate = parseISO("2025-03-31");

      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 5000, type: TransactionType.INCOME, date: parseISO("2025-01-15") },
        { amount: 2000, type: TransactionType.EXPENSE, date: parseISO("2025-01-20") },
        { amount: 6000, type: TransactionType.INCOME, date: parseISO("2025-02-10") },
        { amount: 3000, type: TransactionType.EXPENSE, date: parseISO("2025-02-25") },
        { amount: 7000, type: TransactionType.INCOME, date: parseISO("2025-03-05") },
        { amount: 2500, type: TransactionType.EXPENSE, date: parseISO("2025-03-15") },
      ]);

      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 15000 },
      });

      const caller = createCaller();
      const result = await caller.getMonthlyStats({ startDate, endDate });

      expect(result.compareSeries).toHaveLength(3);
      expect(result.compareSeries[0].receitas).toBe(5000);
      expect(result.compareSeries[0].despesas).toBe(2000);
      expect(result.compareSeries[1].receitas).toBe(6000);
      expect(result.compareSeries[1].despesas).toBe(3000);
      expect(result.compareSeries[2].receitas).toBe(7000);
      expect(result.compareSeries[2].despesas).toBe(2500);
    });

    it("returns empty series when no transactions in range", async () => {
      const startDate = parseISO("2025-01-01");
      const endDate = parseISO("2025-01-31");

      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 1000 },
      });

      const caller = createCaller();
      const result = await caller.getMonthlyStats({ startDate, endDate });

      expect(result.compareSeries).toHaveLength(1);
      expect(result.compareSeries[0].receitas).toBe(0);
      expect(result.compareSeries[0].despesas).toBe(0);
      expect(result.balanceSeries).toHaveLength(1);
      expect(result.balanceSeries[0].saldo).toBe(1000);
    });

    it("filters by tenant and completed status", async () => {
      const startDate = parseISO("2025-06-01");
      const endDate = parseISO("2025-06-30");

      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 0 },
      });

      const caller = createCaller();
      await caller.getMonthlyStats({ startDate, endDate });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bankAccount: { tenantId: mockTenantId },
            status: TransactionStatus.COMPLETED,
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it("rejects when no tenant selected", async () => {
      const caller = createCaller({ tenantId: "" });
      await expect(
        caller.getMonthlyStats({
          startDate: parseISO("2025-01-01"),
          endDate: parseISO("2025-01-31"),
        }),
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.getMonthlyStats({
          startDate: parseISO("2025-01-01"),
          endDate: parseISO("2025-01-31"),
        }),
      ).rejects.toThrow("No tenant selected");
    });

    it("handles single month range correctly", async () => {
      const startDate = parseISO("2025-01-01");
      const endDate = parseISO("2025-01-31");

      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 3000, type: TransactionType.INCOME, date: parseISO("2025-01-10") },
        { amount: 1500, type: TransactionType.EXPENSE, date: parseISO("2025-01-15") },
      ]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 5000 },
      });

      const caller = createCaller();
      const result = await caller.getMonthlyStats({ startDate, endDate });

      expect(result.compareSeries).toHaveLength(1);
      expect(result.compareSeries[0].receitas).toBe(3000);
      expect(result.compareSeries[0].despesas).toBe(1500);
    });

    it("calculates balance series correctly working backwards from current balance", async () => {
      // Jan: +3000, Feb: +2000, Mar: +1000
      // Current balance: 10000
      // Expected: Mar=10000, Feb=9000, Jan=7000
      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 3000, type: TransactionType.INCOME, date: parseISO("2025-01-15") },
        { amount: 1000, type: TransactionType.EXPENSE, date: parseISO("2025-02-10") },
        { amount: 3000, type: TransactionType.INCOME, date: parseISO("2025-02-20") },
        { amount: 500, type: TransactionType.EXPENSE, date: parseISO("2025-03-05") },
        { amount: 1500, type: TransactionType.INCOME, date: parseISO("2025-03-15") },
      ]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 10000 },
      });

      const caller = createCaller();
      const result = await caller.getMonthlyStats({
        startDate: parseISO("2025-01-01"),
        endDate: parseISO("2025-03-31"),
      });

      expect(result.balanceSeries).toHaveLength(3);
      expect(result.balanceSeries[2].saldo).toBe(10000); // Mar = current
      expect(result.balanceSeries[1].saldo).toBe(9000); // Feb = 10000 - (1500 - 500)
      expect(result.balanceSeries[0].saldo).toBe(7000); // Jan = 9000 - (3000 - 1000)
    });

    it("filters by bankAccountIds when provided", async () => {
      const startDate = parseISO("2025-01-01");
      const endDate = parseISO("2025-01-31");

      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 3000, type: TransactionType.INCOME, date: parseISO("2025-01-10") },
      ]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 5000 },
      });

      const caller = createCaller();
      const result = await caller.getMonthlyStats({
        startDate,
        endDate,
        bankAccountIds: ["acc-1"],
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bankAccountId: { in: ["acc-1"] },
          }),
        }),
      );
      expect(mockPrisma.bankAccount.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ["acc-1"] },
          }),
        }),
      );
      expect(result.compareSeries).toHaveLength(1);
      expect(result.compareSeries[0].receitas).toBe(3000);
    });

    it("ignores empty bankAccountIds array (no filter)", async () => {
      const startDate = parseISO("2025-01-01");
      const endDate = parseISO("2025-01-31");

      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 3000, type: TransactionType.INCOME, date: parseISO("2025-01-10") },
        { amount: 2000, type: TransactionType.INCOME, date: parseISO("2025-01-15") },
      ]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 5000 },
      });

      const caller = createCaller();
      const result = await caller.getMonthlyStats({
        startDate,
        endDate,
        bankAccountIds: [],
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            bankAccountId: expect.anything(),
          }),
        }),
      );
      expect(result.compareSeries).toHaveLength(1);
      expect(result.compareSeries[0].receitas).toBe(5000);
    });
  });

  // ── list ──────────────────────────────────────────────────────

  describe("list", () => {
    it("returns transactions with date filter", async () => {
      const startDate = parseISO("2025-06-01");
      const endDate = parseISO("2025-06-30");

      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          id: "tx-1",
          amount: 100,
          type: TransactionType.EXPENSE,
          description: "Coffee",
          date: parseISO("2025-06-15"),
          status: TransactionStatus.COMPLETED,
          bankAccount: { id: "acct-1", name: "Checking", currency: "BRL" },
          category: { id: "cat-1", name: "Food", color: "#ff0000", icon: "utensils" },
        },
      ]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const caller = createCaller();
      const result = await caller.list({ startDate, endDate, limit: 10, offset: 0 });

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bankAccount: { tenantId: mockTenantId },
            date: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        }),
      );
    });

    it("returns all transactions when no date filter", async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      const caller = createCaller();
      const result = await caller.list({ limit: 10, offset: 0 });

      expect(result.transactions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("filters by transaction type", async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      const caller = createCaller();
      await caller.list({ type: TransactionType.INCOME, limit: 10, offset: 0 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: TransactionType.INCOME,
          }),
        }),
      );
    });

    it("rejects when no tenant selected", async () => {
      const caller = createCaller({ tenantId: "" });
      await expect(caller.list({ limit: 10, offset: 0 })).rejects.toThrow(TRPCError);
      await expect(caller.list({ limit: 10, offset: 0 })).rejects.toThrow("No tenant selected");
    });
  });

  // ── getSummary ────────────────────────────────────────────────

  describe("getSummary", () => {
    it("returns aggregated income and expense for date range", async () => {
      const startDate = parseISO("2025-01-01");
      const endDate = parseISO("2025-01-31");

      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 10000 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 4000 } }); // expense
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: "cat-1", _sum: { amount: 4000 } },
      ]);

      const caller = createCaller();
      const result = await caller.getSummary({ startDate, endDate });

      expect(result.totalIncome).toBe(10000);
      expect(result.totalExpense).toBe(4000);
      expect(result.balance).toBe(6000);
      expect(result.byCategory).toHaveLength(1);
    });

    it("returns 0 when no transactions in range", async () => {
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      mockPrisma.transaction.groupBy.mockResolvedValue([]);

      const caller = createCaller();
      const result = await caller.getSummary({
        startDate: parseISO("2025-01-01"),
        endDate: parseISO("2025-01-31"),
      });

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.balance).toBe(0);
    });
  });

  // ── tenant isolation ──────────────────────────────────────────

  describe("tenant isolation", () => {
    it("getMonthlyStats only uses tenant transactions", async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 0 },
      });

      const caller = createCaller({ tenantId: "tenant-b" });
      await caller.getMonthlyStats({
        startDate: parseISO("2025-01-01"),
        endDate: parseISO("2025-01-31"),
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bankAccount: { tenantId: "tenant-b" },
          }),
        }),
      );
    });

    it("list only returns tenant transactions", async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      const caller = createCaller({ tenantId: "tenant-c" });
      await caller.list({ limit: 10, offset: 0 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bankAccount: { tenantId: "tenant-c" },
          }),
        }),
      );
    });
  });

  // ── edge cases ────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles transactions exactly on start date boundary", async () => {
      const startDate = parseISO("2025-01-01T00:00:00.000Z");
      const endDate = parseISO("2025-01-31T23:59:59.999Z");

      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 100, type: TransactionType.INCOME, date: startDate },
      ]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 100 },
      });

      const caller = createCaller();
      const result = await caller.getMonthlyStats({ startDate, endDate });

      expect(result.compareSeries[0].receitas).toBe(100);
    });

    it("handles transactions exactly on end date boundary", async () => {
      const startDate = parseISO("2025-01-01");
      const endDate = parseISO("2025-01-31T23:59:59.999Z");

      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 200, type: TransactionType.EXPENSE, date: endDate },
      ]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: -200 },
      });

      const caller = createCaller();
      const result = await caller.getMonthlyStats({ startDate, endDate });

      expect(result.compareSeries[0].despesas).toBe(200);
    });

    it("ignores pending transactions in stats", async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.bankAccount.aggregate.mockResolvedValue({
        _sum: { currentBalance: 0 },
      });

      const caller = createCaller();
      await caller.getMonthlyStats({
        startDate: parseISO("2025-01-01"),
        endDate: parseISO("2025-01-31"),
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TransactionStatus.COMPLETED,
          }),
        }),
      );
    });
  });
});
