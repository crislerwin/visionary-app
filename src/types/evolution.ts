// Types for Evolution API Integration

export enum WhatsAppStatus {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  FAILED = "FAILED",
}

export interface EvolutionInstance {
  id: string;
  name: string;
  status: WhatsAppStatus;
  phoneNumber?: string | null;
  qrCode?: string | null;
  pairingCode?: string | null;
  connectedAt?: Date | null;
  disconnectedAt?: Date | null;
  lastPingAt?: Date | null;
  errorMessage?: string | null;
}

export interface WhatsAppMessage {
  id: string;
  instanceName: string;
  remoteJid: string; // Phone number with @s.whatsapp.net
  fromMe: boolean;
  messageType:
    | "conversation"
    | "imageMessage"
    | "videoMessage"
    | "audioMessage"
    | "documentMessage";
  content: string;
  mediaUrl?: string | null;
  caption?: string | null;
  timestamp: number;
  pushName?: string | null;
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      imageMessage?: {
        caption?: string;
        url?: string;
      };
      videoMessage?: {
        caption?: string;
      };
    };
    messageTimestamp: number;
    pushName?: string;
  };
}

export interface ConnectionWebhookPayload {
  event: "connection.update";
  instance: string;
  data: {
    state: "open" | "connecting" | "close";
    statusReason?: string;
    qrcode?: string;
    pairingCode?: string;
  };
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface CreateInstanceInput {
  name: string;
  token?: string;
}

export interface InstanceResponse {
  instance: EvolutionInstance;
  apiKey?: string;
}

export interface QRCodeResponse {
  base64?: string;
  pairingCode?: string;
  code?: string;
  message?: string;
}

export interface ConnectionStatusResponse {
  state: WhatsAppStatus;
  phoneNumber?: string;
  message?: string;
}
