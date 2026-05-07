# 🏗️ Arquitetura do Food Service

Documento de decisões arquiteturais, estrutura de camadas e fluxos principais do sistema.

---

## 1. Visão Geral

O **food-service** é uma aplicação SaaS multi-tenant para gestão de restaurantes, construída com a stack moderna da Vercel: Next.js App Router, tRPC, Prisma e Tailwind CSS.

### Modelo de Domínio

```
┌─────────────────────────────────────────────────────────────┐
│                      TENANT (Restaurante)                      │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Categorias│  │ Produtos │  │  Caixa   │  │   Pedidos    │ │
│  │  (images)│  │(variants│  │(register│  │  (orders)    │ │
│  │          │  │  images)│  │transact) │  │              │ │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Equipe (Team) — Owner / Admin / Member / Viewer       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stack & Decisões

| Camada | Tecnologia Escolhida | Porquê |
|--------|---------------------|--------|
| **Framework** | Next.js 15 (App Router) | SSR, SPA híbrido, roteamento inteligente |
| **API** | tRPC 11 | Type-safe de ponta a ponta, integrado com React Query |
| **DB ORM** | Prisma 6+ | Schema centralizado, migrações, type-safe queries |
| **DB** | PostgreSQL | ACID, JSONB, Row-Level Security (futuro) |
| **Cache** | Redis | Sessões NextAuth, cache de queries |
| **Auth** | Auth.js (NextAuth v5) | Credentials + OAuth, compatível com App Router |
| **Upload** | AWS S3 + Presigned URLs | Upload direto do client, sem sobrecarga no servidor |
| **Estilos** | Tailwind CSS 4 + shadcn/ui | Atomic CSS, theming via CSS vars, acessível |
| **Estado** | Zustand | Mínimo, sem provider hell |
| **Testes** | Vitest + Playwright | Unit + E2E cobrindo toda a pilha |
| **Qualidade** | Biome | Bundled lint + format, zero config, rápido |

### Por que App Router em vez de Pages Router?

- **Server Components** por padrão = menos JS no client
- **Paralel + Intercepting Routes** para modais e drawers
- **Route Groups** `(dashboard)` para layouts compartilhados sem afetar a URL
- **tRPC App Router Handler** em `src/app/api/trpc/[trpc]/route.ts`

### Por que tRPC em vez de REST/GraphQL?

- Type inference automática do schema Zod → TypeScript
- Não há API documentation manual (o type system serve como spec)
- Integração nativa com React Query (caching, refetch, optimistic updates)
- Batch de queries e mutations automático

---

## 3. Estrutura de Diretórios (Lógica)

```
src/
├── app/                        # Next.js — roteamento + UI
│   ├── (dashboard)/            # GRUPO: layout sidebar + header
│   │   ├── cash-register/
│   │   ├── categories/
│   │   └── products/
│   ├── checkout/               # Público — fluxo de venda
│   ├── menu/[tenantSlug]/      # Público — catálogo por restaurante
│   ├── sign-in/                # Auth — login
│   └── api/                    # API routes
│       ├── auth/[...nextauth]/  # NextAuth callback
│       ├── trpc/[trpc]/         # tRPC HTTP handler
│       └── upload/              # Presigned URL para S3
│
├── components/
│   ├── ui/                      # shadcn/ui (Button, Dialog, Table...)
│   ├── layout/                  # Sidebar, Header, PageContainer
│   ├── product/                 # ProductCard, ProductForm, ImageCropper
│   ├── menu/                    # MenuItemCard, MenuHeader
│   └── auth/                    # SignInForm, OAuthButtons
│
├── lib/                         # Configuração e utilitários
│   ├── trpc/
│   │   ├── trpc.ts             # Context builder + procedures
│   │   ├── react.ts            # Client tRPC (hooks)
│   │   └── server.ts           # Server caller utility
│   └── storage/
│       └── s3.ts               # Client S3 + presigner
│
├── server/                      # Lógica do lado do servidor
│   ├── routers/                 # 11 routers tRPC
│   │   ├── _app.ts             # Merge de todos os routers
│   │   ├── auth.ts
│   │   ├── category.ts
│   │   ├── product.ts
│   │   ├── product-image.ts
│   │   ├── order.ts
│   │   ├── cash-register.ts
│   │   ├── tenant.ts
│   │   ├── team.ts
│   │   ├── user.ts
│   │   ├── menu.ts
│   │   └── public.ts
│   └── tenant-context/
│       └── index.ts            # Middleware de validação de tenant
│
├── hooks/                       # Custom React hooks
│   ├── use-current-tenant.ts
│   └── use-mobile.ts
│
├── stores/                       # Zustand stores
│   └── tenant-store.ts
│
├── types/                        # Tipos globais
│   ├── database.ts              # Tipos Prisma
│   └── navigation.ts            # Ítens de navegação
│
└── config/                       # Configurações centralizadas
    ├── constants.ts
    └── navigation.tsx            # Itens da sidebar
