import { prisma } from "@/lib/db";
import { adminProcedure, router, tenantProcedure } from "@/lib/trpc/trpc";
import { MemberRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const inviteMemberSchema = z.object({
  tenantId: z.string(),
  email: z.string().email(),
  role: z.enum([MemberRole.ADMIN, MemberRole.MEMBER, MemberRole.VIEWER]),
});

const updateMemberSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  role: z.enum([MemberRole.ADMIN, MemberRole.MEMBER, MemberRole.VIEWER]),
});

const removeMemberSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
});

export const teamRouter = router({
  list: tenantProcedure.input(z.object({ tenantId: z.string() })).query(async ({ ctx, input }) => {
    const members = await prisma.membership.findMany({
      where: { tenantId: input.tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    // Check current user's permission for managing roles
    const currentUserMembership = members.find((m) => m.userId === ctx.user.id);
    const canManageRoles =
      currentUserMembership &&
      (currentUserMembership.role === MemberRole.OWNER ||
        currentUserMembership.role === MemberRole.ADMIN);

    return {
      members,
      currentUserRole: currentUserMembership?.role,
      canManageRoles,
    };
  }),

  invite: adminProcedure.input(inviteMemberSchema).mutation(async ({ ctx, input }) => {
    const currentUserMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: ctx.user.id!,
          tenantId: input.tenantId,
        },
      },
    });

    if (
      !currentUserMembership ||
      (currentUserMembership.role !== MemberRole.OWNER &&
        currentUserMembership.role !== MemberRole.ADMIN)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to invite members",
      });
    }

    // Find or create user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      // Create a placeholder user - they will need to sign up
      // In production, you'd send an invitation email
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found. They need to sign up first.",
      });
    }

    // Check if already a member
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: input.tenantId,
        },
      },
    });

    if (existingMembership) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User is already a member of this tenant",
      });
    }

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        tenantId: input.tenantId,
        role: input.role,
      },
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
    });

    return membership;
  }),

  updateRole: adminProcedure.input(updateMemberSchema).mutation(async ({ ctx, input }) => {
    const currentUserMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: ctx.user.id!,
          tenantId: input.tenantId,
        },
      },
    });

    if (!currentUserMembership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this tenant",
      });
    }

    // Owner can change anyone's role
    // Admin can change members and viewers, but not owners or other admins
    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: input.tenantId,
        },
      },
    });

    if (!targetMembership) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Member not found",
      });
    }

    if (currentUserMembership.role === MemberRole.OWNER) {
      // Owner can change anyone
    } else if (currentUserMembership.role === MemberRole.ADMIN) {
      // Admin can't change owner or other admin roles
      if (
        targetMembership.role === MemberRole.OWNER ||
        targetMembership.role === MemberRole.ADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot modify owners or other admins",
        });
      }
      // Admin can't assign admin role
      if (input.role === MemberRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot assign admin role",
        });
      }
    } else {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to change roles",
      });
    }

    const updated = await prisma.membership.update({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: input.tenantId,
        },
      },
      data: { role: input.role },
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
    });

    return updated;
  }),

  remove: adminProcedure.input(removeMemberSchema).mutation(async ({ ctx, input }) => {
    const currentUserMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: ctx.user.id!,
          tenantId: input.tenantId,
        },
      },
    });

    if (!currentUserMembership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this tenant",
      });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: input.tenantId,
        },
      },
    });

    if (!targetMembership) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Member not found",
      });
    }

    // Can't remove yourself through this endpoint (leave instead)
    if (input.userId === ctx.user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Use leave endpoint to remove yourself",
      });
    }

    // Permission checks
    if (currentUserMembership.role === MemberRole.OWNER) {
      // Owner can remove anyone
    } else if (currentUserMembership.role === MemberRole.ADMIN) {
      // Admin can't remove owner or other admins
      if (
        targetMembership.role === MemberRole.OWNER ||
        targetMembership.role === MemberRole.ADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admins cannot remove owners or other admins",
        });
      }
    } else {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to remove members",
      });
    }

    await prisma.membership.delete({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: input.tenantId,
        },
      },
    });

    return { success: true };
  }),

  leave: tenantProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: ctx.user.id!,
            tenantId: input.tenantId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found",
        });
      }

      // Owner can't leave if they're the only owner
      if (membership.role === MemberRole.OWNER) {
        const ownerCount = await prisma.membership.count({
          where: {
            tenantId: input.tenantId,
            role: MemberRole.OWNER,
          },
        });
        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot leave as the only owner",
          });
        }
      }

      await prisma.membership.delete({
        where: {
          userId_tenantId: {
            userId: ctx.user.id!,
            tenantId: input.tenantId,
          },
        },
      });

      return { success: true };
    }),
});
