# Controle de Caixa

**PR:** [#40](https://github.com/crislerwin/meu-rango/pull/40) (completa #16)  
**Data:** 25/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Sistema completo de controle de caixa para restaurantes, permitindo abertura, fechamento e movimentações financeiras.

## 🎯 Objetivo

- Controle de caixa diário
- Registro de entradas e saídas
- Fechamento com conferência
- Histórico de operações

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `prisma/schema.prisma` | Modificado | Models CashRegister e Transaction |
| `src/app/dashboard/cash-register/page.tsx` | Novo | Página principal de caixa |
| `src/app/dashboard/cash-register/open/page.tsx` | Novo | Abertura de caixa |
| `src/app/dashboard/cash-register/close/page.tsx` | Novo | Fechamento de caixa |
| `src/components/cash-register/cash-register-status.tsx` | Novo | Status atual do caixa |
| `src/components/cash-register/transaction-form.tsx` | Novo | Form de movimentação |
| `src/components/cash-register/transaction-list.tsx` | Novo | Lista de transações |
| `src/server/routers/cash-register.ts` | Novo | API de caixa |
| `specs/features/cash-register.md` | Novo | Especificação original |

## 🔄 Fluxo do Caixa

### Abertura
1. Usuário clica em "Abrir Caixa"
2. Informa valor inicial (fundo de caixa)
3. Sistema registra horário e responsável
4. Caixa fica em status OPEN

### Movimentações
- **Entrada:** Vendas, acertos
- **Saída:** Despesas, sangria
- **Ajuste:** Correções de valor

### Fechamento
1. Sistema calcula valor esperado
2. Usuário informa valor real contado
3. Diferença é calculada (positiva/negativa)
4. Registro de fechamento com observações

## 📊 Schema

```prisma
model CashRegister {
  id            String    @id @default(uuid())
  tenantId      String
  openedAt      DateTime  @default(now())
  closedAt      DateTime?
  openedBy      String
  closedBy      String?
  initialAmount Decimal   @default(0)
  finalAmount   Decimal?
  expectedAmount Decimal?
  difference    Decimal?
  status        CashRegisterStatus @default(OPEN)
  transactions  Transaction[]
}

model Transaction {
  id             String   @id @default(uuid())
  cashRegisterId String
  type           TransactionType // INCOME, EXPENSE, ADJUSTMENT
  amount         Decimal
  description    String
  createdBy      String
  createdAt      DateTime @default(now())
}
```

## 🔧 Como Usar

1. Dashboard > Caixa
2. Se não houver caixa aberto, clique "Abrir Caixa"
3. Registre movimentações em "Nova Transação"
4. Ao final do dia, clique "Fechar Caixa"

## 💡 Notas Técnicas

- Apenas um caixa aberto por vez por tenant
- Permissões: ADMIN e OWNER podem abrir/fechar
- Todos os papéis podem registrar transações
- Diferença de fechamento auditável
