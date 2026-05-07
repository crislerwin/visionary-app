// Evolution API v2 Client
// Documentação: https://evolution-api.com

interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
}

interface CreateInstancePayload {
  instanceName: string;
  token?: string;
  qrcode?: boolean;
  webhook?: {
    url: string;
    headers?: Record<string, string>;
    byEvents?: boolean;
    base64?: boolean;
  };
}

interface InstanceResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  hash?: {
    apikey: string;
  };
}

interface QRCodeResponse {
  base64?: string;
  pairingCode?: string;
  code?: string;
  count?: number;
}

interface ConnectionStatus {
  instance: {
    instanceName: string;
    state: "open" | "connecting" | "close";
    statusReason?: string;
  };
}

interface SendTextPayload {
  number: string;
  text: string;
  options?: {
    delay?: number;
    presence?: "composing" | "recording" | "paused";
  };
}

class EvolutionAPIClient {
  private config: EvolutionConfig;

  constructor(config: EvolutionConfig) {
    this.config = config;
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        apikey: this.config.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Instance Management
  async createInstance(payload: CreateInstancePayload): Promise<InstanceResponse> {
    return this.fetch("/instance/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }) as Promise<InstanceResponse>;
  }

  async getQRCode(instanceName: string): Promise<QRCodeResponse> {
    return this.fetch(`/instance/connect/${instanceName}`, {
      method: "GET",
    }) as Promise<QRCodeResponse>;
  }

  async getConnectionStatus(instanceName: string): Promise<ConnectionStatus> {
    return this.fetch(`/instance/connectionState/${instanceName}`, {
      method: "GET",
    }) as Promise<ConnectionStatus>;
  }

  async logoutInstance(instanceName: string): Promise<void> {
    await this.fetch(`/instance/logout/${instanceName}`, {
      method: "DELETE",
    });
  }

  async deleteInstance(instanceName: string): Promise<void> {
    await this.fetch(`/instance/delete/${instanceName}`, {
      method: "DELETE",
    });
  }

  // Messaging
  async sendText(instanceName: string, payload: SendTextPayload): Promise<unknown> {
    return this.fetch(`/message/sendText/${instanceName}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async sendImage(
    instanceName: string,
    payload: {
      number: string;
      mediatype: "image";
      media: string; // base64
      caption?: string;
    },
  ): Promise<unknown> {
    return this.fetch(`/message/sendMedia/${instanceName}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Webhook Configuration
  async setWebhook(instanceName: string, webhookUrl: string, _events?: string[]): Promise<unknown> {
    return this.fetch(`/webhook/set/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          url: webhookUrl,
          byEvents: true,
          base64: false,
        },
      }),
    });
  }
}

// Factory function for tenant-specific instances
export function createEvolutionClient(baseUrl: string, apiKey: string): EvolutionAPIClient {
  return new EvolutionAPIClient({ baseUrl, apiKey });
}

// Export class
export { EvolutionAPIClient };

// Export types
export type {
  EvolutionConfig,
  CreateInstancePayload,
  InstanceResponse,
  QRCodeResponse,
  ConnectionStatus,
  SendTextPayload,
};
