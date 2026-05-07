# Food Service - SaaS para Restaurantes

## Visão Geral

Plataforma SaaS completa para restaurantes, lanchonetes, pizzarias, hamburguerias e operações de delivery.

### Diferenciais
- Vendas diretas + Automação WhatsApp (via Evolution API)
- Gestão completa (cardápio, pedidos, estoque, caixa, entregas)
- Emissão fiscal (NFC-e)
- Programa de fidelidade
- KDS (Kitchen Display System)
- Roteirização de entregas

## Arquitetura

Este projeto segue uma arquitetura de microserviços:

```
food-service/           ← Este repo (Frontend + API)
│
├─ Web App (Next.js)
├─ API REST (tRPC)
├─ Banco PostgreSQL
└─ Redis (cache/queue)

food-service-evolution/ ← Repo separado (WhatsApp)
│
├─ Evolution API (Baileys)
├─ Webhook handlers
└─ PostgreSQL Evolution
```

## Estrutura do Projeto

```
docs/
├── rfc.md              # Request for Comments
├── user-stories.md     # Histórias de usuário
├── architecture/       # Diagramas de arquitetura
└── api/               # Documentação de APIs

src/
├── features/           # Módulos por funcionalidade
│   ├── menu/          # Cardápio digital
│   ├── orders/        # Gestão de pedidos
│   ├── customers/     # CRM e fidelidade
│   ├── kds/           # Kitchen Display System
│   ├── financial/     # Caixa e fiscal
│   └── whatsapp/      # Integração Evolution API
├── shared/            # Componentes e utilitários compartilhados
└── infrastructure/    # Configuração de infra
```

## Épicos

1. **Cardápio Digital e Pedidos** - QR Code, cardápio responsivo, gestão de pedidos
2. **WhatsApp Automation** - Chatbot via Evolution API, campanhas, notificações
3. **CRM e Fidelidade** - Cadastro de clientes, pontos, cupons
4. **Operacional** - Caixa, estoque, entregas, NFC-e

## Tecnologias

- Frontend: Next.js 15 + TypeScript + TailwindCSS
- Backend: Node.js + tRPC + Prisma
- Database: PostgreSQL + Redis
- Queue: Bull/BullMQ
- WhatsApp: **Evolution API** (Baileys)
- Pagamentos: Stripe + Mercado Pago
- Fiscal: API FocusNFe ou similar

## Repos Relacionados

- **Boilerplate:** https://github.com/crislerwin/boilerplate-saas
- **WhatsApp (Evolution):** *em breve* (em outro repo)

## Quick Start

```bash# Instalar dependênciasbun install

# Configurar variáveis de ambientecp .env.example .env

# Subir banco de dadosdocker-compose up -d db redis

# Rodar migraçõesbunx prisma migrate dev

# Seed de dadosbunx prisma db seed

# Iniciar developmentbun dev
```

## Licença

Privado - Crisler Software