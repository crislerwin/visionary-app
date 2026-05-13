import { prisma } from "@/lib/db";
import { protectedProcedure, router, tenantProcedure } from "@/lib/trpc/trpc";
import { BankAccountType, CategoryType, TransactionStatus, TransactionType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { PluggyClient } from "pluggy-sdk";
import { z } from "zod";

function getPluggyClient() {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Pluggy credentials not configured",
    });
  }

  return new PluggyClient({ clientId, clientSecret });
}

function mapPluggyAccountSubtype(subtype: string | null | undefined): BankAccountType {
  switch (subtype) {
    case "SAVINGS_ACCOUNT":
      return BankAccountType.SAVINGS;
    case "CHECKING_ACCOUNT":
      return BankAccountType.CHECKING;
    case "CREDIT_CARD":
      return BankAccountType.CREDIT;
    default:
      return BankAccountType.CHECKING;
  }
}

function mapPluggyTransactionType(txType: string): TransactionType {
  return txType === "CREDIT" ? TransactionType.INCOME : TransactionType.EXPENSE;
}

async function getOrCreateCategory(
  tenantId: string,
  categoryName: string | null | undefined,
  defaultType: CategoryType,
): Promise<string | undefined> {
  if (!categoryName) return undefined;

  const normalized = categoryName.trim();
  if (!normalized) return undefined;

  const existing = await prisma.category.findFirst({
    where: { tenantId, name: { equals: normalized } },
  });

  if (existing) return existing.id;

  const created = await prisma.category.create({
    data: {
      name: normalized,
      type: defaultType,
      tenantId,
    },
  });

  return created.id;
}

export const pluggyRouter = router({
  createConnectToken: protectedProcedure.query(async () => {
    const client = getPluggyClient();
    const { accessToken } = await client.createConnectToken();
    return { connectToken: accessToken };
  }),

  listConnections: tenantProcedure.query(async ({ ctx }) => {
    const connections = await prisma.pluggyConnection.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
    });

    if (process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET) {
      const client = getPluggyClient();
      const enriched = await Promise.all(
        connections.map(async (conn) => {
          try {
            const item = await client.fetchItem(conn.itemId);
            return {
              ...conn,
              status: item.status,
              connectorName: item.connector?.name ?? conn.connectorName,
            };
          } catch {
            return conn;
          }
        }),
      );
      return enriched;
    }

    return connections;
  }),

  saveConnection: tenantProcedure
    .input(
      z.object({
        itemId: z.string(),
        connectorId: z.number(),
        connectorName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const connection = await prisma.pluggyConnection.upsert({
        where: {
          itemId_tenantId: {
            itemId: input.itemId,
            tenantId: ctx.tenantId,
          },
        },
        update: {
          connectorId: input.connectorId,
          connectorName: input.connectorName,
        },
        create: {
          itemId: input.itemId,
          connectorId: input.connectorId,
          connectorName: input.connectorName,
          tenantId: ctx.tenantId,
        },
      });

      return connection;
    }),

  deleteConnection: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const connection = await prisma.pluggyConnection.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      if (process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET) {
        try {
          const client = getPluggyClient();
          await client.deleteItem(connection.itemId);
        } catch {
          // Ignore
        }
      }

      await prisma.pluggyConnection.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  syncConnection: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const connection = await prisma.pluggyConnection.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Pluggy credentials not configured",
        });
      }

      const client = getPluggyClient();
      const item = await client.fetchItem(connection.itemId);

      if (item.status !== "UPDATED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Item status is ${item.status}. Wait for update to complete.`,
        });
      }

      const accountsResponse = await client.fetchAccounts(connection.itemId);

      for (const account of accountsResponse.results) {
        const accountType = mapPluggyAccountSubtype(account.subtype);

        const bankAccount = await prisma.bankAccount.upsert({
          where: { id: account.id },
          update: {
            name: account.name,
            bankName: connection.connectorName,
            currentBalance: account.balance ?? 0,
            type: accountType,
            currency: account.currencyCode ?? "BRL",
          },
          create: {
            id: account.id,
            name: account.name,
            bankName: connection.connectorName,
            type: accountType,
            currency: account.currencyCode ?? "BRL",
            initialBalance: account.balance ?? 0,
            currentBalance: account.balance ?? 0,
            tenantId: ctx.tenantId,
          },
        });

        // Fetch ALL transactions using full pagination
        const allTransactions = await client.fetchAllTransactions(account.id);

        for (const tx of allTransactions) {
          const txType = mapPluggyTransactionType(tx.type);
          const categoryId = await getOrCreateCategory(
            ctx.tenantId,
            tx.category,
            txType === TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE,
          );

          await prisma.transaction.upsert({
            where: { id: tx.id },
            update: {
              amount: Math.abs(tx.amount ?? 0),
              description: tx.description ?? tx.descriptionRaw ?? undefined,
              date: tx.date ? new Date(tx.date) : new Date(),
              type: txType,
              categoryId: categoryId ?? undefined,
            },
            create: {
              id: tx.id,
              amount: Math.abs(tx.amount ?? 0),
              type: txType,
              description: tx.description ?? tx.descriptionRaw ?? "Transaction",
              date: tx.date ? new Date(tx.date) : new Date(),
              bankAccountId: bankAccount.id,
              status: TransactionStatus.COMPLETED,
              categoryId: categoryId ?? undefined,
            },
          });
        }
      }

      return { success: true };
    }),
});
