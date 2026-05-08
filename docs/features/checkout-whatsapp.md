# Checkout com WhatsApp e Gestão de Pedidos

**PR:** [#68](https://github.com/crislerwin/meu-rango/pull/68) (completa #59)  
**Data:** 27/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Fluxo completo de checkout que permite ao cliente finalizar o pedido e enviá-lo via WhatsApp para o restaurante. Sistema de gestão de pedidos no dashboard para acompanhar e gerenciar os pedidos recebidos.

## 🎯 Objetivo

- Permitir pedidos sem necessidade de cadastro
- Integração com WhatsApp Business API
- Acompanhamento em tempo real dos pedidos
- Gestão completa do ciclo do pedido

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/app/checkout/page.tsx` | Novo | Página de checkout |
| `src/app/checkout/checkout-form.tsx` | Novo | Formulário de dados do cliente |
| `src/app/checkout/order-summary.tsx` | Novo | Resumo do pedido |
| `src/app/dashboard/orders/` | Novo | Gestão de pedidos no admin |
| `src/app/dashboard/orders/page.tsx` | Novo | Lista de pedidos |
| `src/app/dashboard/orders/[orderId]/page.tsx` | Novo | Detalhes do pedido |
| `src/components/checkout/checkout-success.tsx` | Novo | Tela de sucesso pós-pedido |
| `src/components/checkout/whatsapp-button.tsx` | Novo | Botão de envio WhatsApp |
| `src/components/orders/order-card.tsx` | Novo | Card de pedido |
| `src/components/orders/order-status-badge.tsx` | Novo | Badge de status |
| `src/server/routers/order.ts` | Novo | API de pedidos |
| `src/lib/whatsapp.ts` | Novo | Utilitários WhatsApp |
| `prisma/schema.prisma` | Modificado | Modelo Order adicionado |

## 🔄 Fluxo do Checkout

1. **Cliente adiciona itens** ao carrinho no cardápio
2. **Clica em "Finalizar Pedido"** → vai para `/checkout`
3. **Preenche dados:** nome, telefone, endereço, observações
4. **Revisa o pedido** com todos os itens e valores
5. **Clica em "Enviar via WhatsApp"** → redireciona para WhatsApp Web/App
6. **Mensagem pré-formatada** é enviada com todos os dados
7. **Pedido salvo** no banco com status PENDING
8. **Restaurante recebe** notificação e atualiza status no dashboard

## 📊 Status dos Pedidos

| Status | Descrição | Cor |
|--------|-----------|-----|
| `PENDING` | Aguardando confirmação | Amarelo |
| `CONFIRMED` | Pedido confirmado | Azul |
| `PREPARING` | Em preparação | Laranja |
| `READY` | Pronto para retirada/entrega | Verde |
| `OUT_FOR_DELIVERY` | Saiu para entrega | Roxo |
| `DELIVERED` | Entregue | Verde escuro |
| `CANCELLED` | Cancelado | Vermelho |

## 🔧 Como Usar

### Para o Cliente

1. Acesse o cardápio: `/menu/{tenantSlug}`
2. Adicione produtos ao carrinho
3. Clique em "Finalizar Pedido"
4. Preencha nome e telefone
5. Revise e clique "Enviar via WhatsApp"
6. Confirme no WhatsApp

### Para o Restaurante

1. Acesse Dashboard > Pedidos
2. Novos pedidos aparecem em "Pendentes"
3. Clique no pedido para ver detalhes
4. Atualize o status conforme progride
5. O cliente pode acompanhar via link (futuro)

## 💡 Notas Técnicas

- Pedido é salvo antes de redirecionar para WhatsApp
- Mensagem formatada inclui:
  - Nome do cliente
  - Itens do pedido com quantidade e valor
  - Valor total
  - Endereço de entrega
  - Observações
- Link de WhatsApp: `https://wa.me/{numero}?text={mensagem}`
- Websocket/SSE para atualização em tempo real (futuro)

## 🧪 Testes

```bash
# Testar fluxo E2E
npm run test:e2e

# Testar criação de pedido
npx playwright test checkout-flow.spec.ts
```

## 📱 Mensagem WhatsApp

Exemplo da mensagem enviada:
```
🍔 *NOVO PEDIDO - Meu Rango*

👤 *Cliente:* João Silva
📱 *Telefone:* (11) 99999-9999

📋 *ITENS:*
• 2x X-Burger - R$ 49,90
• 1x Refrigerante 600ml - R$ 8,00

💰 *TOTAL:* R$ 57,90

🏠 *ENDEREÇO:*
Rua Example, 123 - Apto 45
Bairro Centro - São Paulo/SP

📝 *OBS:* Sem cebola, por favor
```
