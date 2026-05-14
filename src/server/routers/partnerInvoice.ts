import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { PartnerInvoiceStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const partnerInvoiceRouter = router({
  list: tenantProcedure
    .input(
      z
        .object({
          partnerId: z.string().optional(),
          status: z.nativeEnum(PartnerInvoiceStatus).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { partnerId, status, limit = 50, offset = 0 } = input ?? {};

      const [invoices, total] = await Promise.all([
        prisma.partnerInvoice.findMany({
          where: {
            tenantId: ctx.tenantId,
            ...(partnerId && { partnerId }),
            ...(status && { status }),
          },
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
              },
            },
          },
          orderBy: { dueDate: "asc" },
          skip: offset,
          take: limit,
        }),
        prisma.partnerInvoice.count({
          where: {
            tenantId: ctx.tenantId,
            ...(partnerId && { partnerId }),
            ...(status && { status }),
          },
        }),
      ]);

      return {
        invoices: invoices.map((inv) => ({
          ...inv,
          amount: Number(inv.amount),
        })),
        total,
      };
    }),

  pay: tenantProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const invoice = await prisma.partnerInvoice.findFirst({
      where: {
        id: input.id,
        tenantId: ctx.tenantId,
        status: PartnerInvoiceStatus.PENDING,
      },
    });

    if (!invoice) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Conta a pagar não encontrada ou já paga",
      });
    }

    await prisma.partnerInvoice.update({
      where: { id: input.id },
      data: {
        status: PartnerInvoiceStatus.PAID,
        paidAt: new Date(),
      },
    });

    return { success: true };
  }),

  summary: tenantProcedure.query(async ({ ctx }) => {
    const [totalPending, totalOverdue, totalPaid, totalAmountPending] = await Promise.all([
      prisma.partnerInvoice.count({
        where: { tenantId: ctx.tenantId, status: PartnerInvoiceStatus.PENDING },
      }),
      prisma.partnerInvoice.count({
        where: { tenantId: ctx.tenantId, status: PartnerInvoiceStatus.OVERDUE },
      }),
      prisma.partnerInvoice.count({
        where: { tenantId: ctx.tenantId, status: PartnerInvoiceStatus.PAID },
      }),
      prisma.partnerInvoice
        .findMany({
          where: { tenantId: ctx.tenantId, status: PartnerInvoiceStatus.PENDING },
          select: { amount: true },
        })
        .then((rows) => rows.reduce((sum, r) => sum + Number(r.amount), 0)),
    ]);

    return {
      totalPending,
      totalOverdue,
      totalPaid,
      totalAmountPending,
      totalCount: totalPending + totalOverdue + totalPaid,
    };
  }),
});

export type PartnerInvoiceRouter = typeof partnerInvoiceRouter;
