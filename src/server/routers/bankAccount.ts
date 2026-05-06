import { prisma } from "@/lib/db";
import { tenantProcedure, router } from "@/lib/trpc/trpc";
import { BankAccountType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const createBankAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum([BankAccountType.CHECKING, BankAccountType.SAVINGS, BankAccountType.CREDIT]),
  currency: z.string().default("BRL"),
  initialBalance: z.number().default(0),
});

const updateBankAccountSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  type: z.enum([BankAccountType.CHECKING, BankAccountType.SAVINGS, BankAccountType.CREDIT]).optional(),
  currency: z.string().optional(),
});

export const bankAccountRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        tenantId: ctx.tenantId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return bankAccounts;
  }),

  byId: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bankAccount = await prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      });

      if (!bankAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank account not found",
        });
      }

      return bankAccount;
    }),

  create: tenantProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          name: input.name,
          type: input.type,
          currency: input.currency,
          initialBalance: input.initialBalance,
          currentBalance: input.initialBalance,
          tenantId: ctx.tenantId,
        },
      });

      return bankAccount;
    }),

  update: tenantProcedure
    .input(updateBankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const existingAccount = await prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
      });

      if (!existingAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank account not found",
        });
      }

      const bankAccount = await prisma.bankAccount.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.currency !== undefined && { currency: input.currency }),
        },
      });

      return bankAccount;
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingAccount = await prisma.bankAccount.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      });

      if (!existingAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank account not found",
        });
      }

      if (existingAccount._count.transactions > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete bank account with transactions. Delete all transactions first.",
        });
      }

      await prisma.bankAccount.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getTotalBalance: tenantProcedure.query(async ({ ctx }) => {
    const result = await prisma.bankAccount.aggregate({
      where: {
        tenantId: ctx.tenantId,
      },
      _sum: {
        currentBalance: true,
      },
    });

    return {
      totalBalance: Number(result._sum.currentBalance ?? 0),
    };
  }),
});
