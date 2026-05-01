import { prisma } from "@/lib/db";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc/trpc";
import type { PrismaClient } from "@prisma/client";
import { MemberRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

function generateTenantSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function uniqueSlug(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug || "meu-negocio";
  let counter = 0;

  while (true) {
    const existing = await tx.tenant.findUnique({ where: { slug } });
    if (!existing) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`.slice(0, 50);
  }
}

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        email: z.string().email(),
        password: z.string().min(8).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
      });

      if (!user || !user.password) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const isValid = await bcrypt.compare(input.currentPassword, user.password);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return { success: true };
    }),

  // Signup público - define senha do usuário e vincula ao tenant existente
  signUp: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        email: z.string().email(),
        password: z.string().min(8).max(100),
        tenantName: z.string().min(2).max(50).optional(),
        tenantSlug: z
          .string()
          .min(2)
          .max(50)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
        include: {
          memberships: {
            include: { tenant: { select: { id: true, name: true, slug: true } } },
            take: 1,
          },
        },
      });

      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Usuário já existe — atualiza nome/senha e retorna o tenant vinculado
      if (existingUser) {
        const user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: input.name,
            password: hashedPassword,
          },
        });

        const existingTenant = existingUser.memberships[0]?.tenant;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId: existingTenant?.id ?? null,
          tenantName: existingTenant?.name ?? null,
          existingUser: true,
        };
      }

      // Usuário novo — cria usuário + tenant próprio (novo estabelecimento)
      if (input.tenantSlug) {
        const existingTenant = await prisma.tenant.findUnique({
          where: { slug: input.tenantSlug },
        });
        if (existingTenant) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Tenant slug already taken",
          });
        }
      }

      const createTenantName = input.tenantName || input.name;
      const createTenantSlug = input.tenantSlug || generateTenantSlug(input.name);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            password: hashedPassword,
          },
        });

        const tenant = await tx.tenant.create({
          data: {
            name: createTenantName,
            slug: await uniqueSlug(tx, createTenantSlug),
            ownerId: user.id,
          },
        });

        await tx.membership.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            role: MemberRole.OWNER,
            joinedAt: new Date(),
          },
        });

        return { user, tenant };
      });

      return {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
        existingUser: false,
      };
    }),

  // Verifica se convite é válido
  checkInvite: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const invite = await prisma.invite.findUnique({
      where: { token: input.token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invite) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite not found",
      });
    }

    if (invite.expiresAt < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invite expired",
      });
    }

    if (invite.acceptedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invite already accepted",
      });
    }

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      tenant: invite.tenant,
    };
  }),

  // Aceita convite e cria conta
  acceptInvite: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(2).max(50),
        password: z.string().min(8).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const invite = await prisma.invite.findUnique({
        where: { token: input.token },
        include: { tenant: true },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      if (invite.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite expired",
        });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite already accepted",
        });
      }

      // Verifica se email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: invite.email },
      });

      if (existingUser) {
        // Se usuário existe (ex: aprovado via lead), atualiza senha e associa ao tenant
        const hashedPassword = await bcrypt.hash(input.password, 10);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { name: input.name, password: hashedPassword },
          });

          await tx.membership.upsert({
            where: {
              userId_tenantId: {
                userId: existingUser.id,
                tenantId: invite.tenantId,
              },
            },
            update: { role: invite.role },
            create: {
              userId: existingUser.id,
              tenantId: invite.tenantId,
              role: invite.role,
              joinedAt: new Date(),
            },
          });

          await tx.invite.update({
            where: { id: invite.id },
            data: { acceptedAt: new Date(), expiresAt: new Date() },
          });
        });

        return {
          userId: existingUser.id,
          tenantId: invite.tenantId,
          existingUser: true,
        };
      }

      // Cria novo usuário
      const hashedPassword = await bcrypt.hash(input.password, 10);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: input.name,
            email: invite.email,
            password: hashedPassword,
          },
        });

        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            tenantId: invite.tenantId,
            role: invite.role,
            joinedAt: new Date(),
          },
        });

        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });

        return { user, membership };
      });

      return {
        userId: result.user.id,
        tenantId: invite.tenantId,
        existingUser: false,
      };
    }),
});
