# 💰 Finally — Plataforma SaaS de Gestão Financeira Integrada

Plataforma SaaS focada em gestão financeira integrada e conexão entre parceiros de negócio. Multi-tenant, com painel financeiro, conciliação, fluxo de caixa e colaboração entre empresas parceiras.

## ✨ Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Next.js 15 (App Router + Turbopack) |
| **Linguagem** | TypeScript 5.7 (strict mode) |
| **Estilos** | Tailwind CSS 4.0 + shadcn/ui |
| **Banco de Dados** | PostgreSQL 16 (Prisma ORM) |
| **Cache / Sessão** | Redis 7 |
| **APIs** | tRPC 11 — end-to-end type-safe |
| **Autenticação** | NextAuth.js v5 (Auth.js) |
| **Testes** | Vitest (unitários) |
| **Observabilidade** | OpenTelemetry + Pino (structured logging) |
| **Qualidade** | Biome (lint + format) |

## 🚀 Quick Start

### Pré-requisitos
- Node.js 22+
- Docker + Docker Compose

### Setup

```bash
# 1. Instalar dependências
npm install

# 2. Subir banco e redis
npm run docker:up

# 3. Rodar migrations e seed
npm run db:push
npm run db:seed

# 4. Dev server
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Primeiro Acesso (seed)

- **Admin:** admin@example.com / admin123
- **Usuário Demo:** user@example.com / user123

## 📁 Estrutura do Projeto

```
finally-app/
├── prisma/
│   ├── schema.prisma          # Schema do banco
│   └── seed.ts                # Dados iniciais
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes (auth, trpc)
│   │   ├── dashboard/         # Painel administrativo
│   │   └── sign-in/           # Login
│   ├── components/
│   │   ├── auth/              # Componentes de autenticação
│   │   ├── layout/            # Sidebar, header, tenant-switcher
│   │   └── ui/                # shadcn/ui
│   ├── hooks/                 # Hooks customizados
│   ├── lib/
│   │   └── trpc/              # Configuração tRPC + cliente
│   └── server/
│       └── routers/           # Routers tRPC
└── docs/                      # Documentação
```

## 🧪 Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Dev server com Turbopack |
| `npm run build` | Build de produção |
| `npm run lint` | Lint com Biome |
| `npm run format` | Formatação com Biome |
| `npm run check` | Lint + format + imports |
| `npm run type-check` | Checagem TypeScript |
| `npm run db:migrate` | Executar migrações |
| `npm run db:seed` | Popular banco com dados demo |
| `npm run db:studio` | Prisma Studio |
| `npm run docker:up` | Inicia DB + Redis |
| `npm run docker:down` | Para containers |
| `npm run test` | Testes unitários |
