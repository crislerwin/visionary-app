import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer();

export function mockWebhookEndpoints(baseUrl = "http://localhost:3000") {
  server.use(
    http.post(`${baseUrl}/api/webhooks/agent/orders/create`, async ({ request }) => {
      const signature = request.headers.get("x-webhook-signature");
      const body = (await request.json()) as { tenantId: string; items: unknown[] };

      // Mock validation
      if (!signature || signature === "invalid-signature") {
        return HttpResponse.json(
          { success: false, message: "Assinatura do webhook inválida" },
          { status: 401 },
        );
      }

      if (!body.items || body.items.length === 0) {
        return HttpResponse.json(
          { success: false, message: "Nenhum item no pedido" },
          { status: 400 },
        );
      }

      return HttpResponse.json(
        {
          success: true,
          draftOrder: {
            id: "mock-order-id",
            items: body.items,
            subtotal: 67.7,
            total: 67.7,
          },
          message: "Rascunho criado! Pedido #123 - Total: R$ 67,70. Confirme para prosseguir.",
        },
        { status: 201 },
      );
    }),

    http.post(`${baseUrl}/api/webhooks/agent/orders/list`, async ({ request }) => {
      const signature = request.headers.get("x-webhook-signature");
      const _body = (await request.json()) as { tenantId: string; filter?: string };

      if (!signature) {
        return HttpResponse.json(
          { success: false, message: "Assinatura do webhook inválida" },
          { status: 401 },
        );
      }

      const orders = [
        {
          id: "order-1",
          orderNumber: 1,
          status: "PREPARING",
          total: 25.9,
          createdAt: new Date().toISOString(),
          items: [{ productName: "X-Burger", quantity: 1 }],
        },
      ];

      return HttpResponse.json({
        success: true,
        orders,
        message: `Encontrei ${orders.length} pedido(s):\nPedido #1 - 👨‍🍳 Em preparo - R$ 25,90`,
      });
    }),
  );
}
