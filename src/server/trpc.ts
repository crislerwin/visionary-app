import { initTRPC, TRPCError } from "@trpc/server"
import type { Session } from "next-auth"

interface CreateContextOptions {
  session: Session | null
  tenantId: string | null
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    tenantId: opts.tenantId,
    user: opts.session?.user ?? null,
  }
}

type TRPCContext = ReturnType<typeof createTRPCContext>

const t = initTRPC.context<TRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  })
})

export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No tenant selected",
    })
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
    },
  })
})
