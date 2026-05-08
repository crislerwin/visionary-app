import crypto from "node:crypto";
import { expect, test } from "@playwright/test";

// Helper para gerar assinatura do webhook
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

test.describe("Agent Webhooks E2E", () => {
  const tenantId = process.env.TEST_TENANT_ID || "test-tenant-id";
  const webhookSecret = process.env.TEST_WEBHOOK_SECRET || "test-webhook-secret";

  test.describe("POST /api/webhooks/agent/orders/create", () => {
    test("deve criar pedido com assinatura válida", async ({ request }) => {
      const payload = {
        tenantId,
        customerPhone: "11999998888",
        customerName: "João Teste",
        items: [
          { productName: "Pizza Calabresa", quantity: 1 },
          { productName: "Refrigerante 2L", quantity: 1 },
        ],
      };

      const signature = generateWebhookSignature(JSON.stringify(payload), webhookSecret);

      const response = await request.post("/api/webhooks/agent/orders/create", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.draftOrder).toBeDefined();
      expect(body.draftOrder.items).toHaveLength(2);
    });

    test("deve rejeitar requisição sem assinatura", async ({ request }) => {
      const payload = {
        tenantId,
        customerPhone: "11999998888",
        items: [{ productName: "Pizza Calabresa", quantity: 1 }],
      };

      const response = await request.post("/api/webhooks/agent/orders/create", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Assinatura");
    });

    test("deve rejeitar requisição com assinatura inválida", async ({ request }) => {
      const payload = {
        tenantId,
        customerPhone: "11999998888",
        items: [{ productName: "Pizza Calabresa", quantity: 1 }],
      };

      const response = await request.post("/api/webhooks/agent/orders/create", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": "assinatura-invalida",
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    test("deve rejeitar payload sem itens", async ({ request }) => {
      const payload = {
        tenantId,
        customerPhone: "11999998888",
        items: [],
      };

      const signature = generateWebhookSignature(JSON.stringify(payload), webhookSecret);

      const response = await request.post("/api/webhooks/agent/orders/create", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("item");
    });

    test("deve rejeitar payload com tenant inexistente", async ({ request }) => {
      const payload = {
        tenantId: "tenant-inexistente",
        customerPhone: "11999998888",
        items: [{ productName: "Pizza", quantity: 1 }],
      };

      const signature = generateWebhookSignature(JSON.stringify(payload), webhookSecret);

      const response = await request.post("/api/webhooks/agent/orders/create", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe("POST /api/webhooks/agent/orders/list", () => {
    test("deve listar pedidos do cliente", async ({ request }) => {
      // Primeiro cria um cliente e pedido
      const payload = {
        tenantId,
        customerPhone: "11988887777",
        customerName: "Maria Teste",
        items: [{ productName: "Pizza Calabresa", quantity: 2 }],
      };

      const signature = generateWebhookSignature(JSON.stringify(payload), webhookSecret);

      // Cria o pedido
      await request.post("/api/webhooks/agent/orders/create", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
      });

      // Agora lista os pedidos
      const listPayload = {
        tenantId,
        customerPhone: "11988887777",
        filter: "ativo",
      };

      const listSignature = generateWebhookSignature(JSON.stringify(listPayload), webhookSecret);

      const response = await request.post("/api/webhooks/agent/orders/list", {
        data: listPayload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": listSignature,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.orders).toBeDefined();
      expect(body.orders.length).toBeGreaterThan(0);
    });

    test("deve retornar lista vazia para cliente sem pedidos", async ({ request }) => {
      const payload = {
        tenantId,
        customerPhone: "11977776666", // Número novo, sem pedidos
        filter: "ativo",
      };

      const signature = generateWebhookSignature(JSON.stringify(payload), webhookSecret);

      const response = await request.post("/api/webhooks/agent/orders/list", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.orders).toEqual([]);
    });

    test("deve filtrar pedidos por período (hoje, ultimos, todos)", async ({ request }) => {
      const filters = ["hoje", "ultimos", "todos"];

      for (const filter of filters) {
        const payload = {
          tenantId,
          customerPhone: "11999998888",
          filter,
          limit: 5,
        };

        const signature = generateWebhookSignature(JSON.stringify(payload), webhookSecret);

        const response = await request.post("/api/webhooks/agent/orders/list", {
          data: payload,
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.orders)).toBe(true);
      }
    });
  });

  test.describe("Respostas do webhook", () => {
    test("deve incluir resumo amigável na mensagem", async ({ request }) => {
      const payload = {
        tenantId,
        customerPhone: "11966665555",
        customerName: "Pedro Teste",
        items: [{ productName: "Pizza Calabresa", quantity: 1 }],
      };

      const signature = generateWebhookSignature(JSON.stringify(payload), webhookSecret);

      const response = await request.post("/api/webhooks/agent/orders/create", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.message).toBeDefined();
      expect(body.message).toContain("R$");
      expect(body.draftOrder.total).toBeGreaterThan(0);
    });

    test("deve formatar valores monetários corretamente", async ({ request }) => {
      const payload = {
        tenantId,
        customerPhone: "11955554444",
        items: [
          { productName: "Pizza Calabresa", quantity: 1 },
          { productName: "Pizza Portuguesa", quantity: 1 },
        ],
      };

      const signature = generateWebhookSignature(JSON.stringify(payload), webhookSecret);

      const response = await request.post("/api/webhooks/agent/orders/create", {
        data: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.draftOrder).toBeDefined();
      expect(body.draftOrder.subtotal).toBeDefined();
      expect(body.draftOrder.total).toBeDefined();
      expect(typeof body.draftOrder.total).toBe("number");
    });
  });
});
