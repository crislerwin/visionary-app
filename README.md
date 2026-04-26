# 🍔 Food Service — SaaS para Gestão de Restaurantes

Um sistema completo e pronto para produção para gestão de restaurantes, lanchonetes e estabelecimentos de alimentação. Multi-tenant, com catálogo público, controle de caixa, pedidos, gestão de equipes e personalização de marca.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Multi-tenant** | Isolamento total por restaurante (tenant) com switch rápido |
| **Autenticação** | NextAuth v5 com credenciais + Google OAuth |
| **Gestão de Equipes** | Convites, papéis (Owner / Admin / Member / Viewer) |
| **Cardápio Público** | Página de menu acessível por slug do tenant, sem login |
| **Categorias** | Organização hierárquica com imagens |
| **Produtos** | Cadastro, variantes, imagens, controle de estoque |
| **Pedidos** | Criação via checkout público, acompanhamento em tempo real |
| **Caixa** | Abertura/fechamento de caixa, transações, histórico |
| **Upload de Imagens** | Cropping + compressão, com preview em tempo real |
| **i18n** | Pronto para internacionalização (pt/en/es) |
| **Personalização de Marca** | Logo, cores e identidade visual por tenant |

---

## 🚀 Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Next.js 16 (App Router + Turbopack) |
| **Linguagem** | TypeScript 5.7 |
| **Estilos** | Tailwind CSS 4.0 + shadcn/ui |
| **Banco de Dados** | PostgreSQL (Prisma ORM) |
| **Cache / Sessão** | Redis |
| **APIs** | tRPC — end-to-end type-safe |
| **Auth** | NextAuth.js v5 (Auth.js) |
| **Upload** | AWS S3 (presigned URLs) |
| **Testes** | Vitest (unit) + Playwright (E2E) |
| **Qualidade** | Biome (lint + format) |

---

## 📁 Estrutura do Projeto

```
food-service/
├── prisma/
│   ├── schema.prisma          # Schema completo do banco
│   └── seed.ts                # Dados iniciais (demo)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes (auth, trpc, upload)
│   │   ├── checkout/          # Fluxo de checkout público
│   │   ├── dashboard/         # Painel administrativo protegido
│   │   │   ├── cash-register/ # Controle de caixa
│   │   │   ├── categories/    # Gestão de categorias
│   │   │   └── products/      # Gestão de produtos
│   │   ├── menu/              # Cardápio público (/menu/:tenantSlug)
│   │   └── sign-in/           # Login
│   ├── components/
│   │   ├── auth/              # Componentes de autenticação
│   │   ├── layout/            # Sidebar, header, skeletons
│   │   ├── marketing/         # Landing page
│   │   ├── menu/              # Componentes do cardápio público
│   │   ├── product/           # Cards, dialogs de produto
│   │   └── ui/                # shadcn/ui (Button, Dialog, etc.)
│   ├── config/                # Variáveis e configurações centralizadas
│   ├── hooks/                 # Hooks customizados (useCurrentTenant, etc.)
│   ├── lib/
│   │   ├── storage/           # S3 upload service
│   │   └── trpc/              # Configuração tRPC + cliente
│   ├── server/
│   │   ├── routers/           # 10 routers tRPC (ver ROUTERS.md)
│   │   └── tenant-context/    # Middleware de tenancy
│   ├── stores/                # Zustand stores (tenantStore, etc.)
│   └── types/                 # Tipos globais TypeScript
├── e2e/                       # Testes Playwright
├── public/                    # Assets estáticos
└── docs/                      # Documentação do projeto
    ├── AGENTS.md              # Guidelines para agentes de IA
    ├── ARCHITECTURE.md        # Arquitetura detalhada
    └── ROUTERS.md             # Referência completa da API
```

---

## 🛠️ Quick Start

### Pré-requisitos

- Node.js 22+
- PostgreSQL 14+ (ou Docker)
- Redis (ou Docker)
- npm / pnpm

### 1. Clone e Instalação

```bash
git clone https://github.com/crislerwin/food-service.git
cd food-service
npm install
```

### 2. Variáveis de Ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Chave para assinatura JWT |
| `NEXTAUTH_URL` | ✅ | URL base da aplicação |
| `REDIS_URL` | ✅ | Redis connection string |
| `AWS_ACCESS_KEY_ID` | ❌ | AWS S3 Key |
| `AWS_SECRET_ACCESS_KEY` | ❌ | AWS S3 Secret |
| `AWS_S3_BUCKET` | ❌ | Bucket S3 |
| `AWS_S3_REGION` | ❌ | Região S3 |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth |

### 3. Banco de Dados

```bash
# Usando Docker (recomendado)
npm run docker:up

# Migrações e seed
npm run db:migrate
npm run db:seed
```

### 4. Iniciar Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 🔐 Primeiro Acesso

Após o `db:seed`, você pode usar:

- **Admin:** `admin@example.com` / `admin123`
- **Usuário Demo:** `user@example.com` / `user123`

---

## 🧪 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Dev server com Turbopack |
| `npm run build` | Build de produção |
| `npm run lint` | Lint com Biome |
| `npm run format` | Formatação com Biome |
| `npm run type-check` | Checagem TypeScript |
| `npm run db:migrate` | Executar migrações Prisma |
| `npm run db:seed` | Popular banco com dados demo |
| `npm run db:studio` | Prisma Studio visual |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes E2E (Playwright) |
| `npm run docker:up` | Inicia DB + Redis via Docker |

---

## 🗺️ Documentação Adicional

- **[AGENTS.md](./docs/AGENTS.md)** — Guidelines e contexto para agentes de IA
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — Decisões arquiteturais, camadas e fluxos
- **[ROUTERS.md](./docs/ROUTERS.md)** — Referência completa dos 10 routers tRPC

---

## 📄 Licença

MIT License — use livremente para seus projetos.

Criado com ❤️ por [Crisler Wintler](https://github.com/crislerwin).
