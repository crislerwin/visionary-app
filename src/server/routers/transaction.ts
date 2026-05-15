import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  eachMonthOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  description: z.string().min(1).max(500),
  date: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  bankAccountId: z.string(),
  categoryId: z.string().optional(),
  partnerId: z.string().optional(),
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
  dueDate: z.coerce.date().optional(),
  bankAccountId: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  status: z
    .enum([TransactionStatus.COMPLETED, TransactionStatus.PENDING, TransactionStatus.CANCELLED])
    .optional(),
});

const listTransactionsSchema = z.object({
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]).optional(),
  bankAccountId: z.string().optional(),
  bankAccountIds: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  partnerId: z.string().optional(),
  partnerIds: z.array(z.string()).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z
    .enum([TransactionStatus.COMPLETED, TransactionStatus.PENDING, TransactionStatus.CANCELLED])
    .optional(),
  limit: z.number().min(1).max(999999).default(999999),
  offset: z.number().default(0),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export const transactionRouter = router({
  list: tenantProcedure.input(listTransactionsSchema).query(async ({ ctx, input }) => {
    const where = {
      bankAccount: {
        tenantId: ctx.tenantId,
      },
      ...(input.type && { type: input.type }),
      ...(input.bankAccountId && { bankAccountId: input.bankAccountId }),
      ...(input.bankAccountIds?.length && { bankAccountId: { in: input.bankAccountIds } }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.categoryIds?.length && { categoryId: { in: input.categoryIds } }),
      ...(input.partnerId && { partnerId: input.partnerId }),
      ...(input.partnerIds?.length && { partnerId: { in: input.partnerIds } }),
      ...(input.status && { status: input.status }),
      ...(input.startDate &&
        input.endDate && {
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        }),
    };

    // Suporte para page/pageSize (frontend) ou limit/offset (legacy)
    const pageSize = input.pageSize ?? input.limit ?? 50;
    const skip = input.page ? (input.page - 1) * pageSize : (input.offset ?? 0);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          bankAccount: {
            select: {
              id: true,
              name: true,
              bankName: true,
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
        skip,
        take: pageSize,
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
          dueDate: input.dueDate,
          bankAccountId: input.bankAccountId,
          categoryId: input.categoryId,
          status: input.status,
        },
      });

      // Update bank account balance only for COMPLETED transactions
      if (input.status === TransactionStatus.COMPLETED) {
        const amountDelta = input.type === TransactionType.INCOME ? input.amount : -input.amount;
        await tx.bankAccount.update({
          where: { id: input.bankAccountId },
          data: {
            currentBalance: {
              increment: amountDelta,
            },
          },
        });
      }

      // US06: Auto-generate PartnerInvoice on INCOME transactions with partner
      if (input.partnerId && input.type === TransactionType.INCOME) {
        const partner = await tx.partner.findFirst({
          where: { id: input.partnerId, tenantId: ctx.tenantId },
        });

        if (partner) {
          const commissionValue = Number(partner.commissionValue);
          let splitAmount = 0;

          if (partner.commissionType === "PERCENTAGE") {
            splitAmount = Number(input.amount) * (commissionValue / 100);
          } else if (partner.commissionType === "FIXED") {
            splitAmount = Math.min(commissionValue, Number(input.amount));
          }

          if (splitAmount > 0) {
            const dueDate = new Date(input.date);
            dueDate.setDate(dueDate.getDate() + 30); // Vencimento em 30 dias

            await tx.partnerInvoice.create({
              data: {
                partnerId: input.partnerId,
                tenantId: ctx.tenantId,
                description: `Repasse referente a: ${input.description}`,
                amount: splitAmount,
                dueDate,
                reference: newTransaction.id,
                status: "PENDING",
                notes: `Comissão ${partner.commissionType}: ${commissionValue}${partner.commissionType === "PERCENTAGE" ? "%" : ""}`,
              },
            });
          }
        }
      }

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

      // Apply new transaction values — only adjust balance for COMPLETED
      const newType = input.type ?? existingTransaction.type;
      const newAmount = input.amount ?? Number(existingTransaction.amount);
      const newBankAccountId = input.bankAccountId ?? existingTransaction.bankAccountId;
      const newStatus = input.status ?? existingTransaction.status;

      if (newStatus === TransactionStatus.COMPLETED) {
        const newAmountDelta = newType === TransactionType.INCOME ? newAmount : -newAmount;
        await tx.bankAccount.update({
          where: { id: newBankAccountId },
          data: {
            currentBalance: {
              increment: newAmountDelta,
            },
          },
        });
      }

      const updatedTransaction = await tx.transaction.update({
        where: { id: input.id },
        data: {
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.date !== undefined && { date: input.date }),
          ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
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

  getMonthlyStats: tenantProcedure
    .input(
      z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        bankAccountIds: z.array(z.string()).optional().default([]),
        partnerIds: z.array(z.string()).optional().default([]),
        categoryIds: z.array(z.string()).optional().default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startDate = startOfDay(input.startDate);
      const endDate = endOfDay(input.endDate);

      const transactions = await prisma.transaction.findMany({
        where: {
          bankAccount: { tenantId: ctx.tenantId },
          status: TransactionStatus.COMPLETED,
          date: {
            gte: startDate,
            lte: endDate,
          },
          ...(input.bankAccountIds?.length && { bankAccountId: { in: input.bankAccountIds } }),
          ...(input.partnerIds?.length && { partnerId: { in: input.partnerIds } }),
          ...(input.categoryIds?.length && { categoryId: { in: input.categoryIds } }),
        },
        select: {
          amount: true,
          type: true,
          date: true,
        },
        orderBy: { date: "asc" },
      });

      // Initialize all months in the range with zero
      const monthsInRange = eachMonthOfInterval({
        start: startOfMonth(startDate),
        end: startOfMonth(endDate),
      });

      const monthlyData = new Map<string, { income: number; expense: number; label: string }>();

      for (const month of monthsInRange) {
        const key = format(month, "yyyy-MM");
        const label = format(month, "MMM", { locale: ptBR });
        monthlyData.set(key, { income: 0, expense: 0, label });
      }

      // Aggregate transactions
      for (const t of transactions) {
        const d = parseISO(t.date.toISOString());
        const key = format(d, "yyyy-MM");
        const existing = monthlyData.get(key);
        if (existing) {
          if (t.type === TransactionType.INCOME) {
            existing.income += Number(t.amount);
          } else {
            existing.expense += Number(t.amount);
          }
        }
      }

      // Build series arrays
      const sortedKeys = Array.from(monthlyData.keys()).sort();
      const compareSeries = sortedKeys.map((key) => {
        const data = monthlyData.get(key)!;
        return {
          month: data.label.charAt(0).toUpperCase() + data.label.slice(1),
          receitas: Math.round(data.income),
          despesas: Math.round(data.expense),
        };
      });

      // Calculate running balance
      const totalBalance = await prisma.bankAccount.aggregate({
        where: {
          tenantId: ctx.tenantId,
          ...(input.bankAccountIds?.length && { id: { in: input.bankAccountIds } }),
        },
        _sum: { currentBalance: true },
      });
      const currentBalance = Number(totalBalance._sum.currentBalance ?? 0);

      // Work backwards from current balance
      const balanceSeries = [] as { month: string; saldo: number }[];
      let runningBalance = currentBalance;

      for (let i = sortedKeys.length - 1; i >= 0; i--) {
        const key = sortedKeys[i];
        const data = monthlyData.get(key)!;
        balanceSeries.unshift({
          month: data.label.charAt(0).toUpperCase() + data.label.slice(1),
          saldo: Math.round(runningBalance),
        });
        runningBalance -= data.income - data.expense;
      }

      return {
        balanceSeries,
        compareSeries,
      };
    }),

  // US04: Projeção de caixa futura — saldo projetado incluindo transações PENDING
  projection: tenantProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(6),
      }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + input.months);

      // Saldo atual (só transações COMPLETED)
      const bankAgg = await prisma.bankAccount.aggregate({
        where: { tenantId: ctx.tenantId },
        _sum: { currentBalance: true },
      });
      const currentBalance = Number(bankAgg._sum.currentBalance ?? 0);

      // Busca todas as transações PENDING com dueDate no período de projeção
      const pendingTransactions = await prisma.transaction.findMany({
        where: {
          bankAccount: { tenantId: ctx.tenantId },
          status: TransactionStatus.PENDING,
          dueDate: {
            gte: today,
            lte: endDate,
          },
        },
        select: {
          amount: true,
          type: true,
          dueDate: true,
          description: true,
        },
        orderBy: { dueDate: "asc" },
      });

      // Agrupar por mês
      const monthMap = new Map<
        string,
        {
          income: number;
          expense: number;
          items: { description: string; amount: number; type: string }[];
        }
      >();

      const monthsRange = eachMonthOfInterval({
        start: startOfMonth(today),
        end: startOfMonth(endDate),
      });

      for (const m of monthsRange) {
        const key = format(m, "yyyy-MM");
        monthMap.set(key, { income: 0, expense: 0, items: [] });
      }

      for (const t of pendingTransactions) {
        if (!t.dueDate) continue;
        const key = format(startOfMonth(t.dueDate), "yyyy-MM");
        const bucket = monthMap.get(key);
        if (bucket) {
          const amount = Number(t.amount);
          if (t.type === TransactionType.INCOME) {
            bucket.income += amount;
          } else {
            bucket.expense += amount;
          }
          bucket.items.push({
            description: t.description || "",
            amount,
            type: t.type,
          });
        }
      }

      // Construir série projetada
      const sortedKeys = Array.from(monthMap.keys()).sort();
      let projectedBalance = currentBalance;
      const series = sortedKeys.map((key) => {
        const m = monthMap.get(key)!;
        projectedBalance += m.income - m.expense;
        return {
          month: format(parseISO(`${key}-01`), "MMM", { locale: ptBR }),
          saldo: Math.round(projectedBalance),
          receitas: Math.round(m.income),
          despesas: Math.round(m.expense),
          items: m.items,
        };
      });

      return {
        currentBalance: Math.round(currentBalance),
        projectedEndBalance: Math.round(projectedBalance),
        series,
        pendingCount: pendingTransactions.length,
      };
    }),

  // US04: Forecast — transações futuras pendentes listadas
  forecast: tenantProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startDate = input.startDate ?? new Date();
      const endDate =
        input.endDate ??
        (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 3);
          return d;
        })();

      const transactions = await prisma.transaction.findMany({
        where: {
          bankAccount: { tenantId: ctx.tenantId },
          status: TransactionStatus.PENDING,
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          bankAccount: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
        },
        orderBy: { dueDate: "asc" },
        take: input.limit,
      });

      const totalIncome = transactions
        .filter((t) => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpense = transactions
        .filter((t) => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        transactions,
        totalIncome: Math.round(totalIncome),
        totalExpense: Math.round(totalExpense),
        netChange: Math.round(totalIncome - totalExpense),
      };
    }),
});
