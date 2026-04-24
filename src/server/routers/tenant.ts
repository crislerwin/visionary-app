import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, tenantProcedure, router } from "@/lib/trpc/trpc";
import { prisma } from "@/lib/db";
import { MemberRole } from "@prisma/client";

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
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const tenantRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenants = await prisma.tenant.findMany({
      where: {
        memberships: {
          some: {
            userId: ctx.user.id,
          },
        },
      },
      include: {
        memberships: {
          where: {
            userId: ctx.user.id,
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

  bySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: input.slug },
      include: {
        memberships: {
          include: {
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
            posts: true,
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

  create: protectedProcedure
    .input(createTenantSchema)
    .mutation(async ({ ctx, input }) => {
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
        ownerId: ctx.user.id,
        memberships: {
          create: {
            userId: ctx.user.id,
            role: MemberRole.OWNER,
            joinedAt: new Date(),
          },
        },
      },
    });

    return tenant;
  }),

  update: tenantProcedure.input(updateTenantSchema).mutation(async ({ ctx, input }) => {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: ctx.user.id,
          tenantId: input.id,
        },
      },
    });

    if (!membership || ![MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to update this tenant",
      });
    }

    const tenant = await prisma.tenant.update({
      where: { id: input.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    return tenant;
  }),

  switch: protectedProcedure.input(z.object({ slug: z.string() })).mutation(async ({ ctx, input }) => {
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
