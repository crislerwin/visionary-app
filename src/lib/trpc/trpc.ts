import { auth } from "@/auth";
import { isOwner } from "@/middlewares/owner-only";
import { TRPCError, initTRPC } from "@trpc/server";
import type { Session } from "next-auth";
import { cache } from "react";
import superjson from "superjson";
import { ZodError } from "zod";

export const createTRPCContext = cache(
  async (opts?: { session?: Session | null; tenantId?: string | null }) => {
    const session = opts?.session ?? (await auth());
    return { session, tenantId: (opts?.tenantId ?? undefined) as string | undefined };
  },
);

export function createTRPCInnerContext(opts?: {
  session?: Session | null;
  tenantId?: string | null;
}) {
  const session = opts?.session ?? null;
  return { session, tenantId: (opts?.tenantId ?? undefined) as string | undefined };
}

const t = initTRPC.context<ReturnType<typeof createTRPCInnerContext>>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Middleware to check if user is authenticated
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      user: ctx.session.user,
    },
  });
});

// Middleware to check if user has tenant access
const enforceUserHasTenant = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Get tenantId from session or context
  const sessionUser = ctx.session?.user as unknown as
    | { defaultTenantId?: string }
    | null
    | undefined;
  const tenantId = sessionUser?.defaultTenantId || ctx.tenantId;

  if (!tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tenant access",
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId,
      user: ctx.session?.user,
    },
  });
});

// Middleware to check if user is OWNER
const enforceUserIsOwner = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!isOwner(ctx.session.user.email)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Owner access required",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      user: ctx.session.user,
    },
  });
});

// Middleware to check if user is ADMIN or OWNER
const enforceUserIsAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const { prisma } = await import("@/lib/db");
  const membership = await prisma.membership.findFirst({
    where: {
      userId: ctx.session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
  });

  if (!membership && !isOwner(ctx.session.user.email)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      user: ctx.session.user,
    },
  });
});

export const router = t.router;
export const procedure = t.procedure;

// Re-export commonly used procedures
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const tenantProcedure = t.procedure.use(enforceUserHasTenant);
export const ownerProcedure = t.procedure.use(enforceUserIsOwner);
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);
export const backofficeProcedure = ownerProcedure;

// Helper to create caller
export const createCallerFactory = t.createCallerFactory;
