import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { CommissionType, PartnerStatus, PartnerType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const createPartnerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  type: z.nativeEnum(PartnerType),
  email: z.string().email("E-mail inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  pixKey: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAgency: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankAccountType: z.string().optional().nullable(),
  commissionType: z.nativeEnum(CommissionType).default(CommissionType.PERCENTAGE),
  commissionValue: z.number().min(0).default(0),
  status: z.nativeEnum(PartnerStatus).default(PartnerStatus.ACTIVE),
  notes: z.string().optional().nullable(),
});

const updatePartnerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.nativeEnum(PartnerType).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  pixKey: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAgency: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankAccountType: z.string().optional().nullable(),
  commissionType: z.nativeEnum(CommissionType).optional(),
  commissionValue: z.number().min(0).optional(),
  status: z.nativeEnum(PartnerStatus).optional(),
  notes: z.string().optional().nullable(),
});

export const partnerRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const partners = await prisma.partner.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return partners.map((p) => ({
      ...p,
      commissionValue: Number(p.commissionValue),
    }));
  }),

  byId: tenantProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const partner = await prisma.partner.findFirst({
      where: { id: input.id, tenantId: ctx.tenantId },
      include: {
        invoices: { orderBy: { dueDate: "desc" }, take: 10 },
        _count: { select: { invoices: true } },
      },
    });

    if (!partner) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Parceiro não encontrado" });
    }

    return {
      ...partner,
      commissionValue: Number(partner.commissionValue),
      invoices: partner.invoices.map((inv) => ({
        ...inv,
        amount: Number(inv.amount),
      })),
    };
  }),

  create: tenantProcedure.input(createPartnerSchema).mutation(async ({ ctx, input }) => {
    const partner = await prisma.partner.create({
      data: {
        name: input.name,
        type: input.type,
        email: input.email ?? null,
        phone: input.phone ?? null,
        document: input.document ?? null,
        pixKey: input.pixKey ?? null,
        bankName: input.bankName ?? null,
        bankAgency: input.bankAgency ?? null,
        bankAccount: input.bankAccount ?? null,
        bankAccountType: input.bankAccountType ?? null,
        commissionType: input.commissionType,
        commissionValue: input.commissionValue,
        status: input.status,
        notes: input.notes ?? null,
        tenantId: ctx.tenantId,
      },
    });

    return {
      ...partner,
      commissionValue: Number(partner.commissionValue),
    };
  }),

  update: tenantProcedure
    .input(z.object({ id: z.string(), data: updatePartnerSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.partner.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Parceiro não encontrado" });
      }

      const partner = await prisma.partner.update({
        where: { id: input.id },
        data: {
          ...(input.data.name !== undefined && { name: input.data.name }),
          ...(input.data.type !== undefined && { type: input.data.type }),
          ...(input.data.email !== undefined && { email: input.data.email }),
          ...(input.data.phone !== undefined && { phone: input.data.phone }),
          ...(input.data.document !== undefined && { document: input.data.document }),
          ...(input.data.pixKey !== undefined && { pixKey: input.data.pixKey }),
          ...(input.data.bankName !== undefined && { bankName: input.data.bankName }),
          ...(input.data.bankAgency !== undefined && { bankAgency: input.data.bankAgency }),
          ...(input.data.bankAccount !== undefined && { bankAccount: input.data.bankAccount }),
          ...(input.data.bankAccountType !== undefined && {
            bankAccountType: input.data.bankAccountType,
          }),
          ...(input.data.commissionType !== undefined && {
            commissionType: input.data.commissionType,
          }),
          ...(input.data.commissionValue !== undefined && {
            commissionValue: input.data.commissionValue,
          }),
          ...(input.data.status !== undefined && { status: input.data.status }),
          ...(input.data.notes !== undefined && { notes: input.data.notes }),
        },
      });

      return {
        ...partner,
        commissionValue: Number(partner.commissionValue),
      };
    }),

  delete: tenantProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await prisma.partner.findFirst({
      where: { id: input.id, tenantId: ctx.tenantId },
      include: { _count: { select: { invoices: true } } },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Parceiro não encontrado" });
    }

    await prisma.partner.delete({ where: { id: input.id } });

    return { success: true };
  }),

  performance: tenantProcedure
    .input(
      z
        .object({
          sortBy: z.enum(["volume", "profit"]).default("profit"),
          period: z.enum(["month", "quarter", "year", "all"]).default("all"),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { sortBy = "profit", period = "all", limit = 50 } = input ?? {};

      // Build date filter based on period
      const now = new Date();
      let dateFilter: { gte?: Date } = {};
      if (period === "month") {
        dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      } else if (period === "quarter") {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateFilter = { gte: quarterStart };
      } else if (period === "year") {
        dateFilter = { gte: new Date(now.getFullYear(), 0, 1) };
      }

      // Fetch partners and extract IDs for filtering
      const partners = await prisma.partner.findMany({
        where: { tenantId: ctx.tenantId, status: PartnerStatus.ACTIVE },
        orderBy: { name: "asc" },
        take: limit,
      });

      const partnerIds = partners.map((p) => p.id);

      // Early return if no partners
      if (partnerIds.length === 0) {
        return {
          partners: [],
          summary: {
            totalPartners: 0,
            totalReceived: 0,
            totalPaid: 0,
            totalProfit: 0,
            totalTransactions: 0,
          },
        };
      }

      // Fetch partners with aggregated transaction data in parallel
      const dateWhere = dateFilter.gte ? { gte: dateFilter.gte } : undefined;

      const [incomeAgg, expenseAgg, countAgg] = await Promise.all([
        // Total income per partner
        prisma.transaction.groupBy({
          by: ["partnerId"],
          where: {
            partnerId: { in: partnerIds },
            type: "INCOME",
            status: "COMPLETED",
            ...(dateWhere && { date: dateWhere }),
          },
          _sum: { amount: true },
        }),
        // Total expense per partner
        prisma.transaction.groupBy({
          by: ["partnerId"],
          where: {
            partnerId: { in: partnerIds },
            type: "EXPENSE",
            status: "COMPLETED",
            ...(dateWhere && { date: dateWhere }),
          },
          _sum: { amount: true },
        }),
        // Transaction count per partner
        prisma.transaction.groupBy({
          by: ["partnerId"],
          where: {
            partnerId: { in: partnerIds },
            status: "COMPLETED",
            ...(dateWhere && { date: dateWhere }),
          },
          _count: { id: true },
        }),
      ]);

      // Build lookup maps with null safety
      const incomeMap = new Map(
        incomeAgg
          .filter(
            (i): i is typeof i & { partnerId: string; _sum: { amount: unknown } } =>
              i.partnerId != null && i._sum?.amount != null,
          )
          .map((i) => [i.partnerId, Number(i._sum.amount)]),
      );
      const expenseMap = new Map(
        expenseAgg
          .filter(
            (e): e is typeof e & { partnerId: string; _sum: { amount: unknown } } =>
              e.partnerId != null && e._sum?.amount != null,
          )
          .map((e) => [e.partnerId, Number(e._sum.amount)]),
      );
      const countMap = new Map(
        countAgg
          .filter(
            (c): c is typeof c & { partnerId: string; _count: { id: number } } =>
              c.partnerId != null && c._count?.id != null,
          )
          .map((c) => [c.partnerId, c._count.id]),
      );

      // Build performance data
      const performanceData = partners.map((partner) => {
        const totalReceived = incomeMap.get(partner.id) ?? 0;
        const totalPaid = expenseMap.get(partner.id) ?? 0;
        const transactionCount = countMap.get(partner.id) ?? 0;
        const netProfit = totalReceived - totalPaid;

        return {
          id: partner.id,
          name: partner.name,
          type: partner.type,
          status: partner.status,
          commissionType: partner.commissionType,
          commissionValue: Number(partner.commissionValue),
          totalReceived,
          totalPaid,
          netProfit,
          transactionCount,
        };
      });

      // Sort by selected criteria
      const sorted = performanceData.sort((a, b) => {
        if (sortBy === "profit") return b.netProfit - a.netProfit;
        if (sortBy === "volume") return b.transactionCount - a.transactionCount;
        return 0;
      });

      return {
        partners: sorted,
        summary: {
          totalPartners: sorted.length,
          totalReceived: sorted.reduce((s, p) => s + p.totalReceived, 0),
          totalPaid: sorted.reduce((s, p) => s + p.totalPaid, 0),
          totalProfit: sorted.reduce((s, p) => s + p.netProfit, 0),
          totalTransactions: sorted.reduce((s, p) => s + p.transactionCount, 0),
        },
      };
    }),
});

export type PartnerRouter = typeof partnerRouter;
