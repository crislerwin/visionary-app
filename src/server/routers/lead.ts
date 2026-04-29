import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { adminProcedure, publicProcedure, router } from "@/lib/trpc/trpc";
import { LeadStatus, MemberRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().optional(),
  businessSize: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE"]).optional(),
  employeeCount: z.number().int().min(0).optional(),
  currentTool: z.string().optional(),
});

const updateLeadSchema = z.object({
  leadId: z.string(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

const approveLeadSchema = z.object({
  leadId: z.string(),
  tenantId: z.string().optional(),
  tenantName: z.string().min(2).max(50).optional(),
  tenantSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  role: z.enum([MemberRole.ADMIN, MemberRole.MEMBER, MemberRole.VIEWER]),
});

const rejectLeadSchema = z.object({
  leadId: z.string(),
  reason: z.string().min(1).max(500),
});

const listLeadsSchema = z.object({
  status: z.enum([LeadStatus.PENDING, LeadStatus.APPROVED, LeadStatus.REJECTED]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const leadRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  create: publicProcedure.input(createLeadSchema).mutation(async ({ input }) => {
    const existingLead = await prisma.lead.findUnique({
      where: { email: input.email },
    });

    if (existingLead) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Lead already exists for this email",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User with this email already exists",
      });
    }

    const lead = await prisma.lead.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        businessSize: input.businessSize as "SOLO" | "SMALL" | "MEDIUM" | "LARGE" | undefined,
        employeeCount: input.employeeCount,
        currentTool: input.currentTool,
      },
    });

    return lead;
  }),

  list: adminProcedure.input(listLeadsSchema).query(async ({ input }) => {
    const where: Record<string, unknown> = {};
    if (input.status) {
      where.status = input.status;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          assignedTo: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          rejectedBy: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      leads,
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }),

  get: adminProcedure.input(z.object({ leadId: z.string() })).query(async ({ input }) => {
    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        rejectedBy: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!lead) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Lead not found",
      });
    }

    return lead;
  }),

  update: adminProcedure.input(updateLeadSchema).mutation(async ({ input }) => {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
    }

    return prisma.lead.update({
      where: { id: input.leadId },
      data: {
        notes: input.notes,
        assignedToId: input.assignedToId,
      },
    });
  }),

  approve: adminProcedure.input(approveLeadSchema).mutation(async ({ ctx, input }) => {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
    }

    if (lead.status !== LeadStatus.PENDING) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lead is not in PENDING status",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      let tenantId = input.tenantId;

      // Create tenant if not provided
      if (!tenantId) {
        const slug = input.tenantSlug || generateLeadSlug(lead.name);

        let uniqueSlug = slug;
        let counter = 0;
        while (await tx.tenant.findUnique({ where: { slug: uniqueSlug } })) {
          counter++;
          uniqueSlug = `${slug}-${counter}`;
        }

        const tenant = await tx.tenant.create({
          data: {
            name: input.tenantName || lead.name,
            slug: uniqueSlug,
            ownerId: ctx.user.id!,
          },
        });
        tenantId = tenant.id;
      }

      // Create user if doesn't exist
      let user = await tx.user.findUnique({ where: { email: lead.email } });
      if (!user) {
        const token = crypto.randomBytes(32).toString("hex");
        user = await tx.user.create({
          data: {
            name: lead.name,
            email: lead.email,
            password: null,
          },
        });

        // Create invite so user can set password
        await tx.invite.create({
          data: {
            email: lead.email,
            token,
            tenantId,
            invitedBy: ctx.user.id!,
            role: input.role,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        console.log(`Lead approved - invite link: ${process.env.NEXTAUTH_URL}/invite/${token}`);
      }

      // Create membership if doesn't exist
      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId,
          },
        },
      });

      if (!existingMembership) {
        await tx.membership.create({
          data: {
            userId: user.id,
            tenantId,
            role: input.role,
            joinedAt: new Date(),
          },
        });
      }

      // Update lead status
      const updated = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.APPROVED,
          approvedById: ctx.user.id!,
          approvedAt: new Date(),
          tenantId,
        },
      });

      return updated;
    });

    return result;
  }),

  reject: adminProcedure.input(rejectLeadSchema).mutation(async ({ ctx, input }) => {
    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
    }

    if (lead.status !== LeadStatus.PENDING) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lead is not in PENDING status",
      });
    }

    return prisma.lead.update({
      where: { id: input.leadId },
      data: {
        status: LeadStatus.REJECTED,
        rejectedById: ctx.user.id!,
        rejectedAt: new Date(),
        rejectionReason: input.reason,
      },
    });
  }),
});

function generateLeadSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
