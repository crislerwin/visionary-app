import { SpanStatusCode, trace } from "@opentelemetry/api";
import { TRPCError, initTRPC } from "@trpc/server";
import type { Session } from "next-auth";
import { logger } from "@/lib/logger";

interface CreateContextOptions {
  session?: Session | null;
  tenantId?: string | null;
  headers?: Headers;
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    tenantId: opts.tenantId,
    user: opts.session?.user ?? null,
    headers: opts.headers,
  };
};

type TRPCContext = ReturnType<typeof createTRPCContext>;

type ContextWithUser = TRPCContext & {
  session: Session;
  user: NonNullable<Session["user"]>;
};

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

// ─── Logging Middleware ─────────────────────────────────────────

const loggingMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  const userId = ctx.user?.id ?? "anonymous";

  try {
    const result = await next();
    const duration = Date.now() - start;
    logger.info(
      { path, type, userId, tenantId: ctx.tenantId ?? null, durationMs: duration, status: "ok" },
      `tRPC ${type} ${path} — ${duration}ms`,
    );
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    const trpcError = err as TRPCError;
    logger.warn(
      {
        path,
        type,
        userId,
        tenantId: ctx.tenantId ?? null,
        durationMs: duration,
        status: "error",
        code: trpcError.code,
        message: trpcError.message,
      },
      `tRPC ${type} ${path} failed — ${duration}ms`,
    );
    throw err;
  }
});

// ─── Telemetry Middleware ───────────────────────────────────────

const telemetryMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
  const tracer = trace.getTracer("visionary");
  const span = tracer.startSpan(`trpc.${type}.${path}`);

  span.setAttribute("trpc.path", path);
  span.setAttribute("trpc.type", type);
  span.setAttribute("user.id", ctx.user?.id ?? "anonymous");
  span.setAttribute("tenant.id", ctx.tenantId ?? "none");

  try {
    const result = await next();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw err;
  } finally {
    span.end();
  }
});

// ─── Base Procedures ────────────────────────────────────────────

const baseProcedure = t.procedure.use(loggingMiddleware).use(telemetryMiddleware);

export const publicProcedure = baseProcedure;

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session?.user,
    } as ContextWithUser,
  });
});

export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No tenant selected",
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
    },
  });
});
