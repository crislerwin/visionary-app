# Histórico de Caixa com DataTable Reutilizável

**PR:** [#46](https://github.com/crislerwin/food-service/pull/46) (completa #45)  
**Data:** 26/04/2026  
**Autor:** Crisler Wintler

---

## 📋 Descrição

Sistema de histórico completo de caixa com visualização em DataTable reutilizável. Permite visualizar todas as movimentações de caixa com filtros, ordenação e exportação.

## 🎯 Objetivo

- Histórico completo de operações de caixa
- DataTable genérica reutilizável em outras telas
- Filtros avançados (data, tipo, valor)
- Exportação para CSV/Excel
- Paginação server-side

## 📝 Arquivos Modificados/Adicionados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/ui/data-table.tsx` | Novo | Componente DataTable genérico |
| `src/components/ui/data-table-pagination.tsx` | Novo | Paginação do DataTable |
| `src/components/ui/data-table-toolbar.tsx` | Novo | Toolbar com filtros |
| `src/app/dashboard/cash-register/history/page.tsx` | Novo | Página de histórico |
| `src/app/dashboard/cash-register/history/columns.tsx` | Novo | Definição de colunas do caixa |
| `src/server/routers/cash-register.ts` | Modificado | Queries paginadas e filtros |
| `src/components/cash-register/transaction-row.tsx` | Novo | Linha de transação customizada |

## 🎨 DataTable Reutilizável

### Uso

```tsx
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';

<DataTable
  columns={columns}
  data={transactions}
  pageCount={pageCount}
  filterableColumns={['type', 'date']}
  searchableColumns={['description']}
/>
```

### Features

- ✅ Ordenação por coluna
- ✅ Filtros por coluna
- ✅ Busca global
- ✅ Paginação
- ✅ Seleção de linhas
- ✅ Ações em lote
- ✅ Exportação CSV
- ✅ Loading skeleton
- ✅ Responsivo

## 📊 Colunas do Histórico de Caixa

| Coluna | Tipo | Ordenável | Filtrável |
|--------|------|-----------|-----------|
| Data | Date | ✅ | ✅ (range) |
| Tipo | Enum | ✅ | ✅ |
| Descrição | Text | ✅ | ✅ (busca) |
| Valor | Currency | ✅ | ✅ (range) |
| Usuário | Text | ✅ | ✅ |
| Saldo | Currency | ✅ | ❌ |

## 🔧 Como Usar

### Acessar Histórico

1. Dashboard > Caixa > Histórico
2. Veja lista de todas as movimentações
3. Use filtros para refinar a busca
4. Clique em exportar para CSV

### Filtros Disponíveis

- **Data:** Seletor de range (hoje, semana, mês, custom)
- **Tipo:** Entrada, Saída, Ajuste
- **Valor:** Range mínimo/máximo
- **Busca:** Descrição ou usuário

## 💡 Notas Técnicas

### API (tRPC)

```typescript
// src/server/routers/cash-register.ts
.getMany: protectedProcedure
  .input(z.object({
    page: z.number().default(1),
    limit: z.number().default(10),
    sort: z.object({ column: z.string(), direction: z.enum(['asc', 'desc']) }),
    filters: z.object({
      type: z.enum(['INCOME', 'EXPENSE', 'ADJUSTMENT']).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
    }),
  }))
  .query(async ({ ctx, input }) => {
    // Retorna { items, pageCount, total }
  })
```

### Componente DataTable

- Usa `@tanstack/react-table` como base
- Headless UI (sem estilos forçados)
- Integração com shadcn/ui
- Suporte a server-side e client-side
- Memoização de dados para performance

## 🧪 Testes

```bash
# Testar paginação
# Testar filtros
# Testar ordenação
npm run test
```

## 📱 UX

- Filtros em toolbar sticky
- Ordenação com indicador visual
- Hover nas linhas para destaque
- Responsivo: colunas menos importantes escondem em mobile
- Estado salvo na URL (shareable)
