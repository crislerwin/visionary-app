import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { auth } from "@/auth";
import { getTenantContext } from "@/server/tenant-context/tenant";

export const createTRPCContext = cache(async () => {
  const session = await auth();
  const tenant = await getTenantContext();

  return {
    session,
    tenant,
    user: session?.user ?? null,
  };
});

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
      tenant: ctx.tenant,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

const enforceTenantContext = t.middleware(({ ctx, next }) => {
  if (!ctx.tenant) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tenant context required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      tenant: ctx.tenant,
    } as { session: typeof ctx.session; user: typeof ctx.user; tenant: NonNullable<typeof ctx.tenant> },
  });
});

export const tenantProcedure = protectedProcedure.use(enforceTenantContext);
