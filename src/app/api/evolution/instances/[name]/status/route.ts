import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createEvolutionClient } from "@/lib/evolution-api";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/evolution/instances/:name/status - Verificar status da conexão
export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const { name } = params;

    // Verify instance belongs to tenant
    const config = await prisma.agentConfig.findUnique({
      where: { tenantId },
      select: { evolutionInstanceName: true, whatsappStatus: true, whatsappPhone: true },
    });

    if (!config || config.evolutionInstanceName !== name) {
      return NextResponse.json({ error: "Instance not found for this tenant" }, { status: 404 });
    }

    // Get Evolution API credentials
    const evolutionBaseUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    // If not configured, return local status
    if (!evolutionBaseUrl || !evolutionApiKey) {
      return NextResponse.json({
        status: config.whatsappStatus,
        phoneNumber: config.whatsappPhone,
        message: "Evolution API not configured",
      });
    }

    // Get status from Evolution API
    try {
      const client = createEvolutionClient(evolutionBaseUrl, evolutionApiKey);
      const result = await client.getConnectionStatus(name);

      // Map Evolution status to our enum
      const statusMap: Record<string, string> = {
        open: "CONNECTED",
        connecting: "CONNECTING",
        close: "DISCONNECTED",
      };

      const mappedStatus = statusMap[result.instance?.state] || "DISCONNECTED";

      // Update database if status changed
      if (mappedStatus !== config.whatsappStatus) {
        await prisma.agentConfig.update({
          where: { tenantId },
          data: {
            whatsappStatus: mappedStatus,
            ...(mappedStatus === "CONNECTED" && {
              whatsappConnectedAt: new Date(),
            }),
          },
        });
      }

      return NextResponse.json({
        status: mappedStatus,
        phoneNumber: config.whatsappPhone,
        reason: result.instance?.statusReason,
      });
    } catch (_e) {
      // Return local status if API fails
      return NextResponse.json({
        status: config.whatsappStatus,
        phoneNumber: config.whatsappPhone,
        error: "Failed to fetch from Evolution API",
      });
    }
  } catch (error) {
    console.error("Error getting status:", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}
