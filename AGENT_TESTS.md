# Testes do Agente de IA

Este documento descreve os testes implementados para o sistema de webhooks do agente de IA.

## Estrutura de Testes

```
src/test/
├── mocks/
│   └── server.ts                  # MSW server setup e handlers
├── routers/
│   ├── agent.test.ts              # Testes unitários do router tRPC
│   └── agent-rate-limit.test.ts   # Testes de rate limiting e concorrência
├── webhooks/
│   ├── agent-orders.test.ts       # Testes de integração dos webhooks (DB)
│   └── agent-webhook-msw.test.ts  # Testes de webhooks com MSW (mock HTTP)
├── database.ts                    # Setup e helpers para testes
└── setup.ts                      # Vitest setup com MSW

e2e/
└── agent-webhook.spec.ts          # Testes E2E com Playwright
```

## Executando os Testes

### Testes Unitários (Vitest)

```bash
# Executar todos os testes
bun test

# Executar apenas os testes do agente
bun test src/test/routers/agent.test.ts
bun test src/test/routers/agent-rate-limit.test.ts
bun test src/test/webhooks/agent-orders.test.ts

# Executar com UI
bun test --ui
```

### Testes E2E (Playwright)

```bash
# Executar testes E2E
bunx playwright test e2e/agent-webhook.spec.ts

# Executar em modo headless
bunx playwright test e2e/agent-webhook.spec.ts --headless

# Executar com UI
bunx playwright test e2e/agent-webhook.spec.ts --ui
```

## Cobertura de Testes

### Agent Router (tRPC)

- ✅ `getConfig` - Retornar configuração atual
- ✅ `createConfig` - Criar nova configuração
- ✅ `updateConfig` - Atualizar configuração existente
- ✅ `deleteConfig` - Deletar configuração
- ✅ `getLogs` - Listar logs de interações
- ✅ `regenerateWebhookSecret` - Gerar novo webhook secret

### Webhooks

- ✅ `POST /api/webhooks/agent/orders/create` - Criar pedido via agente
- ✅ `POST /api/webhooks/agent/orders/list` - Listar pedidos do cliente
- ✅ Validação de assinatura HMAC SHA256
- ✅ Criação automática de cliente
- ✅ Cálculo de totais e itens
- ✅ Auto-confirmação de pedidos
- ✅ Logging de interações

### Rate Limiting & Performance

- ✅ Múltiplas requisições simultâneas
- ✅ Criação concorrente de logs
- ✅ Paginação de logs
- ✅ Filtragem por tipo e status

## Cenários de Teste

### Criação de Pedido

1. **Cenário Ideal**: Cliente existente, produtos válidos, assinatura correta
2. **Novo Cliente**: Criar cliente automaticamente se não existir
3. **Produto Inválido**: Rejeitar pedido se produto não existir
4. **Assinatura Inválida**: Rejeitar requisição com assinatura errada
5. **Auto-confirmar**: Confirmar pedido automaticamente quando configurado

### Listagem de Pedidos

1. **Filtro "ativo"**: Pedidos PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY
2. **Filtro "hoje"**: Pedidos criados hoje
3. **Filtro "ultimos"**: Pedidos dos últimos 7 dias
4. **Cliente Inexistente**: Retornar lista vazia

### Logs de Interação

1. **Sucesso**: Logar entrada, saída e tempo de resposta
2. **Erro**: Logar erro e stack trace
3. **Paginação**: Navegar por grandes volumes de logs
4. **Filtragem**: Buscar por tipo (ORDER_CREATE, ORDER_LIST, etc.)

## Variáveis de Ambiente para Testes

```bash
# Test Database
DATABASE_URL="postgresql://test:test@localhost:5432/food_service_test"

# Test Tenant
TEST_TENANT_ID="test-tenant-id"
TEST_WEBHOOK_SECRET="test-webhook-secret"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret"
```

## Mock de Dependências

Os testes mockam:
- NextAuth (autenticação)
- Next.js Router
- Serviços externos (WhatsApp, Telegram)

### MSW (Mock Service Worker)

Para testes de webhooks, usamos MSW para interceptar requisições HTTP:

```typescript
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// Setup MSW em src/test/setup.ts
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Usando em testes
server.use(
  http.post("http://localhost:3000/api/webhooks/agent/orders/create", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true }, { status: 201 });
  })
);
```

## CI/CD

Os testes são executados automaticamente em:
- Pull Requests
- Commits na branch main
- Releases

```yaml
# Exemplo de configuração para GitHub Actions
- name: Run Unit Tests
  run: bun test

- name: Run E2E Tests
  run: bunx playwright test
```

## Debug

Para debugar testes:

```bash
# Vitest com debug
bun test --reporter=verbose

# Playwright em modo debug
bunx playwright test --debug

# Ver logs do banco
DEBUG=prisma:* bun test
```

## Mantendo os Testes

- Sempre adicionar testes para novas funcionalidades
- Manter cobertura acima de 80%
- Atualizar testes quando modificar APIs
- Usar dados de teste realistas
