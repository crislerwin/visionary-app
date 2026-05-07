import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createEvolutionClient } from "@/lib/evolution-api";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/evolution/instances/:name/qrcode - Obter QR code para conectar WhatsApp
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
      select: { evolutionInstanceName: true },
    });

    if (!config || config.evolutionInstanceName !== name) {
      return NextResponse.json({ error: "Instance not found for this tenant" }, { status: 404 });
    }

    // Get Evolution API credentials
    const evolutionBaseUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionBaseUrl || !evolutionApiKey) {
      return NextResponse.json({ error: "Evolution API not configured" }, { status: 500 });
    }

    // Get QR code from Evolution API
    const client = createEvolutionClient(evolutionBaseUrl, evolutionApiKey);
    const result = await client.getQRCode(name);

    // Update status to connecting
    await prisma.agentConfig.update({
      where: { tenantId },
      data: { whatsappStatus: "CONNECTING" },
    });

    return NextResponse.json({
      success: true,
      qrCode: result.base64,
      pairingCode: result.pairingCode,
      code: result.code,
    });
  } catch (error) {
    console.error("Error getting QR code:", error);
    return NextResponse.json(
      {
        error: "Failed to get QR code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
