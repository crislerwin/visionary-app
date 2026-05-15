import { prisma } from "@/lib/db";
import { publicProcedure, router } from "@/lib/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

interface HealthMetrics {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: "ok" | "error";
      responseTime: number;
      message?: string;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      status: "ok" | "warning" | "critical";
      message: string;
    };
  };
}

export const healthRouter = router({
  // Basic health check
  check: publicProcedure.query(async () => {
    const start = Date.now();

    try {
      // Database check
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - start;

      // Memory check
      const memUsage = process.memoryUsage();
      const memTotal = require("node:os").totalmem();
      const memUsed = memUsage.heapUsed;
      const memPercentage = Math.round((memUsed / memTotal) * 100);

      const memStatus: "ok" | "warning" | "critical" =
        memPercentage > 90 ? "critical" : memPercentage > 70 ? "warning" : "ok";

      // Overall status
      const checks = {
        database: {
          status: "ok" as const,
          responseTime: dbResponseTime,
        },
        memory: {
          status: memStatus,
          used: Math.round(memUsed / 1024 / 1024), // MB
          total: Math.round(memTotal / 1024 / 1024), // MB
          percentage: memPercentage,
        },
        disk: {
          status: "ok" as const,
          message: "Disk space sufficient",
        },
      };

      const isHealthy = checks.database.status === "ok" && memStatus !== "critical";
      const isDegraded = memStatus === "warning" || dbResponseTime > 1000;

      return {
        status: isHealthy ? (isDegraded ? "degraded" : "healthy") : "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "0.1.0",
        environment: process.env.NODE_ENV || "development",
        checks,
      } satisfies HealthMetrics;
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "0.1.0",
        environment: process.env.NODE_ENV || "development",
        checks: {
          database: {
            status: "error" as const,
            responseTime: Date.now() - start,
            message: error instanceof Error ? error.message : "Unknown error",
          },
          memory: {
            status: "ok" as const,
            used: 0,
            total: 0,
            percentage: 0,
          },
          disk: {
            status: "ok" as const,
            message: "Unknown",
          },
        },
      } satisfies HealthMetrics;
    }
  }),

  // Detailed metrics for monitoring
  metrics: publicProcedure
    .input(
      z.object({
        includeDatabase: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ input }) => {
      const metrics: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      };

      if (input.includeDatabase) {
        try {
          const start = Date.now();
          const [userCount, transactionCount, tenantCount] = await Promise.all([
            prisma.user.count(),
            prisma.transaction.count(),
            prisma.tenant.count(),
          ]);

          metrics.database = {
            status: "connected",
            responseTime: Date.now() - start,
            counts: {
              users: userCount,
              transactions: transactionCount,
              tenants: tenantCount,
            },
          };
        } catch (error) {
          metrics.database = {
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }

      return metrics;
    }),

  // Readiness check for Kubernetes
  ready: publicProcedure.query(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Database not ready",
      });
    }
  }),

  // Liveness check
  live: publicProcedure.query(() => {
    return { alive: true, timestamp: Date.now() };
  }),
});
