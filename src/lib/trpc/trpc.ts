import { isBackofficeUser } from "@/lib/backoffice";
import { logger } from "@/lib/logger";
import { hasRole } from "@/lib/permissions";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { MemberRole } from "@prisma/client";
import { TRPCError, initTRPC } from "@trpc/server";
import type { Session } from "next-auth";

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
// Loga cada chamada tRPC com duração, path, tipo e usuário.
// ────────────────────────────────────────────────────────────────

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
// Wraps every tRPC procedure with an OpenTelemetry span.
// ────────────────────────────────────────────────────────────────

const telemetryMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
  const tracer = trace.getTracer("meu-rango");
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

// ─── Rate Limiting Middleware ──────────────────────────────────
// Protege rotas publicProcedure contra brute-force / spam.
// In-memory (single-node); migrar para Redis para multi-node.
// ────────────────────────────────────────────────────────────────

import { getRateLimitConfig, globalRateLimiter } from "@/lib/rate-limit";

const rateLimitMiddleware = t.middleware(async ({ path, ctx, next }) => {
  const ip =
    ctx.headers?.get("x-forwarded-for")?.split(",")[0].trim() ??
    ctx.headers?.get("x-real-ip") ??
    "unknown";
  const key = `${ip}:${path}`;
  const config = getRateLimitConfig(path);

  if (!globalRateLimiter.isAllowed(key, config)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }

  return next();
});

// ─── Base Procedures ────────────────────────────────────────────
// Todas as procedures incluem logging + telemetry por padrão.
// publicProcedure também inclui rate limiting.
// ────────────────────────────────────────────────────────────────

const baseProcedure = t.procedure.use(loggingMiddleware).use(telemetryMiddleware);

export const publicProcedure = baseProcedure.use(rateLimitMiddleware);

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

// ─── Backoffice Procedure ───────────────────────────────────────
// Apenas usuários com email do domínio reactivesoftware.com.br.
// ────────────────────────────────────────────────────────────────

export const backofficeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!isBackofficeUser(ctx.user.email)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas usuários de backoffice podem executar esta ação",
    });
  }

  return next({ ctx });
});

// ─── Tenant Procedure ───────────────────────────────────────────
// Resolve o tenantId do input (se presente) ou do contexto da sessão.
// Verifica se o usuário tem membership no tenant solicitado.
// ────────────────────────────────────────────────────────────────

export const tenantProcedure = protectedProcedure.use(async (opts) => {
  const { ctx, next } = opts;

  // 1. Tenta extrair tenantId do input (permite trocar de tenant dinamicamente)
  let tenantId: string | null = null;

  // O input pode estar disponível como unknown no middleware
  const input = (opts as unknown as { input?: Record<string, unknown> }).input;
  if (input && typeof input === "object") {
    if (typeof input.tenantId === "string") {
      tenantId = input.tenantId;
    }
  }

  // 2. Se não veio do input, usa o tenantId do contexto (sessão ativa)
  if (!tenantId) {
    tenantId = ctx.tenantId ?? null;
  }

  if (!tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No tenant selected",
    });
  }

  // 3. Verifica se o usuário é membro do tenant solicitado
  // Backoffice users podem acessar qualquer tenant sem membership
  const isBackoffice = isBackofficeUser(ctx.user.email);

  const userId = ctx.user.id ?? "";
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User ID not found in session",
    });
  }

  const { prisma } = await import("@/lib/db");
  const membership = await prisma.membership.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId,
      },
    },
  });

  if (!membership && !isBackoffice) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this tenant",
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId,
      membership: membership ?? {
        id: "backoffice",
        userId,
        tenantId,
        role: MemberRole.ADMIN,
        joinedAt: new Date(),
      },
    },
  });
});

// ─── Admin Procedure ────────────────────────────────────────────
// Requer role ADMIN ou OWNER no tenant.
// ────────────────────────────────────────────────────────────────

export const adminProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (!hasRole(ctx.membership.role, MemberRole.ADMIN)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem executar esta ação",
    });
  }

  return next({ ctx });
});

// ─── Member Procedure ───────────────────────────────────────────
// Requer role MEMBER, ADMIN ou OWNER no tenant.
// ────────────────────────────────────────────────────────────────

export const memberProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (!hasRole(ctx.membership.role, MemberRole.MEMBER)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para executar esta ação",
    });
  }

  return next({ ctx });
});

// ─── Legacy Exports (para compatibilidade) ──────────────────────
export const publicProcedureWithTelemetry = publicProcedure;
export const protectedProcedureWithTelemetry = protectedProcedure;
export const tenantProcedureWithTelemetry = tenantProcedure;
