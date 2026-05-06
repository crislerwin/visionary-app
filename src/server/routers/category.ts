import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// ====================
// Schemas
// ====================

const categoryFilterSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  parentId: z.string().optional().nullable(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
    message: "Color must be a valid hex code (e.g., #6366F1)",
  }).default("#6366F1"),
  icon: z.string().max(50).default("circle"),
  parentId: z.string().optional(),
});

const updateCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().optional().nullable(),
});

const deleteCategorySchema = z.object({
  id: z.string(),
});

const getByIdSchema = z.object({
  id: z.string(),
});

// ====================
// Router
// ====================

export const categoryRouter = router({
  // List categories for tenant with optional filter by type
  list: tenantProcedure
    .input(categoryFilterSchema)
    .query(async ({ ctx, input }) => {
      const where = {
        tenantId: ctx.tenantId,
        ...(input.type && { type: input.type }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
      };

      const categories = await prisma.category.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: [
          { type: "asc" },
          { name: "asc" },
        ],
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              children: true,
              transactions: true,
            },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (categories.length > input.limit) {
        const nextItem = categories.pop();
        nextCursor = nextItem?.id;
      }

      return {
        categories,
        nextCursor,
      };
    }),

  // Get category by ID
  getById: tenantProcedure
    .input(getByIdSchema)
    .query(async ({ ctx, input }) => {
      const category = await prisma.category.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
          _count: {
            select: {
              transactions: true,
            },
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

  // Create category
  create: tenantProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify parent exists and belongs to tenant
      if (input.parentId) {
        const parent = await prisma.category.findFirst({
          where: {
            id: input.parentId,
            tenantId: ctx.tenantId,
          },
        });

        if (!parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent category not found",
          });
        }

        // Parent must be same type
        if (parent.type !== input.type) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent category must have the same type",
          });
        }
      }

      const category = await prisma.category.create({
        data: {
          name: input.name,
          type: input.type,
          color: input.color,
          icon: input.icon,
          parentId: input.parentId,
          tenantId: ctx.tenantId,
          isDefault: false,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return category;
    }),

  // Update category
  update: tenantProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const existingCategory = await prisma.category.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          children: true,
        },
      });

      if (!existingCategory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // Cannot modify default categories
      if (existingCategory.isDefault) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify default categories",
        });
      }

      // Verify new parent if changing
      if (input.parentId !== undefined && input.parentId) {
        const parent = await prisma.category.findFirst({
          where: {
            id: input.parentId,
            tenantId: ctx.tenantId,
          },
        });

        if (!parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent category not found",
          });
        }

        // Prevent circular references
        if (input.parentId === input.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Category cannot be its own parent",
          });
        }

        // Parent must be same type
        if (parent.type !== existingCategory.type) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent category must have the same type",
          });
        }
      }

      const category = await prisma.category.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.color && { color: input.color }),
          ...(input.icon && { icon: input.icon }),
          ...(input.parentId !== undefined && { parentId: input.parentId }),
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              children: true,
              transactions: true,
            },
          },
        },
      });

      return category;
    }),

  // Delete category
  delete: tenantProcedure
    .input(deleteCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const existingCategory = await prisma.category.findFirst({
        where: {
          id: input.id,
          tenantId: ctx.tenantId,
        },
        include: {
          _count: {
            select: {
              children: true,
              transactions: true,
            },
          },
        },
      });

      if (!existingCategory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      // Cannot delete default categories
      if (existingCategory.isDefault) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete default categories",
        });
      }

      // Check if there are subcategories
      if (existingCategory._count.children > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete category with subcategories. Delete or move subcategories first.",
        });
      }

      // Check if there are transactions
      if (existingCategory._count.transactions > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete category with transactions. Reassign transactions first.",
        });
      }

      await prisma.category.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
