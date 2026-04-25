import { prisma } from "@/lib/db";
import { publicProcedure, router } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const publicRouter = router({
  // Buscar tenant por slug
  getTenantBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const tenant = await prisma.tenant.findUnique({
        where: {
          slug: input.slug,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          image: true,
        },
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      return tenant;
    }),

  // Listar categorias ativas com produtos
  getCategoriesWithProducts: publicProcedure
    .input(z.object({ tenantSlug: z.string() }))
    .query(async ({ input }) => {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: input.tenantSlug },
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      const categories = await prisma.category.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
          isDeleted: false,
        },
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            where: {
              isActive: true,
              isDeleted: false,
            },
            orderBy: { name: "asc" },
            include: {
              variants: {
                where: { isActive: true },
                orderBy: { price: "asc" },
              },
            },
          },
        },
      });

      // Filter out categories with no products
      const categoriesWithProducts = categories.filter((cat) => cat.products.length > 0);

      return categoriesWithProducts;
    }),

  // Buscar produtos por tenant
  getProductsByTenant: publicProcedure
    .input(
      z.object({
        tenantSlug: z.string(),
        categorySlug: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: input.tenantSlug },
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      const where: Record<string, unknown> = {
        tenantId: tenant.id,
        isActive: true,
        isDeleted: false,
      };

      if (input.categorySlug) {
        const category = await prisma.category.findFirst({
          where: {
            slug: input.categorySlug,
            tenantId: tenant.id,
          },
        });
        if (category) {
          where.categoryId = category.id;
        }
      }

      const products = await prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          variants: {
            where: { isActive: true },
            orderBy: { price: "asc" },
          },
        },
      });

      return products;
    }),
});
