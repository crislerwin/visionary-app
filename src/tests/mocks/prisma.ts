import { vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Deep mock for PrismaClient
const createMockPrisma = () => {
  const mockTransaction = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };

  const mockBankAccount = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockCategory = {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  return {
    transaction: mockTransaction,
    bankAccount: mockBankAccount,
    category: mockCategory,
    $transaction: vi.fn((callback: (client: unknown) => unknown) =>
      callback({
        transaction: mockTransaction,
        bankAccount: mockBankAccount,
        category: mockCategory,
      })
    ),
    $disconnect: vi.fn(),
  } as unknown as PrismaClient;
};

export const mockPrisma = createMockPrisma();

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

export const resetMocks = () => {
  vi.clearAllMocks();
};
