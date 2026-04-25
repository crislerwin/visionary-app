import { prisma } from "@/lib/db";
import { publicProcedure, router } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const menuRouter = router({
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
      const categoriesWithProducts = categories.filter(
        (cat) => cat.products.length > 0
      );

      // Convert Decimal prices to numbers
      return categoriesWithProducts.map((category) => ({
        ...category,
        products: category.products.map((product) => ({
          ...product,
          price: Number(product.price),
          variants: product.variants.map((variant) => ({
            ...variant,
            price: Number(variant.price),
          })),
        })),
      }));
    }),
});
