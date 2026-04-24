import { z } from "zod"
import { initTRPC, TRPCError } from "@trpc/server"
import { getTenantContext } from "@/server/tenant-context/tenant"
import { auth } from "@/auth"

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth()
  const tenant = await getTenantContext()

  return {
    session,
    tenant,
    user: session?.user,
    ...opts,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<TRPCContext>().create({
  transformer: undefined,
})

export const router = t.router
export const publicProcedure = t.procedure

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
  if (!ctx.tenant) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No tenant selected",
    })
  }

  return next({
    ctx: {
      ...ctx,
      tenant: ctx.tenant,
    },
  })
})
