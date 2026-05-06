import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  description: z.string().min(1).max(500),
  date: z.coerce.date(),
  bankAccountId: z.string(),
  categoryId: z.string().optional(),
  status: z
    .enum([TransactionStatus.COMPLETED, TransactionStatus.PENDING, TransactionStatus.CANCELLED])
    .default(TransactionStatus.COMPLETED),
});

const updateTransactionSchema = z.object({
  id: z.string(),
  amount: z.number().positive().optional(),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]).optional(),
  description: z.string().min(1).max(500).optional(),
  date: z.coerce.date().optional(),
  bankAccountId: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  status: z
    .enum([TransactionStatus.COMPLETED, TransactionStatus.PENDING, TransactionStatus.CANCELLED])
    .optional(),
});

const listTransactionsSchema = z.object({
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]).optional(),
  bankAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z
    .enum([TransactionStatus.COMPLETED, TransactionStatus.PENDING, TransactionStatus.CANCELLED])
    .optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});

export const transactionRouter = router({
  list: tenantProcedure.input(listTransactionsSchema).query(async ({ ctx, input }) => {
    const where = {
      bankAccount: {
        tenantId: ctx.tenantId,
      },
      ...(input.type && { type: input.type }),
      ...(input.bankAccountId && { bankAccountId: input.bankAccountId }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.status && { status: input.status }),
      ...(input.startDate &&
        input.endDate && {
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          bankAccount: {
            select: {
              id: true,
              name: true,
              currency: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
        orderBy: { date: "desc" },
        skip: input.offset,
        take: input.limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }),

  byId: tenantProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: input.id,
        bankAccount: {
          tenantId: ctx.tenantId,
        },
      },
      include: {
        bankAccount: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Transaction not found",
      });
    }

    return transaction;
  }),

  create: tenantProcedure.input(createTransactionSchema).mutation(async ({ ctx, input }) => {
    // Verify bank account belongs to tenant
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        id: input.bankAccountId,
        tenantId: ctx.tenantId,
      },
    });

    if (!bankAccount) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Bank account not found",
      });
    }

    // Verify category belongs to tenant if provided
    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          tenantId: ctx.tenantId,
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          amount: input.amount,
          type: input.type,
          description: input.description,
          date: input.date,
          bankAccountId: input.bankAccountId,
          categoryId: input.categoryId,
          status: input.status,
        },
      });

      // Update bank account balance
      const amountDelta = input.type === TransactionType.INCOME ? input.amount : -input.amount;
      await tx.bankAccount.update({
        where: { id: input.bankAccountId },
        data: {
          currentBalance: {
            increment: amountDelta,
          },
        },
      });

      return newTransaction;
    });

    return transaction;
  }),

  update: tenantProcedure.input(updateTransactionSchema).mutation(async ({ ctx, input }) => {
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: input.id,
        bankAccount: {
          tenantId: ctx.tenantId,
        },
      },
      include: {
        bankAccount: true,
      },
    });

    if (!existingTransaction) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Transaction not found",
      });
    }

    // Verify new bank account belongs to tenant if changing
    if (input.bankAccountId && input.bankAccountId !== existingTransaction.bankAccountId) {
      const bankAccount = await prisma.bankAccount.findFirst({
        where: {
          id: input.bankAccountId,
          tenantId: ctx.tenantId,
        },
      });

      if (!bankAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank account not found",
        });
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Revert old transaction effect on balance
      const oldAmountDelta =
        existingTransaction.type === TransactionType.INCOME
          ? -Number(existingTransaction.amount)
          : Number(existingTransaction.amount);

      await tx.bankAccount.update({
        where: { id: existingTransaction.bankAccountId },
        data: {
          currentBalance: {
            increment: oldAmountDelta,
          },
        },
      });

      // Apply new transaction values
      const newType = input.type ?? existingTransaction.type;
      const newAmount = input.amount ?? Number(existingTransaction.amount);
      const newBankAccountId = input.bankAccountId ?? existingTransaction.bankAccountId;

      const newAmountDelta = newType === TransactionType.INCOME ? newAmount : -newAmount;
      await tx.bankAccount.update({
        where: { id: newBankAccountId },
        data: {
          currentBalance: {
            increment: newAmountDelta,
          },
        },
      });

      const updatedTransaction = await tx.transaction.update({
        where: { id: input.id },
        data: {
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.date !== undefined && { date: input.date }),
          ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
          ...(input.status !== undefined && { status: input.status }),
        },
      });

      return updatedTransaction;
    });

    return transaction;
  }),

  delete: tenantProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: input.id,
        bankAccount: {
          tenantId: ctx.tenantId,
        },
      },
      include: {
        bankAccount: true,
      },
    });

    if (!existingTransaction) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Transaction not found",
      });
    }

    await prisma.$transaction(async (tx) => {
      // Revert transaction effect on balance
      const amountDelta =
        existingTransaction.type === TransactionType.INCOME
          ? -Number(existingTransaction.amount)
          : Number(existingTransaction.amount);

      await tx.bankAccount.update({
        where: { id: existingTransaction.bankAccountId },
        data: {
          currentBalance: {
            increment: amountDelta,
          },
        },
      });

      await tx.transaction.delete({
        where: { id: input.id },
      });
    });

    return { success: true };
  }),

  getSummary: tenantProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dateFilter =
        input.startDate && input.endDate
          ? {
              date: {
                gte: input.startDate,
                lte: input.endDate,
              },
            }
          : {};

      const [incomeResult, expenseResult, byCategory] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            bankAccount: { tenantId: ctx.tenantId },
            type: TransactionType.INCOME,
            status: TransactionStatus.COMPLETED,
            ...dateFilter,
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            bankAccount: { tenantId: ctx.tenantId },
            type: TransactionType.EXPENSE,
            status: TransactionStatus.COMPLETED,
            ...dateFilter,
          },
          _sum: { amount: true },
        }),
        prisma.transaction.groupBy({
          by: ["categoryId"],
          where: {
            bankAccount: { tenantId: ctx.tenantId },
            status: TransactionStatus.COMPLETED,
            ...dateFilter,
          },
          _sum: { amount: true },
        }),
      ]);

      const totalIncome = Number(incomeResult._sum.amount ?? 0);
      const totalExpense = Number(expenseResult._sum.amount ?? 0);

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        byCategory,
      };
    }),
});
