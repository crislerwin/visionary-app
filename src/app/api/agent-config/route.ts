import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { AgentConfig } from "@prisma/client";
import type { NextRequest } from "next/server";
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

// Use uppercase values to match Prisma enum
const agentConfigSchema = z.object({
  promptSystem: z.string().min(1, "System prompt is required"),
  welcomeMessage: z.string().optional().nullable(),
  tone: z.enum(["FRIENDLY", "PROFESSIONAL", "CASUAL", "FORMAL"]).default("FRIENDLY"),
  autoConfirm: z.boolean().default(false),
  workingHours: workingHoursSchema.optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return Response.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Check membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id!,
          tenantId,
        },
      },
    });

    if (!membership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await prisma.agentConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return Response.json({ error: "Agent config not found" }, { status: 404 });
    }

    return Response.json({
      id: config.id,
      tenantId: config.tenantId,
      promptSystem: config.promptSystem,
      welcomeMessage: config.welcomeMessage,
      tone: config.tone,
      autoConfirm: config.autoConfirm,
      workingHours: config.workingHours,
      isActive: config.isActive,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching agent config:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return Response.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Validate input
    const validation = agentConfigSchema.safeParse(body);
    if (!validation.success) {
      return Response.json({ error: validation.error.message }, { status: 400 });
    }

    // Check membership (requires ADMIN or OWNER)
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id!,
          tenantId,
        },
      },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.agentConfig.findUnique({
      where: { tenantId },
    });

    let config: AgentConfig;
    if (existing) {
      config = await prisma.agentConfig.update({
        where: { tenantId },
        data: {
          promptSystem: validation.data.promptSystem,
          welcomeMessage: validation.data.welcomeMessage,
          tone: validation.data.tone as "FRIENDLY" | "PROFESSIONAL" | "CASUAL" | "FORMAL",
          autoConfirm: validation.data.autoConfirm,
          workingHours: validation.data.workingHours
            ? (validation.data.workingHours as unknown as object)
            : undefined,
          ...(validation.data.isActive !== undefined && {
            isActive: validation.data.isActive,
          }),
        },
      });
    } else {
      config = await prisma.agentConfig.create({
        data: {
          tenantId,
          promptSystem: validation.data.promptSystem,
          welcomeMessage: validation.data.welcomeMessage,
          tone: validation.data.tone as "FRIENDLY" | "PROFESSIONAL" | "CASUAL" | "FORMAL",
          autoConfirm: validation.data.autoConfirm,
          workingHours: validation.data.workingHours
            ? (validation.data.workingHours as unknown as object)
            : undefined,
        },
      });
    }

    return Response.json({
      id: config.id,
      tenantId: config.tenantId,
      promptSystem: config.promptSystem,
      welcomeMessage: config.welcomeMessage,
      tone: config.tone,
      autoConfirm: config.autoConfirm,
      workingHours: config.workingHours,
      isActive: config.isActive,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating agent config:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return Response.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Check membership (requires OWNER)
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id!,
          tenantId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.agentConfig.deleteMany({
      where: { tenantId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting agent config:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
