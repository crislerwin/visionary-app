# Feature: Controle de Caixa (Cash Register)

## Contexto
Sistema de gestão operacional e financeira para restaurantes. Parte do Epic 4.

## User Story
Como gerente, quero controlar entradas, saídas e fechar caixa diário para ter controle financeiro preciso do estabelecimento.

## Acceptance Criteria

### AC1: Abertura de Caixa
- Dado que não existe caixa aberto para o dia
- Quando o gerente informa o valor inicial (float)
- Então o caixa é aberto com status "aberto" e saldo igual ao valor inicial

### AC2: Registro de Entradas
- Dado que existe caixa aberto
- Quando uma venda é finalizada
- Então a entrada é registrada automaticamente com valor, forma de pagamento e hora

### AC3: Registro de Saídas (Despesas)
- Dado que existe caixa aberto
- Quando o gerente registra uma despesa informando descrição, valor e categoria
- Então a saída é registrada e subtraída do saldo do caixa

### AC4: Sangria (Retirada)
- Dado que existe caixa aberto
- Quando o gerente registra uma sangria informando valor e motivo
- Então o valor é subtraído do caixa e registrado separadamente

### AC5: Fechamento de Caixa
- Dado que existe caixa aberto
- Quando o gerente informa o valor contado no fechamento
- Então o sistema calcula:
  - Saldo esperado (inicial + entradas - saídas - sangrias)
  - Diferença (contado - esperado)
  - Gera relatório com todas movimentações
  - Fecha o caixa com status "fechado"

### AC6: Relatório Exportável
- Dado que um caixa foi fechado
- Quando o gerente solicita o relatório
- Então é gerado PDF com:
  - Resumo do dia (abertura, fechamento, diferença)
  - Lista de vendas por forma de pagamento
  - Lista de despesas/sangrias
  - Detalhamento por horário

## Edge Cases

### EC1: Tentativa de abrir caixa com outro aberto
- **Dado**: Já existe caixa aberto para o dia
- **Quando**: Gerente tenta abrir novo caixa
- **Então**: Erro "Já existe caixa aberto. Feche o caixa atual primeiro."

### EC2: Venda sem caixa aberto
- **Dado**: Não existe caixa aberto
- **Quando**: Tentativa de finalizar venda
- **Então**: Erro "Caixa fechado. Abra o caixa primeiro."

### EC3: Fechamento com diferença negativa (falta)
- **Dado**: Valor contado < valor esperado
- **Quando**: Fechamento é realizado
- **Então**: Registra diferença como "falta" e permite prosseguir

### EC4: Fechamento com diferença positiva (sobra)
- **Dado**: Valor contado > valor esperado
- **Quando**: Fechamento é realizado
- **Então**: Registra diferença como "sobra" e permite prosseguir

### EC5: Sangria maior que saldo
- **Dado**: Valor da sangria > saldo atual
- **Quando**: Tentativa de registrar sangria
- **Então**: Erro "Saldo insuficiente para sangria"

## Constraints Técnicas

- Cada tenant tem seu próprio controle de caixa independente
- Apenas um caixa aberto por tenant por vez
- Registro de quem realizou cada operação (audit trail)
- Soft delete não aplicável — registros financeiros são imutáveis
- Timezone: America/Sao_Paulo para todas as datas/horas

## Modelo de Dados (Prisma)

```prisma
model CashRegister {
  id          String   @id @default(uuid())
  tenantId    String
  openedAt    DateTime @default(now())
  closedAt    DateTime?
  openedBy    String   // userId
  closedBy    String?  // userId
  initialAmount Decimal @db.Decimal(10, 2)
  finalAmount Decimal? @db.Decimal(10, 2)
  difference  Decimal? @db.Decimal(10, 2)
  status      CashRegisterStatus @default(OPEN)
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  transactions CashRegisterTransaction[]
  
  @@index([tenantId])
  @@index([status])
}

model CashRegisterTransaction {
  id              String   @id @default(uuid())
  cashRegisterId  String
  type            TransactionType
  amount          Decimal  @db.Decimal(10, 2)
  description     String?
  category        String?  // Para despesas: "suprimentos", "manutenção", etc.
  paymentMethod   PaymentMethod? // Para entradas
  orderId         String?  // Referência ao pedido, se aplicável
  createdBy       String
  createdAt       DateTime @default(now())
  
  cashRegister    CashRegister @relation(fields: [cashRegisterId], references: [id], onDelete: Cascade)
  
  @@index([cashRegisterId])
  @@index([type])
}

enum CashRegisterStatus {
  OPEN
  CLOSED
}

enum TransactionType {
  SALE        // Entrada de venda
  EXPENSE     // Saída de despesa
  WITHDRAWAL  // Sangria
  INITIAL     // Valor de abertura
}

enum PaymentMethod {
  CASH
  CREDIT_CARD
  DEBIT_CARD
  PIX
  OTHER
}
```

## UI/UX

### Tela Principal do Caixa
- Header com:
  - Status (Aberto/Fechado)
  - Data atual
  - Operador logado
- Cards de resumo:
  - Saldo atual
  - Total entradas (hoje)
  - Total saídas (hoje)
- Ações rápidas:
  - Abrir caixa (se fechado)
  - Registrar despesa
  - Registrar sangria
  - Fechar caixa
  - Ver histórico

### Modal de Abertura
- Input: Valor inicial (R$)
- Botão: Confirmar Abertura

### Modal de Fechamento
- Display: Saldo esperado
- Input: Valor contado (R$)
- Display: Diferença calculada
- Textarea: Observações (opcional)
- Botão: Confirmar Fechamento

### Modal de Registro (Despesa/Sangria)
- Select: Tipo (Despesa/Sangria)
- Input: Valor (R$)
- Input: Descrição
- Select: Categoria (para despesas)
- Botão: Registrar

## Permissões (RBAC)

| Ação | Owner | Admin | Manager | Cashier |
|------|-------|-------|---------|---------|
| Abrir caixa | ✅ | ✅ | ✅ | ❌ |
| Fechar caixa | ✅ | ✅ | ✅ | ❌ |
| Registrar despesa | ✅ | ✅ | ✅ | ✅ |
| Registrar sangria | ✅ | ✅ | ✅ | ❌ |
| Ver relatórios | ✅ | ✅ | ✅ | ✅ |

## API Endpoints (tRPC)

```typescript
// Queries
procedure("cashRegister.getCurrent"): Get open cash register for tenant
procedure("cashRegister.getHistory"): Get paginated history of closed registers
procedure("cashRegister.getById"): Get specific register with transactions
procedure("cashRegister.getReport"): Get report data for a closed register

// Mutations
procedure("cashRegister.open"): Open new cash register
procedure("cashRegister.close"): Close current cash register
procedure("cashRegister.addTransaction"): Add expense or withdrawal
procedure("cashRegister.exportReport"): Generate PDF report
```

## Checklist de Implementação

- [ ] Migration Prisma (CashRegister, CashRegisterTransaction)
- [ ] Router tRPC com procedures
- [ ] Página principal do caixa
- [ ] Modais (abertura, fechamento, registro)
- [ ] Integração com vendas (auto-registrar entradas)
- [ ] Geração de relatório PDF
- [ ] Testes unitários
- [ ] Testes de integração
