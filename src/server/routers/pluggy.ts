import { prisma } from "@/lib/db";
import { protectedProcedure, router, tenantProcedure } from "@/lib/trpc/trpc";
import { PluggyClient } from "pluggy-sdk";
import { TRPCError } from "@trpc/server";
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

    // Enrich with live status from Pluggy if credentials are configured
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

      // Delete from Pluggy if credentials are configured
      if (process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET) {
        try {
          const client = getPluggyClient();
          await client.deleteItem(connection.itemId);
        } catch {
          // Ignore errors deleting from Pluggy
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

      // Fetch accounts
      const accountsResponse = await client.fetchAccounts(connection.itemId);

      // For each account, create/update a bank account and fetch transactions
      for (const account of accountsResponse.results) {
        const bankAccount = await prisma.bankAccount.upsert({
          where: {
            id: account.id,
          },
          update: {
            name: account.name,
            currentBalance: account.balance ?? 0,
          },
          create: {
            id: account.id,
            name: account.name,
            type: "CHECKING",
            currency: account.currencyCode ?? "BRL",
            initialBalance: account.balance ?? 0,
            currentBalance: account.balance ?? 0,
            tenantId: ctx.tenantId,
          },
        });

        // Fetch transactions
        const transactionsResponse = await client.fetchTransactionsCursor(account.id);
        for (const tx of transactionsResponse.results) {
          await prisma.transaction.upsert({
            where: {
              id: tx.id,
            },
            update: {
              amount: tx.amount ?? 0,
              description: tx.description ?? undefined,
              date: tx.date ? new Date(tx.date) : new Date(),
            },
            create: {
              id: tx.id,
              amount: tx.amount ?? 0,
              type: (tx.amount ?? 0) >= 0 ? "INCOME" : "EXPENSE",
              description: tx.description ?? "Transaction",
              date: tx.date ? new Date(tx.date) : new Date(),
              bankAccountId: bankAccount.id,
              status: "COMPLETED",
            },
          });
        }
      }

      return { success: true };
    }),
});
