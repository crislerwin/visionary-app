# 🔌 Referência da API — tRPC Routers

Documentação completa dos routers tRPC disponíveis no `meu-rango`. Todos os endpoints são type-safe via Zod.

Merge central: `src/server/routers/_app.ts`

---

## Tabela Rápida

| Router | Arquivo | Procedimentos | Linhas |
|--------|---------|--------------|--------|
| **auth** | `auth.ts` | `getSession` | 87 |
| **category** | `category.ts` | `list`, `byId`, `bySlug`, `create`, `update`, `delete`, `reorder` | 285 |
| **cashRegister** | `cash-register.ts` | `getCurrent`, `getHistory`, `getById`, `open`, `close`, `addTransaction` | 337 |
| **menu** | `menu.ts` | `getTenantBySlug`, `getCategoriesWithProducts` | 91 |
| **order** | `order.ts` | `getOrderById`, `createOrder` | 165 |
| **product** | `product.ts` | `list`, `byId`, `create`, `update`, `delete`, `createVariant`, `updateVariant`, `deleteVariant` | 389 |
| **productImage** | `product-image.ts` | `create`, `listByProduct`, `updateSortOrder`, `delete` | 176 |
| **public** | `public.ts` | `getTenantBySlug`, `getCategoriesWithProducts`, `getProductsByTenant` | 135 |
| **team** | `team.ts` | `list`, `currentUserRole`, `invite`, `updateRole`, `remove`, `leave` | 337 |
| **tenant** | `tenant.ts` | `list`, `bySlug`, `create`, `update`, `switch` | 177 |
| **user** | `user.ts` | `updateProfile`, `updateEmail`, `deleteAccount` | 144 |

---

## auth

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `getSession` | query | Retorna sessão atual do usuário |

---

## category

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `list` | query | `{ tenantId: z.string() }` | Lista categorias do tenant |
| `byId` | query | `{ id: z.string() }` | Busca categoria por ID |
| `bySlug` | query | `{ slug: z.string() }` | Busca categoria por slug |
| `create` | mutation | `{ tenantId, name, slug?, description?, image?, sortOrder? }` | Cria nova categoria |
| `update` | mutation | `{ id, name?, slug?, description?, image?, sortOrder? }` | Atualiza categoria |
| `delete` | mutation | `{ id }` | Soft delete da categoria |
| `reorder` | mutation | `{ items: { id, sortOrder }[] }` | Reordena categorias |

---

## cashRegister

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `getCurrent` | query | `{ tenantId }` | Retorna caixa aberto atual |
| `getHistory` | query | `{ tenantId, limit?, cursor? }` | Histórico de caixas |
| `getById` | query | `{ id }` | Detalhes de um caixa |
| `open` | mutation | `{ tenantId, initialBalance }` | Abre novo caixa |
| `close` | mutation | `{ id, finalBalance }` | Fecha caixa (+ reconcilia) |
| `addTransaction` | mutation | `{ cashRegisterId, type, amount, description? }` | Adiciona transação |

---

## menu

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `getTenantBySlug` | query | `{ slug }` | Busca tenant por slug (público) |
| `getCategoriesWithProducts` | query | `{ tenantSlug }` | Categorias + produtos ativos |

---

## order

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `getOrderById` | query | `{ id, tenantId? }` | Detalhes do pedido |
| `createOrder` | mutation | `{ tenantId, customer, items, paymentMethod, total }` | Cria novo pedido |

**Status de pedido:** `PENDING` → `PAID` → `PREPARING` → `READY` → `DELIVERED` → `CANCELLED`

**Tipos:** `DINE_IN`, `TAKEAWAY`, `DELIVERY`

---

## product

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `list` | query | `{ tenantId, includeDeleted?, onlyActive?, search?, limit?, cursor? }` | Lista paginada |
| `byId` | query | `{ id, tenantId }` | Produto por ID |
| `create` | mutation | `{ tenantId, name, price, description?, categoryId?, isActive? }` | Cria produto |
| `update` | mutation | `{ id, name?, price?, description?, categoryId?, isActive? }` | Atualiza produto |
| `delete` | mutation | `{ id, tenantId }` | Soft delete |
| `createVariant` | mutation | `{ tenantId, productId, name, price, stock?, isActive? }` | Nova variante |
| `updateVariant` | mutation | `{ tenantId, variantId, name?, price?, stock?, isActive? }` | Atualiza variante |
| `deleteVariant` | mutation | `{ tenantId, variantId }` | Remove variante |

---

## productImage

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `create` | mutation | `{ productId, filename, contentType, size, mimeType, width?, height?, sortOrder? }` | Cria registro + retorna URL presigned |
| `listByProduct` | query | `{ productId }` | Lista imagens do produto |
| `updateSortOrder` | mutation | `{ id, sortOrder }` | Reordena imagens |
| `delete` | mutation | `{ id }` | Deleta do S3 + banco |

---

## public

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `getTenantBySlug` | query | `{ slug }` | Dados públicos do tenant |
| `getCategoriesWithProducts` | query | `{ tenantSlug }` | Catálogo público |
| `getProductsByTenant` | query | `{ tenantSlug, categorySlug? }` | Produtos por tenant/categoria |

---

## team

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `list` | query | `{ tenantId }` | Membros do tenant |
| `currentUserRole` | query | `{ tenantId }` | Papel do usuário logado |
| `invite` | mutation | `{ tenantId, email, name?, role? }` | Convida novo membro |
| `updateRole` | mutation | `{ tenantId, userId, role }` | Altera papel |
| `remove` | mutation | `{ tenantId, userId }` | Remove membro |
| `leave` | mutation | `{ tenantId }` | Sai do tenant |

---

## tenant

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `list` | query | — | Tenants do usuário logado |
| `bySlug` | query | `{ slug }` | Tenant por slug |
| `create` | mutation | `{ name, slug, description? }` | Cria tenant |
| `update` | mutation | `{ id, name?, slug?, description? }` | Atualiza tenant |
| `switch` | mutation | `{ slug }` | Muda tenant ativo |

---

## user

| Procedure | Tipo | Input (Zod) | Descrição |
|-----------|------|-------------|-----------|
| `updateProfile` | mutation | `{ name?, image? }` | Atualiza perfil |
| `updateEmail` | mutation | `{ email }` | Muda email |
| `deleteAccount` | mutation | `{ password }` | Deleta conta |

---

## Middleware Base

### Context Builder (`src/lib/trpc/trpc.ts`)

```typescript
// publicProcedure — sem autenticação
// protectedProcedure — exige sessão válida
// tenantProcedure — sessão + membership no tenant
```

### Middleware de Tenancy (`src/server/tenant-context/`)

- Valida que `tenantId` pertence ao usuário atual
- Injeta `tenant` no contexto das queries

---

*Gerado em: 2025-04-26*
