import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createEvolutionClient } from "@/lib/evolution-api";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/evolution/instances - Listar instâncias do tenant
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const config = await prisma.agentConfig.findUnique({
      where: { tenantId },
      select: {
        id: true,
        evolutionInstanceName: true,
        evolutionInstanceId: true,
        whatsappStatus: true,
        whatsappConnectedAt: true,
        whatsappPhone: true,
      },
    });

    if (!config?.evolutionInstanceName) {
      return NextResponse.json({ instances: [] });
    }

    return NextResponse.json({
      instances: [
        {
          id: config.id,
          name: config.evolutionInstanceName,
          instanceId: config.evolutionInstanceId,
          status: config.whatsappStatus,
          phoneNumber: config.whatsappPhone,
          connectedAt: config.whatsappConnectedAt,
        },
      ],
    });
  } catch (error) {
    console.error("Error listing instances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/evolution/instances - Criar nova instância
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Instance name is required" }, { status: 400 });
    }

    // Get tenant config
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { agentConfig: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check if already has an instance
    if (tenant.agentConfig?.evolutionInstanceName) {
      return NextResponse.json(
        { error: "Tenant already has a WhatsApp instance" },
        { status: 409 },
      );
    }

    // Get Evolution API credentials from env
    const evolutionBaseUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionBaseUrl || !evolutionApiKey) {
      return NextResponse.json({ error: "Evolution API not configured" }, { status: 500 });
    }

    // Create webhook URL
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/evolution`;

    // Create instance in Evolution API
    const client = createEvolutionClient(evolutionBaseUrl, evolutionApiKey);
    const result = await client.createInstance({
      instanceName: name,
      qrcode: true,
      webhook: {
        url: webhookUrl,
        byEvents: true,
        base64: false,
      },
    });

    // Create or update agent config
    const agentConfig = await prisma.agentConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        promptSystem: "Você é um atendente de restaurante.",
        welcomeMessage: "Olá! Bem-vindo ao nosso restaurante!",
        evolutionInstanceName: name,
        evolutionInstanceId: result.instance?.instanceName || name,
        whatsappStatus: "CONNECTING",
      },
      update: {
        evolutionInstanceName: name,
        evolutionInstanceId: result.instance?.instanceName || name,
        whatsappStatus: "CONNECTING",
      },
    });

    return NextResponse.json(
      {
        success: true,
        instance: {
          id: agentConfig.id,
          name: agentConfig.evolutionInstanceName,
          status: agentConfig.whatsappStatus,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating instance:", error);
    return NextResponse.json(
      {
        error: "Failed to create instance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/evolution/instances/:name - Desconectar e remover instância
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const config = await prisma.agentConfig.findUnique({
      where: { tenantId },
      select: { evolutionInstanceName: true },
    });

    if (!config?.evolutionInstanceName) {
      return NextResponse.json({ error: "No instance found for this tenant" }, { status: 404 });
    }

    // Get Evolution API credentials
    const evolutionBaseUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (evolutionBaseUrl && evolutionApiKey) {
      try {
        const client = createEvolutionClient(evolutionBaseUrl, evolutionApiKey);
        await client.logoutInstance(config.evolutionInstanceName);
        await client.deleteInstance(config.evolutionInstanceName);
      } catch (e) {
        console.warn("Error deleting instance from Evolution API:", e);
        // Continue even if Evolution API fails
      }
    }

    // Update agent config
    await prisma.agentConfig.update({
      where: { tenantId },
      data: {
        evolutionInstanceName: null,
        evolutionInstanceId: null,
        whatsappStatus: "DISCONNECTED",
        whatsappConnectedAt: null,
        whatsappPhone: null,
        whatsappQrCode: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting instance:", error);
    return NextResponse.json({ error: "Failed to delete instance" }, { status: 500 });
  }
}