```

---

## 4. Camadas de Segurança

### 4.1 Auth (NextAuth v5)

```
Browser ──▶ Credentials / OAuth ──▶ NextAuth JWT ──▶ Session Cookie
                    │
                    └──▶ tRPC Context (req.headers.cookie)
                           └──▶ getSession() ──▶ {userId, email, ...}
```

### 4.2 Multi-tenancy

```
Browser ──▶ Tenant Slug (ou Tenant ID)
                    │
                    └──▶ tRPC Middleware
                           └──▶ Valida membership
                                  └──▶ Aplica tenantScope nas queries
```

### 4.3 ACL (Access Control)

| Ação | Owner | Admin | Member | Viewer |
|------|-------|-------|--------|--------|
| Gerenciar tenants | ✅ | ❌ | ❌ | ❌ |
| Criar/editar produtos | ✅ | ✅ | ✅ | ❌ |
| Editar categorias | ✅ | ✅ | ✅ | ❌ |
| Abrir/fechar caixa | ✅ | ✅ | ❌ | ❌ |
| Ver relatórios | ✅ | ✅ | ❌ | ❌ |
| Ver cardápio | ✅ | ✅ | ✅ | ✅ |
| Fazer pedido | ✅ | ✅ | ✅ | ✅ |

---

## 5. Fluxos Principais

### 5.1 Checkout (Público → Pedido)

```
[Cliente] ──▶ /menu/:tenantSlug ──▶ Adiciona produtos
    │
    └──▶ /checkout?tenantSlug=> ──▶ Preenche dados + seleciona pagamento
              │
              └──▶ order.createOrder (tRPC)
                        │
                        └──▶ Prisma: create Order + OrderItems
                                  │
                                  └──▶ Retorna ID do pedido
                                            │
                                            └──▶ /checkout/success?id=>
```

### 5.2 Upload de Imagem

```
[Usuário] ──▶ Seleciona arquivo ──▶ Preview local (URL.createObjectURL)
    │
    └──▶ Recorte (react-cropper) ──▶ Confirma
              │
              └──▶ Comprime (browser-image-compression)
                        │
                        └──▶ productImage.create (tRPC)
                                  │
                                  └──▶ Gera presigned URL (S3)
                                            │
                                            └──▶ Upload direto para AWS S3
                                                      │
                                                      └──▶ Salva URL no banco
```

### 5.3 Gestão de Caixa

```
[Owner/Admin] ──▶ cashRegister.open
    │
    └──▶ Caixa aberto (status: OPEN)
              │
              ├──▶ order.createOrder ──▶ cashRegister.addTransaction
              │
              └──▶ Sangria/Suprimento ──▶ cashRegister.addTransaction
                        │
                        └──▶ cashRegister.close
                                  │
                                  └──▶ Caixa fechado (status: CLOSED)
```

---

## 6. Decisões de Schema (Prisma)

### Políticas principais:

1. **Soft delete** via `deletedAt` em `Product` (não deletar fisicamente)
2. **Status workflows:** `OrderStatus`, `CashRegisterStatus`, `MemberRole` como enums
3. **Self-referência:** Não há (mantido simples)
4. **JSONB usado para:** Configurações dinâmicas (nenhum no momento)
5. **Índices:** Uniques em `(tenantId, slug)` para SEO e lookup rápido

---

## 7. Performance Considerações

| Estratégia | Implementação |
|------------|---------------|
| **SSR** | Next.js Server Components render no Edge/Vercel |
| **ISR** | Não usado (dados são específicos por tenant/sessão) |
| **Image Optimization** | `<Image>` do Next.js + S3 presigned |
| **Font Caching** | localFont com `display: swap` |
| **Query Caching** | React Query (TanStack Query) com staleTime padrão |

---

## 8. Escalamento Futuro

| Feature | Abordagem Sugerida |
|---------|-------------------|
| **Pagamentos Online** | Stripe / MercadoPago — rotação via `paymentMethod` enum |
| **Notificações Push** | Firebase Cloud Messaging — integrar com `Order` hooks |
| **Relatórios Avançados** | Dados pré-agregados em tabela `AnalyticsDaily` |
| **Multi-local** | Branch model: `Tenant` → `Location` (um-para-muitos) |
| **Delivery** | Integração com Google Maps API + campos de endereço |

---

## 9. Referências

- [Next.js Docs](https://nextjs.org/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Prisma Docs](https://prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Auth.js](https://authjs.dev/getting-started)
- [AGENTS.md](./AGENTS.md) — Guidelines para IA
- [ROUTERS.md](./ROUTERS.md) — Referência da API
