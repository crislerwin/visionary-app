import { z } from "zod";
import { tenantProcedure, router } from "@/lib/trpc/trpc";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";

export const alertRouter = router({
  listRules: tenantProcedure.query(async ({ ctx }) => {
    return prisma.alertRule.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
    });
  }),

  createRule: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        condition: z.enum(["balance_below", "invoice_overdue", "revenue_target"]),
        threshold: z.coerce.number().min(0),
        targetType: z.enum(["BANK_ACCOUNT", "PARTNER_INVOICE"]).optional(),
        targetId: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.alertRule.create({
        data: {
          name: input.name,
          description: input.description,
          condition: input.condition,
          threshold: input.threshold,
          targetType: input.targetType,
          targetId: input.targetId,
          priority: input.priority,
          tenantId: ctx.tenantId,
        },
      });
    }),

  updateRule: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        condition: z.enum(["balance_below", "invoice_overdue", "revenue_target"]).optional(),
        threshold: z.coerce.number().min(0).optional(),
        targetType: z.enum(["BANK_ACCOUNT", "PARTNER_INVOICE"]).optional().nullable(),
        targetId: z.string().optional().nullable(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return prisma.alertRule.updateMany({
        where: { id, tenantId: ctx.tenantId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.condition !== undefined && { condition: data.condition }),
          ...(data.threshold !== undefined && { threshold: data.threshold }),
          ...(data.targetType !== undefined && { targetType: data.targetType }),
          ...(data.targetId !== undefined && { targetId: data.targetId }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
    }),

  deleteRule: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.alertRule.deleteMany({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      return { success: true };
    }),

  check: tenantProcedure.mutation(async ({ ctx }) => {
    const rules = await prisma.alertRule.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
    });

    const created: string[] = [];
    const now = new Date();
    const userId = ctx.session?.user?.id;

    if (!userId) {
      return { created };
    }

    for (const rule of rules) {
      const existing = await prisma.notification.findFirst({
        where: { alertRuleId: rule.id, status: "UNREAD", tenantId: ctx.tenantId },
      });
      if (existing) continue;

      let shouldAlert = false;
      let title = "";
      let message = "";
      const data: Record<string, unknown> = {};

      switch (rule.condition) {
        case "balance_below": {
          const threshold = Number(rule.threshold);
          if (rule.targetType === "BANK_ACCOUNT" && rule.targetId) {
            const account = await prisma.bankAccount.findFirst({
              where: { id: rule.targetId, tenantId: ctx.tenantId },
            });
            if (account && Number(account.currentBalance) < threshold) {
              shouldAlert = true;
              title = `Saldo Baixo: ${account.name}`;
              message = "Saldo atual está abaixo do limite.";
              data.balance = Number(account.currentBalance);
              data.threshold = threshold;
            }
          } else {
            const accounts = await prisma.bankAccount.findMany({
              where: { tenantId: ctx.tenantId },
            });
            const low = accounts.filter((a) => Number(a.currentBalance) < threshold);
            if (low.length > 0) {
              shouldAlert = true;
              title = `${low.length} contas com saldo baixo`;
              message = low.map((a) => `${a.name}: R$ ${Number(a.currentBalance).toFixed(2)}`).join(", ");
              data.accounts = low.map((a) => ({
                name: a.name,
                balance: Number(a.currentBalance),
              }));
              data.threshold = threshold;
            }
          }
          break;
        }

        case "invoice_overdue": {
          const overdueInvoices = await prisma.partnerInvoice.findMany({
            where: {
              tenantId: ctx.tenantId,
              status: "PENDING",
              dueDate: { lt: now },
            },
            include: { partner: true },
          });
          if (overdueInvoices.length > 0) {
            shouldAlert = true;
            title = `${overdueInvoices.length} conta(s) a pagar vencida(s)`;
            message = overdueInvoices
              .map((i) => `${i.partner.name}: R$ ${Number(i.amount).toFixed(2)}`)
              .join("; ");
            data.invoices = overdueInvoices.map((i) => ({
              partner: i.partner.name,
              amount: Number(i.amount),
              dueDate: i.dueDate.toISOString(),
            }));
          }
          break;
        }

        case "revenue_target": {
          const threshold = Number(rule.threshold);
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          const incomeAgg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
              type: "INCOME",
              status: "COMPLETED",
              date: { gte: monthStart, lte: monthEnd },
            },
          });
          const revenue = Number(incomeAgg._sum?.amount ?? 0);
          if (revenue < threshold) {
            shouldAlert = true;
            title = "Meta de receita não atingida";
            message = `Receita do mês: R$ ${revenue.toFixed(2)} / meta: R$ ${threshold.toFixed(2)}`;
            data.revenue = revenue;
            data.threshold = threshold;
          }
          break;
        }
      }

      if (shouldAlert) {
        await prisma.notification.create({
          data: {
            alertRuleId: rule.id,
            title,
            message,
            status: "UNREAD",
            data: JSON.stringify(data),
            userId,
            tenantId: ctx.tenantId,
          },
        });
        created.push(title);
      }
    }

    return { created };
  }),

  listNotifications: tenantProcedure
    .input(
      z
        .object({
          status: z.enum(["UNREAD", "READ", "DISMISSED"]).optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { status, limit = 50 } = input ?? {};
      return prisma.notification.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(status && { status }),
        },
        include: { alertRule: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }),

  unreadCount: tenantProcedure.query(async ({ ctx }) => {
    return prisma.notification.count({
      where: { tenantId: ctx.tenantId, status: "UNREAD" },
    });
  }),

  markAsRead: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.notification.updateMany({
        where: { id: input.id, tenantId: ctx.tenantId },
        data: { status: "READ", readAt: new Date() },
      });
    }),

  markAllAsRead: tenantProcedure.mutation(async ({ ctx }) => {
    return prisma.notification.updateMany({
      where: { tenantId: ctx.tenantId, status: "UNREAD" },
      data: { status: "READ", readAt: new Date() },
    });
  }),

  dismiss: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.notification.updateMany({
        where: { id: input.id, tenantId: ctx.tenantId },
        data: { status: "DISMISSED", dismissedAt: new Date() },
      });
    }),
});

export type AlertRouter = typeof alertRouter;
