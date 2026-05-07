# 🤖 Guidelines para Agentes de IA — Meu Rango

Este documento serve como **contexto primário** para qualquer agente de IA (Claude, Claude Code, Cursor, GitHub Copilot, etc.) que colabore no projeto meu-rango. Leia antes de propor qualquer mudança.

> 🎯 **Regra de ouro:** Se você não entender como algo funciona, pergunte — nunca assuma.

---

## 1. Stack & Ambiente

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 16 | App Router (não Pages Router) |
| React | 19 | Server Components por padrão |
| TypeScript | 5.7 | Strict mode ativado |
| Tailwind CSS | 4.0 | CSS variables via shadcn/ui |
| Prisma | 6+ | ORM único, schema em `prisma/schema.prisma` |
| tRPC | 11 (rc) | APIs type-safe, via App Router handler |
| NextAuth | v5 (Auth.js) | Sessão + OAuth + credenciais |
| Zustand | 5+ | Estado global mínimo |
| Biome | 1.9+ | Lint + Format — zero Prettier/ESLint |
| Vitest | 3+ | Testes unitários |
| Playwright | 1.59+ | Testes E2E |

---

## 2. Convenções de Código

### 2.1 TypeScript (Strict)
- `strict: true` no `tsconfig.json`
- **Path alias:** `@/` → `./src/` (não use `../` além de 2 níveis)
- **NUNCA** use `@/` como import em NodeNext para arquivos `.ts` internos (use caminho relativo para compatibilidade com Bun se necessário)
- Tipos globais em `src/types/` e `src/types/*.d.ts`

### 2.2 Componentes
- Server Components por **padrão**
- `'use client'` **apenas** quando necessário:
  - Hooks (`useState`, `useEffect`)
  - Browser APIs (`localStorage`, `URL.createObjectURL`)
  - tRPC hooks (`api.*.useQuery`)
  - Event handlers interativos
- **Naming:** `PascalCase` para componentes, `kebab-case` para arquivos
- **Tamanho:** extraia qualquer coisa acima de **100 linhas** em subcomponentes

### 2.3 Estilos
- Tailwind CSS + `cn()` utility (class-variance-authority + tailwind-merge)
- Cores via CSS variables: `bg-primary`, `text-destructive`, etc.
- Variantes de componentes via `class-variance-authority` (cva)
- Responsividade: mobile-first (`sm:`, `md:`, `lg:`)

### 2.4 Biome (NÃO use Prettier/ESLint)
```bash
# Formatação automática
npm run format
# Lint + fix
npm run lint:fix
# Tudo junto
npm run check
```
- Sempre rode `npm run check` antes de commitar
- Husky roda isso no pre-push

### 2.5 Commits
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Mensagens em português ou inglês — mantenha consistência no PR
- Exemplo: `feat(categories): add image upload with cropping`

### 2.6 Comandos do Projeto (package.json)

```bash
# Desenvolvimento
npm run dev              # Next.js dev server (Turbopack)
npm run build            # Build de produção
npm run start            # Start server de produção

# Qualidade de código (Biome)
npm run lint             # Lint src/
npm run lint:fix         # Lint + auto-fix src/
npm run format           # Formatação src/
npm run check            # Lint + format + organize imports (tudo junto)
npm run type-check       # Checagem TypeScript (tsc --noEmit)

# Banco de dados (Prisma)
npm run db:generate      # Gerar Prisma client
npm run db:migrate       # Rodar migrações (interativo)
npm run db:push          # Push schema para DB (sem migração)
npm run db:studio        # Prisma Studio (UI visual)
npm run db:seed          # Popular DB com dados demo

# Docker
npm run docker:up        # docker-compose up -d
npm run docker:down      # docker-compose down
npm run docker:logs      # docker-compose logs -f

# Setup rápido ( Docker + push + seed )
npm run dev:setup        # docker:up + sleep + db:push + db:seed

# Testes
npm run test             # Vitest (modo single-run)
npm run test:watch       # Vitest (watch mode)
npm run test:ui          # Vitest com UI
npm run test:coverage    # Vitest com cobertura
npm run test:e2e         # Playwright (headless)
npm run test:e2e:ui      # Playwright com UI
npm run test:e2e:report  # Abre relatório Playwright
```

> ⚠️ **NUNCA** use `prettier` ou `eslint` neste projeto. Use apenas `biome` via `npm run check`.

---

## 3. Estrutura de Tarefas

Ao receber uma tarefa complexa, siga este fluxo:

```
1. Entender → Leia os documentos relevantes (este file, schema, router)
2. Planejar  → Use todo() para listar passos
3. Prototipar → Código mínimo funcional
4. Refinar    → Extrair components, aplicar DRY, validar types
5. Verificar  → npm run type-check && npm run lint && npm run check && npm test
6. Commitar   → git commit com mensagem convencional
7. PR         → Push e abra PR para main
```

---

## 4. Padrões Críticos do Projeto

### 4.1 Multi-tenancy (Isolamento por Restaurante)

TODO o dado é escopo de `tenantId`. A camada de API **deve** garantir isso.

```typescript
// ✅ Correto: middleware de tenancy valida o contexto
// Em src/server/tenant-context/
export const tenantProcedure = protectedProcedure
  .input(z.object({ tenantId: z.string() }))
  .use(({ ctx, input }) => {
    // valida que o usuário é membro deste tenant
  });

// ❌ Errado: deixar o frontend decidir o tenant
const data = await api.tenant.list.useQuery(); // sem validação
```

