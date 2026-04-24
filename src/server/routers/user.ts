import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/lib/trpc/trpc";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().optional().nullable(),
});

const updateEmailSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const deleteAccountSchema = z.object({
  password: z.string(),
});

export const userRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            memberships: true,
            posts: true,
            ownedTenants: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  updateProfile: protectedProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
    const user = await prisma.user.update({
      where: { id: ctx.user.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.image !== undefined && { image: input.image }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return user;
  }),

  updateEmail: protectedProcedure.input(updateEmailSchema).mutation(async ({ ctx, input }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
    });

    if (!currentUser || !currentUser.password) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const isValid = await bcrypt.compare(input.password, currentUser.password);

    if (!isValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Password is incorrect",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser && existingUser.id !== ctx.user.id) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already in use",
      });
    }

    const user = await prisma.user.update({
      where: { id: ctx.user.id },
      data: { email: input.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return user;
  }),

  deleteAccount: protectedProcedure.input(deleteAccountSchema).mutation(async ({ ctx, input }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
    });

    if (!currentUser || !currentUser.password) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const isValid = await bcrypt.compare(input.password, currentUser.password);

    if (!isValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Password is incorrect",
      });
    }

    // Delete user - cascade will handle related data
    await prisma.user.delete({
      where: { id: ctx.user.id },
    });

    return { success: true };
  }),
});
