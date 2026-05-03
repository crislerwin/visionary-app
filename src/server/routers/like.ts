import { prisma } from "@/lib/db";
import { publicProcedure, router } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const likeRouter = router({
  // Incrementar likes de um produto (público, rate-limited)
  add: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        tenantId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const product = await prisma.product.findFirst({
        where: {
          id: input.productId,
          tenantId: input.tenantId,
          isDeleted: false,
          isActive: true,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const updated = await prisma.product.update({
        where: { id: input.productId },
        data: { likeCount: { increment: 1 } },
      });

      return { likeCount: updated.likeCount };
    }),

  // Decrementar likes de um produto (público, rate-limited)
  remove: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        tenantId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const product = await prisma.product.findFirst({
        where: {
          id: input.productId,
          tenantId: input.tenantId,
          isDeleted: false,
          isActive: true,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const updated = await prisma.product.update({
        where: { id: input.productId },
        data: { likeCount: { decrement: 1 } },
      });

      // Garantir que não fique negativo
      if (updated.likeCount < 0) {
        await prisma.product.update({
          where: { id: input.productId },
          data: { likeCount: 0 },
        });
        return { likeCount: 0 };
      }

      return { likeCount: updated.likeCount };
    }),
});