- **Tenant store:** `src/stores/tenant.ts` (Zustand) — guarda tenant atual no client
- **Tenant slug:** usado para acessar o cardápio público `/menu/:tenantSlug`

### 4.2 Autenticação

- NextAuth v5 (App Router compatível)
- Config: `src/auth.config.ts`
- Callback: `src/app/api/auth/[...nextauth]/route.ts`
- Session tipo-safe via `src/auth.ts` (augmented types)
- Middleware de proteção: `src/middleware.ts` — redireciona `/dashboard/*` para `/sign-in`

### 4.3 tRPC — APIs

- **11 routers:** `auth`, `tenant`, `team`, `user`, `category`, `product`, `productImage`, `menu`, `order`, `cashRegister`
- Merge: `src/server/routers/_app.ts`
- Context builder: `src/lib/trpc/trpc.ts`
- Client hooks: `src/lib/trpc/react.ts` (react-query)
- **Regra de ouro:** input validation via Zod em **todas** as procedures

### 4.4 Upload de Imagens

1. Usuário seleciona arquivo → preview local (`URL.createObjectURL`)
2. Criação/recorte via `react-cropper` → `ImageCropperDialog`
3. Upload para S3 (presigned URL via `productImage.create`)
4. `browser-image-compression` para reduzir antes do envio
5. O servidor retorna a URL pública da imagem

### 4.5 Pagamentos (Checkout)

- Página pública: `/checkout` com query param `?tenantSlug=`
- Criação de pedido via `order.createOrder` (tRPC)
- Suporte para pagamento presencial e digital
- Status: `PENDING` → `PAID` → `PREPARING` → `READY` → `DELIVERED`

### 4.6 Caixa (Cash Register)

- **Aberto:** `OPEN` — aceita transações
- **Fechado:** `CLOSED` — não aceita novos pedidos
- Modelos: `CashRegister`, `CashRegisterTransaction` (entrada/sangria)
- Rotas protegidas para Owner/Admin

---

## 5. Prisma Schema — Entidades Principais

```
User ─┬── Account (OAuth)
      ├── Session
      └── Membership (N tenants)
            └── Tenant ──┬── Category ── Product ── ProductImage
                         ├── ProductVariant
                         ├── Order ── OrderItem
                         ├── CashRegister ── CashRegisterTransaction
                         └── ...
```

Sempre que modificar o schema:
1. Atualize `prisma/schema.prisma`
2. Rode `npm run db:migrate` (dev) ou `npm run db:push` (rapid prototyping)
3. Regenere o cliente: `npm run db:generate`
4. Atualize os seeders se adicionou dados demo

---

## 6. Testes

### 6.1 Unitários (Vitest)
- Localizados em `src/test/routers/*.test.ts`
- Mock de Prisma via `src/test/database.ts` (in-memory / test DB)
- Rode: `npm run test`

### 6.2 E2E (Playwright)
- Autenticação automatizada: veja `src/test/auth-setup.ts`
- Login em URL separada (`/sign-in`) — o detector de login às vezes falha
- Rode: `npm run test:e2e`

---

## 7. Arquitetura Visual

```
┌──────────────────────────────────────────┐
│           Next.js App Router               │
│  ┌─────────┐ ┌─────────────────┐          │
│  │ Public  │ │  Dashboard (dash)│          │
│  │  menu   │ │  checkout        │          │
│  │       /  │ │  (protected)    │          │
│  └────┬────┘ └────────┬────────┘          │
│       │               │                     │
│  ┌────▼───────────────▼────────┐          │
│  │      tRPC HTTP Handler       │          │
│  │   (App Router API Route)     │          │
│  └────────────┬─────────────────┘          │
│               │                             │
│  ┌────────────▼─────────────────┐          │
│  │      tRPC Routers            │          │
│  │  12 routers (Zod validated)  │          │
│  └────────────┬─────────────────┘          │
│               │                             │
│  ┌────────────▼─────────────────┐          │
│  │      Prisma ORM              │          │
│  │      PostgreSQL              │          │
│  └──────────────────────────────┘          │
└──────────────────────────────────────────┘
```

---

## 8. Anti-padrões (NUNCA faça)

| ❌ Anti-padrão | ✅ Solução |
|---|---|
| `console.log` em produção | Use logger estruturado ou remova antes do PR |
| `any` no TypeScript | Sempre use tipos corretos; se necessário, explique com comentário |
| Imports circulares | Refatore para extrair tipos compartilhados |
| `use client` em toda a árvore | Use server components por padrão; isole apenas o interativo |
| Lógica de negócio no frontend | Movimentações financeiras, permissões → tRPC |
| Acesso direto ao banco sem tenancy | SEMPRE filtre por `tenantId` |
| CSS puro inline (exceto variáveis) | Use Tailwind + shadcn |
| Componente >200 linhas | Extraia subcomponentes |
| Hardcoded strings UI sem i18n | Use chaves de tradução |

---

## 9. Contato & Contexto

- **Repositório:** https://github.com/crislerwin/meu-rango
- **Stack de teste:** localhost:3000, admin@example.com/admin123
- **Boilerplate base:** MotRX (branch `main`)
- **Deploy alvo:** Vercel (Docker para produção futura)

Se você encontrar um padrão novo durante a implementação, **atualize este documento**.

---

*Última atualização: 2025-04-26*
