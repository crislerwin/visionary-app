// src/lib/rate-limit.ts
// Rate limiting in-memory simples para single-node deployments.
// Para multi-node, migrar para Redis (ex: ioredis + sliding window).

import { TRPCError } from "@trpc/server";

export interface RateLimitConfig {
  /** Maximo de requests permitidos na janela */
  maxRequests: number;
  /** Janela de tempo em milissegundos */
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** Rate limiter baseado em Map com cleanup automatico */
export class SimpleRateLimiter {
  private store = new Map<string, RateLimitEntry>();

  constructor(cleanupIntervalMs = 5 * 60 * 1000) {
    // Limpa entradas expiradas a cada 5 minutos
    setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /**
   * Verifica se a requisicao e permitida para a chave dada.
   * Incrementa o contador automaticamente.
   */
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      // Primeira requisicao ou janela expirou — reinicia
      this.store.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }

    if (entry.count >= config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key of Array.from(this.store.keys())) {
      const entry = this.store.get(key);
      if (entry && now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

/** Singleton global — preservado entre hot reloads do Next.js dev */
export const globalRateLimiter =
  (globalThis as unknown as { __rateLimiter?: SimpleRateLimiter }).__rateLimiter ??
  new SimpleRateLimiter();
(globalThis as unknown as { __rateLimiter?: SimpleRateLimiter }).__rateLimiter = globalRateLimiter;

/** Extrai IP real do cliente dos headers (funciona com/sem proxy) */
export function getClientIP(headers?: Headers): string {
  const forwarded = headers?.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers?.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/** Configuracoes de rate limit por categoria de rota */
export const rateLimitConfigs = {
  /** Rotas publicas generosas (listagens, buscas) */
  public: { maxRequests: 120, windowMs: 60_000 },
  /** Rotas de escrita publica (pedidos, leads) */
  publicWrite: { maxRequests: 30, windowMs: 60_000 },
  /** Rotas de autenticacao (registro, login, convites) */
  auth: { maxRequests: 10, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>;

/** Seleciona config baseada no path tRPC */
export function getRateLimitConfig(path: string): RateLimitConfig {
  if (
    path.startsWith("auth.register") ||
    path.startsWith("auth.signUp") ||
    path.startsWith("auth.acceptInvite")
  ) {
    return rateLimitConfigs.auth;
  }
  if (path.startsWith("order.createOrder") || path.startsWith("lead.create")) {
    return rateLimitConfigs.publicWrite;
  }
  return rateLimitConfigs.public;
}

/** Factory de middleware tRPC para rate limiting */
export function createRateLimitMiddleware(rateLimiter: SimpleRateLimiter) {
  return async function rateLimitMiddleware({
    path,
    ctx,
    next,
  }: {
    path: string;
    ctx: { headers?: Headers };
    next: () => Promise<unknown>;
  }): Promise<unknown> {
    const ip = getClientIP(ctx.headers);
    const key = `${ip}:${path}`;
    const config = getRateLimitConfig(path);

    if (!rateLimiter.isAllowed(key, config)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later.",
      });
    }

    return next();
  };
}
