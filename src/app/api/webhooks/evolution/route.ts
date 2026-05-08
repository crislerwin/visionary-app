import { processMessage } from "@/lib/agent";
import { prisma } from "@/lib/db";
import { createEvolutionClient } from "@/lib/evolution-api";
import { type NextRequest, NextResponse } from "next/server";

// POST /api/webhooks/evolution - Receber webhooks da Evolution API
export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret if configured
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (webhookSecret) {
      const _signature = request.headers.get("x-webhook-signature");
      // Note: Evolution may not send signatures, this is for future-proofing
    }

    const body = await request.json();
    const { event, instance, data } = body;

    if (!event) {
      return NextResponse.json(
        { error: "Invalid webhook payload - event missing" },
        { status: 400 },
      );
    }

    // Find tenant by instance name (which is the restaurant's WhatsApp phone)
    // Instance name format can be: "restaurante-11999998888" or just the phone
    const phoneFromInstance = instance?.toString().replace(/\D/g, "") || "";

    // Try to find by instance name first, then by phone number
    const config = await prisma.agentConfig.findFirst({
      where: {
        OR: [
          { evolutionInstanceName: instance?.toString() },
          { tenant: { whatsappPhone: phoneFromInstance } },
          { whatsappPhone: phoneFromInstance },
        ],
      },
      include: { tenant: true },
    });

    if (!config) {
      console.warn(`No config found for instance: ${instance}, phone: ${phoneFromInstance}`);
      return NextResponse.json({ received: true });
    }

    const _tenantId = config.tenantId;
    const _instanceName = config.evolutionInstanceName || instance;

    // Handle different event types
    switch (event) {
      case "connection.update":
        await handleConnectionUpdate(config.tenantId, instance, data);
        break;

      case "messages.upsert":
        await handleMessageReceived(config.tenantId, instance, data);
        break;

      case "messages.update":
        // Message status update (delivered, read, etc.)
        break;

      default:
        console.log(`Unhandled event type: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle connection status updates
async function handleConnectionUpdate(
  tenantId: string,
  _instanceName: string,
  data: { state: string; statusReason?: string; qrcode?: string; pairingCode?: string },
) {
  const statusMap: Record<string, string> = {
    open: "CONNECTED",
    connecting: "CONNECTING",
    close: "DISCONNECTED",
  };

  const mappedStatus = statusMap[data.state] || "DISCONNECTED";

  await prisma.agentConfig.update({
    where: { tenantId },
    data: {
      whatsappStatus: mappedStatus,
      whatsappQrCode: data.qrcode || null,
      whatsappPairingCode: data.pairingCode || null,
      ...(mappedStatus === "CONNECTED" && {
        whatsappConnectedAt: new Date(),
      }),
      ...(mappedStatus === "DISCONNECTED" && {
        whatsappDisconnectedAt: new Date(),
      }),
    },
  });

  // Log connection event
  await prisma.agentInteractionLog.create({
    data: {
      tenantId,
      agentConfigId: (await prisma.agentConfig.findUnique({ where: { tenantId } }))!.id,
      type: "CONFIG_UPDATE",
      status: mappedStatus === "CONNECTED" ? "SUCCESS" : "ERROR",
      input: { event: "connection.update", state: data.state },
      output: { mappedStatus, reason: data.statusReason },
    },
  });
}

// Handle incoming messages
async function handleMessageReceived(
  tenantId: string,
  instanceName: string,
  data: {
    key: { remoteJid: string; fromMe: boolean };
    message?: { conversation?: string; imageMessage?: { caption?: string } };
    messageTimestamp: number;
    pushName?: string;
  },
) {
  // Ignore messages sent by us
  if (data.key.fromMe) return;

  const phoneNumber = data.key.remoteJid.replace(/@.*$/, "");
  const messageContent = data.message?.conversation || data.message?.imageMessage?.caption || "";
  const customerName = data.pushName;

  // Get agent config with tenant
  const config = await prisma.agentConfig.findUnique({
    where: { tenantId },
    include: { tenant: true },
  });

  if (!config || !config.isActive) {
    console.warn(`Agent not active for tenant: ${tenantId}`);
    return;
  }

  // Get the instance name from config for responding
  const effectiveInstanceName = config.evolutionInstanceName || instanceName;

  // Log incoming message
  const log = await prisma.agentInteractionLog.create({
    data: {
      tenantId,
      agentConfigId: config.id,
      customerPhone: phoneNumber,
      type: "ORDER_CREATE",
      status: "PENDING",
      input: {
        message: messageContent,
        phoneNumber,
        customerName,
      },
    },
  });

  // Process message with LangChain agent
  try {
    const result = await processMessage(tenantId, messageContent, phoneNumber, {
      promptSystem: config.promptSystem,
      tone: config.tone,
      isActive: config.isActive,
    });

    // Send response back via Evolution API
    await sendWhatsAppResponse(effectiveInstanceName, phoneNumber, result.response);

    // Update log
    await prisma.agentInteractionLog.update({
      where: { id: log.id },
      data: {
        status: result.error ? "ERROR" : "SUCCESS",
        output: { response: result.response, durationMs: result.durationMs },
        error: result.error,
        durationMs: result.durationMs,
      },
    });
  } catch (error) {
    console.error("Error processing message:", error);
    await prisma.agentInteractionLog.update({
      where: { id: log.id },
      data: {
        status: "ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

// Send response via Evolution API
async function sendWhatsAppResponse(instanceName: string, phoneNumber: string, text: string) {
  const evolutionBaseUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionBaseUrl || !evolutionApiKey) {
    console.error("Evolution API not configured");
    return;
  }

  try {
    const client = createEvolutionClient(evolutionBaseUrl, evolutionApiKey);
    await client.sendText(instanceName, {
      number: phoneNumber,
      text,
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}
