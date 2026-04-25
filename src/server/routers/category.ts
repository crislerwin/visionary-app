import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const categoryBaseSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
});

const createCategorySchema = z.object({
  tenantId: z.string(),
  ...categoryBaseSchema.shape,
});

const updateCategorySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

const deleteCategorySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
});

const reorderCategoriesSchema = z.object({
  tenantId: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number(),
    }),
  ),
});

// Helper para gerar slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /\u0300|\u0301|\u0302|\u0303|\u0304|\u0305|\u0306|\u0307|\u0308|\u0309|\u030a|\u030b|\u030c|\u030d|\u030e|\u030f|\u0310|\u0311|\u0312|\u0313|\u0314|\u0315|\u0316|\u0317|\u0318|\u0319|\u031a|\u031b|\u031c|\u031d|\u031e|\u031f|\u0320|\u0321|\u0322|\u0323|\u0324|\u0325|\u0326|\u0327|\u0328|\u0329|\u032a|\u032b|\u032c|\u032d|\u032e|\u032f|\u0330|\u0331|\u0332|\u0333|\u0334|\u0335|\u0336|\u0337|\u0338|\u0339|\u033a|\u033b|\u033c|\u033d|\u033e|\u033f|\u0340|\u0341|\u0342|\u0343|\u0344|\u0345|\u0346|\u0347|\u0348|\u0349|\u034a|\u034b|\u034c|\u034d|\u034e|\u034f|\u0350|\u0351|\u0352|\u0353|\u0354|\u0355|\u0356|\u0357|\u0358|\u0359|\u035a|\u035b|\u035c|\u035d|\u035e|\u035f|\u0360|\u0361|\u0362|\u0363|\u0364|\u0365|\u0366|\u0367|\u0368|\u0369|\u036a|\u036b|\u036c|\u036d|\u036e|\u036f/g,
      "",
    )
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const categoryRouter = router({
  // Listar todas categorias
  list: tenantProcedure
    .input(z.object({ tenantId: z.string(), includeDeleted: z.boolean().optional() }))
    .query(async ({ input }) => {
      const categories = await prisma.category.findMany({
        where: {
          tenantId: input.tenantId,
          ...(input.includeDeleted ? {} : { isDeleted: false }),
        },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      return categories;
    }),

  // Buscar por ID
  byId: tenantProcedure
    .input(z.object({ id: z.string(), tenantId: z.string() }))
    .query(async ({ input }) => {
      const category = await prisma.category.findFirst({
        where: {
          id: input.id,
          tenantId: input.tenantId,
        },
        include: {
          products: {
            where: { isDeleted: false, isActive: true },
            orderBy: { name: "asc" },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return category;
    }),

  // Buscar por slug
  bySlug: tenantProcedure
    .input(z.object({ slug: z.string(), tenantId: z.string() }))
    .query(async ({ input }) => {
      const category = await prisma.category.findFirst({
        where: {
          slug: input.slug,
          tenantId: input.tenantId,
          isDeleted: false,
        },
        include: {
          products: {
            where: { isDeleted: false, isActive: true },
            orderBy: { name: "asc" },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return category;
    }),

  // Criar categoria
  create: tenantProcedure.input(createCategorySchema).mutation(async ({ input }) => {
    const slug = generateSlug(input.name);

    // Verificar se slug já existe para este tenant
    const existing = await prisma.category.findFirst({
      where: {
        slug,
        tenantId: input.tenantId,
      },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A category with this name already exists",
      });
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        image: input.image,
        tenantId: input.tenantId,
      },
    });

    return category;
  }),

  // Atualizar categoria
  update: tenantProcedure.input(updateCategorySchema).mutation(async ({ input }) => {
    const existing = await prisma.category.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }

    let slug = existing.slug;
    if (input.name && input.name !== existing.name) {
      slug = generateSlug(input.name);

      // Verificar duplicidade
      const duplicate = await prisma.category.findFirst({
        where: {
          slug,
          tenantId: input.tenantId,
          id: { not: input.id },
        },
      });

      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A category with this name already exists",
        });
      }
    }

    const category = await prisma.category.update({
      where: { id: input.id },
      data: {
        ...(input.name && { name: input.name, slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.image !== undefined && { image: input.image }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    return category;
  }),

  // Deletar categoria (soft delete)
  delete: tenantProcedure.input(deleteCategorySchema).mutation(async ({ input }) => {
    const category = await prisma.category.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
      },
      include: {
        _count: {
          select: { products: { where: { isDeleted: false } } },
        },
      },
    });

    if (!category) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }

    // Verificar se tem produtos
    if (category._count.products > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Cannot delete category with products. Move or delete products first.",
      });
    }

    await prisma.category.update({
      where: { id: input.id },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });

    return { success: true };
  }),

  // Reordenar categorias
  reorder: tenantProcedure.input(reorderCategoriesSchema).mutation(async ({ input }) => {
    // Validar que todos IDs pertencem ao tenant
    const categoryIds = input.items.map((item) => item.id);
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        tenantId: input.tenantId,
      },
    });

    if (categories.length !== categoryIds.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Some categories not found",
      });
    }

    // Atualizar ordenação
    const updates = input.items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    );

    await prisma.$transaction(updates);

    return { success: true };
  }),
});
