import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Input schemas
const openCashRegisterSchema = z.object({
  initialAmount: z.number().min(0, "Valor inicial não pode ser negativo"),
});

const closeCashRegisterSchema = z.object({
  finalAmount: z.number().min(0, "Valor final não pode ser negativo"),
  notes: z.string().optional(),
});

const addTransactionSchema = z.object({
  type: z.enum(["EXPENSE", "WITHDRAWAL"]),
  amount: z.number().positive("Valor deve ser positivo"),
  description: z.string().min(1, "Descrição é obrigatória"),
  category: z.string().optional(),
});

const getHistorySchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  page: z.number().min(1).default(1),
  sortBy: z.enum(["openedAt", "closedAt", "difference"]).optional().default("closedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  filters: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      operatorId: z.string().optional(),
      hasDifference: z.boolean().optional(),
    })
    .optional(),
});

export const cashRegisterRouter = router({
  // Queries
  getCurrent: tenantProcedure.query(async ({ ctx }) => {
    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        tenantId: ctx.tenantId,
        status: "OPEN",
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cashRegister) {
      return null;
    }

    // Calculate totals
    const transactions = cashRegister.transactions;
    const totalEntries = transactions
      .filter((t) => t.type === "SALE" || t.type === "INITIAL")
      .reduce((sum: number, t) => sum + Number(t.amount), 0);
    const totalExits = transactions
      .filter((t) => t.type === "EXPENSE" || t.type === "WITHDRAWAL")
      .reduce((sum: number, t) => sum + Number(t.amount), 0);

    return {
      ...cashRegister,
      currentBalance: totalEntries - totalExits,
      totalEntries,
      totalExits,
    };
  }),

  getHistory: tenantProcedure.input(getHistorySchema).query(async ({ ctx, input }) => {
    const { limit, page, sortBy, sortOrder, filters } = input;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CashRegisterWhereInput & {
      closedAt?: { gte?: Date; lte?: Date };
      OR?: Array<{ openedBy?: string } | { closedBy?: string }>;
      difference?: { not: number } | number;
    } = {
      tenantId: ctx.tenantId,
      status: "CLOSED",
    };

    if (filters?.startDate || filters?.endDate) {
      where.closedAt = {};
      if (filters.startDate) where.closedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.closedAt.lte = new Date(filters.endDate);
    }

    if (filters?.operatorId) {
      where.OR = [{ openedBy: filters.operatorId }, { closedBy: filters.operatorId }];
    }

    if (filters?.hasDifference !== undefined) {
      if (filters.hasDifference) {
        where.difference = { not: 0 };
      } else {
        where.difference = 0;
      }
    }

    // Get total count
    const total = await prisma.cashRegister.count({ where });

    // Get items with sorting
    const orderBy: { [key: string]: "asc" | "desc" } = {};
    orderBy[sortBy] = sortOrder;

    const cashRegisters = await prisma.cashRegister.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        transactions: true,
      },
    });

    // Calculate totals for each register
    const itemsWithTotals = cashRegisters.map((register) => {
      const transactions = register.transactions;
      const totalEntries = transactions
        .filter((t) => t.type === "SALE" || t.type === "INITIAL")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExits = transactions
        .filter((t) => t.type === "EXPENSE" || t.type === "WITHDRAWAL")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expectedAmount = totalEntries - totalExits;

      return {
        ...register,
        totalEntries,
        totalExits,
        expectedAmount,
      };
    });

    return {
      items: itemsWithTotals,
      total,
    };
  }),

  getById: tenantProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        id: input.id,
        tenantId: ctx.tenantId,
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cashRegister) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Caixa não encontrado",
      });
    }

    return cashRegister;
  }),

  // Mutations
  open: tenantProcedure.input(openCashRegisterSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Usuário não autenticado",
      });
    }

    // Check if there's already an open cash register
    const existingOpen = await prisma.cashRegister.findFirst({
      where: {
        tenantId: ctx.tenantId,
        status: "OPEN",
      },
    });

    if (existingOpen) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Já existe um caixa aberto. Feche o caixa atual primeiro.",
      });
    }

    const cashRegister = await prisma.cashRegister.create({
      data: {
        tenantId: ctx.tenantId,
        openedBy: userId,
        initialAmount: input.initialAmount,
        status: "OPEN",
        transactions: {
          create: {
            type: "INITIAL",
            amount: input.initialAmount,
            description: "Valor de abertura",
            createdBy: userId,
          },
        },
      },
      include: {
        transactions: true,
      },
    });

    return cashRegister;
  }),

  close: tenantProcedure.input(closeCashRegisterSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Usuário não autenticado",
      });
    }

    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        tenantId: ctx.tenantId,
        status: "OPEN",
      },
      include: {
        transactions: true,
      },
    });

    if (!cashRegister) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Não existe caixa aberto para fechar",
      });
    }

    // Calculate expected amount
    const transactions = cashRegister.transactions;
    const totalEntries = transactions
      .filter((t) => t.type === "SALE" || t.type === "INITIAL")
      .reduce((sum: number, t) => sum + Number(t.amount), 0);
    const totalExits = transactions
      .filter((t) => t.type === "EXPENSE" || t.type === "WITHDRAWAL")
      .reduce((sum: number, t) => sum + Number(t.amount), 0);
    const expectedAmount = totalEntries - totalExits;
    const difference = input.finalAmount - expectedAmount;

    const updatedCashRegister = await prisma.cashRegister.update({
      where: { id: cashRegister.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: userId,
        finalAmount: input.finalAmount,
        difference,
        notes: input.notes,
      },
    });

    return {
      ...updatedCashRegister,
      expectedAmount,
      difference,
      totalEntries,
      totalExits,
    };
  }),

  addTransaction: tenantProcedure.input(addTransactionSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Usuário não autenticado",
      });
    }

    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        tenantId: ctx.tenantId,
        status: "OPEN",
      },
      include: {
        transactions: true,
      },
    });

    if (!cashRegister) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Não existe caixa aberto. Abra o caixa primeiro.",
      });
    }

    // Check balance for withdrawals
    if (input.type === "WITHDRAWAL") {
      const transactions = cashRegister.transactions;
      const totalEntries = transactions
        .filter((t) => t.type === "SALE" || t.type === "INITIAL")
        .reduce((sum: number, t) => sum + Number(t.amount), 0);
      const totalExits = transactions
        .filter((t) => t.type === "EXPENSE" || t.type === "WITHDRAWAL")
        .reduce((sum: number, t) => sum + Number(t.amount), 0);
      const currentBalance = totalEntries - totalExits;

      if (input.amount > currentBalance) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Saldo insuficiente para sangria. Saldo atual: R$ ${currentBalance.toFixed(2)}`,
        });
      }
    }

    const transaction = await prisma.cashRegisterTransaction.create({
      data: {
        cashRegisterId: cashRegister.id,
        type: input.type,
        amount: input.amount,
        description: input.description,
        category: input.category,
        createdBy: userId,
      },
    });

    return transaction;
  }),
});
