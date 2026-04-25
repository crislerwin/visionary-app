import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const _currencyRegex = /^(\d+\.\d{2})$/;

const variantSchema = z.object({
  name: z.string().min(1).max(50),
  price: z.number().min(0).max(99999),
  stock: z.number().int().min(0).optional(),
});

const productBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  image: z.string().optional(),
  price: z.number().min(0).max(99999),
  categoryId: z.string(),
  stock: z.number().int().min(0).default(0),
  trackStock: z.boolean().default(false),
  variants: z.array(variantSchema).optional(),
});

const createProductSchema = z.object({
  tenantId: z.string(),
  ...productBaseSchema.shape,
});

const updateProductSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  image: z.string().optional().nullable(),
  price: z.number().min(0).max(99999).optional(),
  categoryId: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  trackStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const deleteProductSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
});

export const productRouter = router({
  // Listar produtos do tenant
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string(),
        categoryId: z.string().optional(),
        includeDeleted: z.boolean().optional(),
        onlyActive: z.boolean().optional().default(true),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {
        tenantId: input.tenantId,
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.includeDeleted ? {} : { isDeleted: false }),
        ...(input.onlyActive && { isActive: true }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
          ],
        }),
      };

      const products = await prisma.product.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
        include: {
          category: {
            select: { id: true, name: true },
          },
          variants: {
            where: { isActive: true },
            orderBy: { price: "asc" },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (products.length > input.limit) {
        const nextItem = products.pop();
        nextCursor = nextItem?.id;
      }

      return {
        products,
        nextCursor,
      };
    }),

  // Buscar produto por ID
  byId: tenantProcedure
    .input(z.object({ id: z.string(), tenantId: z.string() }))
    .query(async ({ input }) => {
      const product = await prisma.product.findFirst({
        where: {
          id: input.id,
          tenantId: input.tenantId,
        },
        include: {
          category: true,
          variants: true,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return product;
    }),

  // Buscar produtos por categoria
  byCategory: tenantProcedure
    .input(
      z.object({
        categoryId: z.string(),
        tenantId: z.string(),
        includeInactive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const products = await prisma.product.findMany({
        where: {
          categoryId: input.categoryId,
          tenantId: input.tenantId,
          isDeleted: false,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        orderBy: { name: "asc" },
        include: {
          variants: {
            where: { isActive: true },
          },
        },
      });

      return products;
    }),

  // Criar produto
  create: tenantProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      // Verificar se categoria existe
      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          tenantId: input.tenantId,
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      const product = await prisma.product.create({
        data: {
          name: input.name,
          description: input.description,
          image: input.image,
          price: input.price,
          stock: input.stock,
          trackStock: input.trackStock,
          categoryId: input.categoryId,
          tenantId: input.tenantId,
          variants: {
            create: input.variants?.map((v) => ({
              name: v.name,
              price: v.price,
              stock: v.stock ?? 0,
            })) || [],
          },
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          variants: true,
        },
      });

      return product;
    }),

  // Atualizar produto
  update: tenantProcedure
    .input(updateProductSchema)
    .mutation(async ({ input }) => {
      const existing = await prisma.product.findFirst({
        where: {
          id: input.id,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Se mudou de categoria, verificar se nova existe
      if (input.categoryId && input.categoryId !== existing.categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: input.categoryId,
            tenantId: input.tenantId,
          },
        });

        if (!category) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }
      }

      const product = await prisma.product.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.image !== undefined && { image: input.image }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
          ...(input.stock !== undefined && { stock: input.stock }),
          ...(input.trackStock !== undefined && { trackStock: input.trackStock }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          variants: true,
        },
      });

      return product;
    }),

  // Deletar produto (soft delete)
  delete: tenantProcedure
    .input(deleteProductSchema)
    .mutation(async ({ input }) => {
      const product = await prisma.product.findFirst({
        where: {
          id: input.id,
          tenantId: input.tenantId,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      await prisma.product.update({
        where: { id: input.id },
        data: {
          isDeleted: true,
          isActive: false,
        },
      });

      return { success: true };
    }),

  // Add variant to product
  addVariant: tenantProcedure
    .input(
      z.object({
        tenantId: z.string(),
        productId: z.string(),
        variant: variantSchema,
      })
    )
    .mutation(async ({ input }) => {
      const product = await prisma.product.findFirst({
        where: {
          id: input.productId,
          tenantId: input.tenantId,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const variant = await prisma.productVariant.create({
        data: {
          name: input.variant.name,
          price: input.variant.price,
          stock: input.variant.stock ?? 0,
          productId: input.productId,
        },
      });

      return variant;
    }),

  // Update variant
  updateVariant: tenantProcedure
    .input(
      z.object({
        tenantId: z.string(),
        variantId: z.string(),
        name: z.string().min(1).max(50).optional(),
        price: z.number().min(0).max(99999).optional(),
        stock: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const variant = await prisma.productVariant.findFirst({
        where: { id: input.variantId },
        include: { product: true },
      });

      if (!variant || variant.product.tenantId !== input.tenantId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found",
        });
      }

      const updated = await prisma.productVariant.update({
        where: { id: input.variantId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.stock !== undefined && { stock: input.stock }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });

      return updated;
    }),

  // Delete variant
  deleteVariant: tenantProcedure
    .input(
      z.object({
        tenantId: z.string(),
        variantId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const variant = await prisma.productVariant.findFirst({
        where: { id: input.variantId },
        include: { product: true },
      });

      if (!variant || variant.product.tenantId !== input.tenantId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Variant not found",
        });
      }

      await prisma.productVariant.delete({
        where: { id: input.variantId },
      });

      return { success: true };
    }),
});
