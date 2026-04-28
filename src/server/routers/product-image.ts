import { prisma } from "@/lib/db";
import { createStorageProvider, getStorageConfig } from "@/lib/storage";
import { adminProcedure, router, tenantProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const storage = createStorageProvider(getStorageConfig());

const generateKey = (tenantId: string, productId: string, filename: string) => {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `products/${tenantId}/${productId}/${timestamp}_${sanitizedFilename}`;
};

export const productImageRouter = router({
  getPresignedUrl: tenantProcedure
    .input(
      z.object({
        productId: z.string(),
        filename: z.string(),
        contentType: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const key = generateKey(ctx.tenantId, input.productId, input.filename);

      const presignedUrl = await storage.getPresignedUrl(key);
      const publicUrl = storage.getPublicUrl(key);

      return { presignedUrl, publicUrl, key };
    }),

  create: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        url: z.string(),
        filename: z.string(),
        size: z.number(),
        mimeType: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify product exists and belongs to tenant
      const product = await prisma.product.findFirst({
        where: {
          id: input.productId,
          tenantId: ctx.tenantId,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Get max sort order
      const maxOrder = await prisma.productImage.aggregate({
        where: { productId: input.productId },
        _max: { sortOrder: true },
      });

      const image = await prisma.productImage.create({
        data: {
          productId: input.productId,
          url: input.url,
          filename: input.filename,
          size: input.size,
          mimeType: input.mimeType,
          width: input.width,
          height: input.height,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });

      return image;
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const image = await prisma.productImage.findFirst({
      where: {
        id: input.id,
        product: {
          tenantId: ctx.tenantId,
        },
      },
    });

    if (!image) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Image not found",
      });
    }

    // Delete from storage
    try {
      const key = image.url.split("/").slice(-3).join("/");
      await storage.delete(key);
    } catch (error) {
      // Log error but continue
      console.error("Failed to delete image from storage:", error);
    }

    // Delete from database
    await prisma.productImage.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),

  listByProduct: tenantProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const images = await prisma.productImage.findMany({
        where: {
          productId: input.productId,
          product: {
            tenantId: ctx.tenantId,
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return images;
    }),

  updateOrder: adminProcedure
    .input(
      z.object({
        images: z.array(
          z.object({
            id: z.string(),
            sortOrder: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all images belong to the same tenant
      const imageIds = input.images.map((i) => i.id);
      const images = await prisma.productImage.findMany({
        where: {
          id: { in: imageIds },
          product: {
            tenantId: ctx.tenantId,
          },
        },
      });

      if (images.length !== imageIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Some images not found",
        });
      }

      // Update sort order
      await Promise.all(
        input.images.map((img) =>
          prisma.productImage.update({
            where: { id: img.id },
            data: { sortOrder: img.sortOrder },
          }),
        ),
      );

      return { success: true };
    }),
});
