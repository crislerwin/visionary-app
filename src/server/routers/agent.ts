import crypto from "node:crypto";

import { prisma } from "@/lib/db";
import { adminProcedure, router, tenantProcedure } from "@/lib/trpc/trpc";
import { AgentTone } from "@/types/agent";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const workingHoursSlotSchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
});

const workingHoursSchema = z.object({
  monday: z.array(workingHoursSlotSchema).optional(),
  tuesday: z.array(workingHoursSlotSchema).optional(),
  wednesday: z.array(workingHoursSlotSchema).optional(),
  thursday: z.array(workingHoursSlotSchema).optional(),
  friday: z.array(workingHoursSlotSchema).optional(),
  saturday: z.array(workingHoursSlotSchema).optional(),
  sunday: z.array(workingHoursSlotSchema).optional(),
});

const createAgentConfigSchema = z.object({
  promptSystem: z.string().min(1, "System prompt is required"),
  welcomeMessage: z.string().optional().nullable(),
  tone: z.nativeEnum(AgentTone).default(AgentTone.FRIENDLY),
  autoConfirm: z.boolean().default(false),
  workingHours: workingHoursSchema.optional().nullable(),
});

const updateAgentConfigSchema = z.object({
  promptSystem: z.string().min(1).optional(),
  welcomeMessage: z.string().optional().nullable(),
  tone: z.nativeEnum(AgentTone).optional(),
  autoConfirm: z.boolean().optional(),
  workingHours: workingHoursSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  webhookSecret: z.string().optional().nullable(),
});

export const agentRouter = router({
  // Get current agent config for tenant
  getConfig: tenantProcedure.query(async ({ ctx }) => {
    const config = await prisma.agentConfig.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    // Return null instead of throwing error when config doesn't exist
    if (!config) {
      return { config: null };
    }

    return {
      config: {
        id: config.id,
        tenantId: config.tenantId,
        promptSystem: config.promptSystem,
        welcomeMessage: config.welcomeMessage,
        tone: config.tone,
        autoConfirm: config.autoConfirm,
        workingHours: config.workingHours as Record<string, unknown> | null,
        isActive: config.isActive,
        webhookSecret: config.webhookSecret,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
    };
  }),

  // Create agent config for tenant
  createConfig: adminProcedure.input(createAgentConfigSchema).mutation(async ({ ctx, input }) => {
    const existing = await prisma.agentConfig.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Agent config already exists for this tenant",
      });
    }

    // Generate webhook secret on creation
    const webhookSecret = crypto.randomBytes(32).toString("hex");

    const config = await prisma.agentConfig.create({
      data: {
        tenantId: ctx.tenantId!,
        promptSystem: input.promptSystem,
        welcomeMessage: input.welcomeMessage ?? null,
        tone: input.tone as "FRIENDLY" | "PROFESSIONAL" | "CASUAL" | "FORMAL",
        autoConfirm: input.autoConfirm,
        workingHours: input.workingHours
          ? (input.workingHours as Prisma.InputJsonValue)
          : undefined,
        webhookSecret,
      },
    });

    return {
      success: true,
      config: {
        id: config.id,
        tenantId: config.tenantId,
        promptSystem: config.promptSystem,
        welcomeMessage: config.welcomeMessage,
        tone: config.tone,
        autoConfirm: config.autoConfirm,
        workingHours: config.workingHours as Record<string, unknown> | null,
        isActive: config.isActive,
        webhookSecret: config.webhookSecret,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
    };
  }),

  // Update agent config for tenant
  updateConfig: adminProcedure.input(updateAgentConfigSchema).mutation(async ({ ctx, input }) => {
    const config = await prisma.agentConfig.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!config) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent config not found. Please create one first.",
      });
    }

    const updated = await prisma.agentConfig.update({
      where: { tenantId: ctx.tenantId },
      data: {
        ...(input.promptSystem !== undefined && {
          promptSystem: input.promptSystem,
        }),
        ...(input.welcomeMessage !== undefined && {
          welcomeMessage: input.welcomeMessage,
        }),
        ...(input.tone !== undefined && {
          tone: input.tone as "FRIENDLY" | "PROFESSIONAL" | "CASUAL" | "FORMAL",
        }),
        ...(input.autoConfirm !== undefined && {
          autoConfirm: input.autoConfirm,
        }),
        ...(input.workingHours !== undefined && {
          workingHours:
            input.workingHours === null
              ? Prisma.DbNull
              : (input.workingHours as Prisma.InputJsonValue),
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.webhookSecret !== undefined && {
          webhookSecret: input.webhookSecret,
        }),
      },
    });

    return {
      success: true,
      config: {
        id: updated.id,
        tenantId: updated.tenantId,
        promptSystem: updated.promptSystem,
        welcomeMessage: updated.welcomeMessage,
        tone: updated.tone,
        autoConfirm: updated.autoConfirm,
        workingHours: updated.workingHours as Record<string, unknown> | null,
        isActive: updated.isActive,
        webhookSecret: updated.webhookSecret,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }),

  // Delete agent config
  deleteConfig: adminProcedure.mutation(async ({ ctx }) => {
    const config = await prisma.agentConfig.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!config) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent config not found",
      });
    }

    await prisma.agentConfig.delete({
      where: { tenantId: ctx.tenantId },
    });

    return { success: true };
  }),

  // Get interaction logs for tenant
  getLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        type: z
          .enum(["ORDER_CREATE", "ORDER_LIST", "CONFIG_GET", "CONFIG_UPDATE", "UNKNOWN"])
          .optional(),
        status: z.enum(["SUCCESS", "ERROR", "PENDING"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const config = await prisma.agentConfig.findUnique({
        where: { tenantId: ctx.tenantId },
      });

      if (!config) {
        return {
          logs: [],
          total: 0,
        };
      }

      const where: {
        tenantId: string;
        type?: "ORDER_CREATE" | "ORDER_LIST" | "CONFIG_GET" | "CONFIG_UPDATE" | "UNKNOWN";
        status?: "SUCCESS" | "ERROR" | "PENDING";
      } = { tenantId: ctx.tenantId! };

      if (input.type) {
        where.type = input.type;
      }
      if (input.status) {
        where.status = input.status;
      }

      const [logs, total] = await Promise.all([
        prisma.agentInteractionLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.agentInteractionLog.count({ where }),
      ]);

      return {
        logs: logs.map((log) => ({
          id: log.id,
          tenantId: log.tenantId,
          agentConfigId: log.agentConfigId,
          type: log.type,
          status: log.status,
          customerPhone: log.customerPhone,
          input: log.input,
          output: log.output,
          error: log.error,
          durationMs: log.durationMs,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        })),
        total,
      };
    }),

  // Regenerate webhook secret
  regenerateWebhookSecret: adminProcedure.mutation(async ({ ctx }) => {
    const config = await prisma.agentConfig.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!config) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent config not found",
      });
    }

    // Generate a secure random webhook secret
    const newSecret = crypto.randomBytes(32).toString("hex");

    await prisma.agentConfig.update({
      where: { tenantId: ctx.tenantId },
      data: { webhookSecret: newSecret },
    });

    return { webhookSecret: newSecret };
  }),
});
