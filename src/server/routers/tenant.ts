import { prisma } from "@/lib/db";
import {
  adminProcedure,
  backofficeProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  tenantProcedure,
} from "@/lib/trpc/trpc";
import { MemberRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must only contain lowercase letters, numbers, and hyphens",
    }),
  description: z.string().max(500).optional(),
});

const updateTenantSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug deve conter apenas letras minúsculas, números e hífens",
    })
    .optional(),
  description: z.string().max(500).optional().nullable(),
  whatsappPhone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  image: z.string().optional().nullable(),
});

const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor deve ser HEX válido");

const updateConfigSchema = z
  .object({
    branding: z
      .object({
        logo: z.string().optional(),
        colors: z.object({
          primary: hexColorSchema,
          secondary: hexColorSchema,
          background: hexColorSchema.optional(),
          text: hexColorSchema.optional(),
          primaryText: hexColorSchema.optional(),
          secondaryText: hexColorSchema.optional(),
        }),
      })
      .optional(),
  })
  .partial();

export const tenantRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenants = await prisma.tenant.findMany({
      where: {
        memberships: {
          some: {
            userId: ctx.user.id!,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        whatsappPhone: true,
        config: true,
        isActive: true,
        createdAt: true,
        memberships: {
          where: {
            userId: ctx.user.id!,
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return tenants.map((t) => ({
      ...t,
      role: t.memberships[0]?.role,
    }));
  }),

  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: input.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        description: true,
        isActive: true,
        config: true,
        memberships: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            memberships: true,
          },
        },
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

  create: backofficeProcedure.input(createTenantSchema).mutation(async ({ ctx, input }) => {
    // Check if slug is already taken
    const existing = await prisma.tenant.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This slug is already taken",
      });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        ownerId: ctx.user.id!,
        config: {},
        memberships: {
          create: {
            userId: ctx.user.id!,
            role: MemberRole.OWNER,
            joinedAt: new Date(),
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        config: true,
        isActive: true,
      },
    });

    return tenant;
  }),

  update: adminProcedure.input(updateTenantSchema).mutation(async ({ input }) => {
    // Check if slug is being changed and if new slug is already taken
    if (input.slug) {
      const existing = await prisma.tenant.findUnique({
        where: { slug: input.slug },
      });
      if (existing && existing.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este slug já está em uso",
        });
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: input.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.whatsappPhone !== undefined && { whatsappPhone: input.whatsappPhone }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.image !== undefined && { image: input.image }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        config: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return tenant;
  }),

  getConfig: tenantProcedure.query(async ({ ctx }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { config: true },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    // Parse config or return default
    const parsedConfig = tenant.config as Record<string, unknown> | null;
    const colors = (parsedConfig?.branding as Record<string, unknown>)?.colors as Record<
      string,
      string
    >;
    return {
      branding: {
        logo: (parsedConfig?.branding as Record<string, string>)?.logo || null,
        colors: {
          primary: colors?.primary || "#3b82f6",
          secondary: colors?.secondary || "#10b981",
          background: colors?.background || "#ffffff",
          text: colors?.text || "#1f2937",
          primaryText: colors?.primaryText || "#ffffff",
          secondaryText: colors?.secondaryText || "#ffffff",
        },
      },
    };
  }),

  updateConfig: adminProcedure.input(updateConfigSchema).mutation(async ({ ctx, input }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { config: true },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    // Merge existing config with new config
    const currentConfig = (tenant.config as Record<string, unknown>) || {};
    const newConfig = {
      ...currentConfig,
      ...input,
      branding: {
        ...(currentConfig.branding as Record<string, unknown>),
        ...input.branding,
        colors: {
          ...((currentConfig.branding as Record<string, unknown>)?.colors as Record<
            string,
            string
          >),
          ...input.branding?.colors,
        },
      },
    };

    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: { config: newConfig },
    });

    return {
      branding: {
        logo: (newConfig.branding as unknown as Record<string, string>)?.logo || null,
        colors: {
          primary:
            (
              (newConfig.branding as unknown as Record<string, unknown>)
                ?.colors as unknown as Record<string, string>
            )?.primary || "#3b82f6",
          secondary:
            (
              (newConfig.branding as unknown as Record<string, unknown>)
                ?.colors as unknown as Record<string, string>
            )?.secondary || "#10b981",
        },
      },
    };
  }),

  switch: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: input.slug },
        include: {
          memberships: {
            where: { userId: ctx.user.id },
          },
        },
      });

      if (!tenant || tenant.memberships.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this tenant",
        });
      }

      return { success: true, tenant };
    }),
});
