import { prisma } from "@/lib/db";
import { isOwner } from "@/middlewares/owner-only";
import { adminProcedure, ownerProcedure, router, tenantProcedure } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const featureFlagCategorySchema = z.enum([
  "AI",
  "WHATSAPP",
  "PAYMENTS",
  "EXPERIMENTAL",
  "PREMIUM",
  "DEPRECATED",
]);

const createFeatureFlagSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .regex(/^[a-z0-9-]+$/, "Name must be lowercase, alphanumeric with hyphens only"),
  description: z.string().optional(),
  category: featureFlagCategorySchema.default("EXPERIMENTAL"),
  isGlobal: z.boolean().default(false),
  tenantId: z.string().optional(),
  enabled: z.boolean().default(false),
});

const updateFeatureFlagSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: featureFlagCategorySchema.optional(),
  isGlobal: z.boolean().optional(),
  tenantId: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
});

const listFeatureFlagsSchema = z.object({
  category: featureFlagCategorySchema.optional(),
  enabled: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  tenantId: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const featureFlagRouter = router({
  // List all feature flags (OWNER only)
  list: ownerProcedure
    .input(listFeatureFlagsSchema)
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input.category) {
        where.category = input.category;
      }
      if (input.enabled !== undefined) {
        where.enabled = input.enabled;
      }
      if (input.isGlobal !== undefined) {
        where.isGlobal = input.isGlobal;
      }
      if (input.tenantId) {
        where.tenantId = input.tenantId;
      }

      const [flags, total] = await Promise.all([
        prisma.featureFlag.findMany({
          where,
          include: { tenant: { select: { id: true, name: true, slug: true } } },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.featureFlag.count({ where }),
      ]);

      return {
        flags: flags.map((flag) => ({
          id: flag.id,
          name: flag.name,
          description: flag.description,
          category: flag.category,
          isGlobal: flag.isGlobal,
          tenantId: flag.tenantId,
          tenant: flag.tenant,
          enabled: flag.enabled,
          createdBy: flag.createdBy,
          updatedBy: flag.updatedBy,
          createdAt: flag.createdAt.toISOString(),
          updatedAt: flag.updatedAt.toISOString(),
        })),
        total,
      };
    }),

  // Get feature flags for current tenant
  listByTenant: tenantProcedure.query(async ({ ctx }) => {
    // Get global flags and tenant-specific flags
    const flags = await prisma.featureFlag.findMany({
      where: {
        OR: [{ isGlobal: true }, { tenantId: ctx.tenantId }],
      },
      orderBy: { name: "asc" },
    });

    return {
      flags: flags.map((flag) => ({
        id: flag.id,
        name: flag.name,
        description: flag.description,
        category: flag.category,
        isGlobal: flag.isGlobal,
        enabled: flag.enabled,
      })),
    };
  }),

  // Get single feature flag
  get: ownerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const flag = await prisma.featureFlag.findUnique({
        where: { id: input.id },
        include: { tenant: { select: { id: true, name: true, slug: true } } },
      });

      if (!flag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      return {
        id: flag.id,
        name: flag.name,
        description: flag.description,
        category: flag.category,
        isGlobal: flag.isGlobal,
        tenantId: flag.tenantId,
        tenant: flag.tenant,
        enabled: flag.enabled,
        createdBy: flag.createdBy,
        updatedBy: flag.updatedBy,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
      };
    }),

  // Create feature flag (OWNER only)
  create: ownerProcedure
    .input(createFeatureFlagSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if name already exists
      const existing = await prisma.featureFlag.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Feature flag with this name already exists",
        });
      }

      // If tenant-specific, verify tenant exists
      if (input.tenantId) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: input.tenantId },
        });
        if (!tenant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tenant not found",
          });
        }
      }

      const flag = await prisma.featureFlag.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          isGlobal: input.isGlobal,
          tenantId: input.tenantId,
          enabled: input.enabled,
          createdBy: ctx.user.id,
        },
      });

      return {
        success: true,
        flag: {
          id: flag.id,
          name: flag.name,
          description: flag.description,
          category: flag.category,
          isGlobal: flag.isGlobal,
          tenantId: flag.tenantId,
          enabled: flag.enabled,
          createdAt: flag.createdAt.toISOString(),
        },
      };
    }),

  // Update feature flag (OWNER only)
  update: ownerProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateFeatureFlagSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.featureFlag.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      // Check name uniqueness if changing
      if (input.data.name && input.data.name !== existing.name) {
        const duplicate = await prisma.featureFlag.findUnique({
          where: { name: input.data.name },
        });
        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Feature flag with this name already exists",
          });
        }
      }

      // If changing tenant, verify it exists
      if (input.data.tenantId) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: input.data.tenantId },
        });
        if (!tenant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tenant not found",
          });
        }
      }

      const flag = await prisma.featureFlag.update({
        where: { id: input.id },
        data: {
          ...(input.data.name && { name: input.data.name }),
          ...(input.data.description !== undefined && { description: input.data.description }),
          ...(input.data.category && { category: input.data.category }),
          ...(input.data.isGlobal !== undefined && { isGlobal: input.data.isGlobal }),
          ...(input.data.tenantId !== undefined && { tenantId: input.data.tenantId }),
          ...(input.data.enabled !== undefined && { enabled: input.data.enabled }),
          updatedBy: ctx.user.id,
        },
      });

      return {
        success: true,
        flag: {
          id: flag.id,
          name: flag.name,
          description: flag.description,
          category: flag.category,
          isGlobal: flag.isGlobal,
          tenantId: flag.tenantId,
          enabled: flag.enabled,
          updatedAt: flag.updatedAt.toISOString(),
        },
      };
    }),

  // Toggle feature flag (OWNER only)
  toggle: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const flag = await prisma.featureFlag.findUnique({
        where: { id: input.id },
      });

      if (!flag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      const updated = await prisma.featureFlag.update({
        where: { id: input.id },
        data: {
          enabled: !flag.enabled,
          updatedBy: ctx.user.id,
        },
      });

      return {
        success: true,
        enabled: updated.enabled,
      };
    }),

  // Delete feature flag (OWNER only)
  delete: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const flag = await prisma.featureFlag.findUnique({
        where: { id: input.id },
      });

      if (!flag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      await prisma.featureFlag.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Check if feature is enabled (for any authenticated user)
  isEnabled: tenantProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check global flag first
      const globalFlag = await prisma.featureFlag.findFirst({
        where: {
          name: input.name,
          isGlobal: true,
        },
      });

      if (globalFlag) {
        return { enabled: globalFlag.enabled };
      }

      // Check tenant-specific flag
      const tenantFlag = await prisma.featureFlag.findFirst({
        where: {
          name: input.name,
          tenantId: ctx.tenantId,
        },
      });

      return { enabled: tenantFlag?.enabled ?? false };
    }),
});

export type FeatureFlagRouter = typeof featureFlagRouter;
