# Meu Rango SaaS - Project Constitution

> Executable specifications for a modern restaurant management platform.

## Project Identity

**Name:** Meu Rango  
**Type:** Multi-tenant SaaS Platform  
**Domain:** Restaurant Operations Management  
**Architecture:** Next.js / React / PostgreSQL / tRPC

## Core Principles

### 1. Multi-Tenancy First
Everything in the system is scoped to a tenant. No global data except admin configurations.
- Database: `tenantId` foreign key on all business entities
- API: `tenantProcedure` validates tenant membership
- UI: `useCurrentTenant()` hook provides tenant context

### 2. Type Safety Above All
- Full TypeScript with strict mode enabled
- tRPC provides end-to-end type safety
- Prisma generates database types
- Zod validates runtime boundaries

### 3. Progressive Enhancement
Core functionality works without JavaScript (forms), enhanced with React interactivity.

### 4. Mobile-First Design
Restaurant staff use phones/tablets. All interfaces optimized for touch and small screens.

### 5. Soft Deletes for Data Integrity
Never hard delete. Use `isDeleted` + `isActive` flags for audit trails and recovery.

## Technology Decisions

### Frontend
- **Framework:** Next.js 15 (App Router) - RSC for performance
- **Styling:** Tailwind CSS v4 - Utility-first, minimal CSS files
- **Components:** shadcn/ui - Accessible, customizable primitives
- **State:** React Query (tRPC) - Server state synchronization
- **Forms:** React Hook Form + Zod - Type-safe validation

### Backend
- **API:** tRPC 11 - Type-safe RPC, no REST needed
- **Database:** PostgreSQL 16 - JSON support, full-text search
- **ORM:** Prisma 6 - Type-safe queries, migrations
- **Auth:** Next-Auth v5 - Credentials + OAuth, JWT sessions
- **Queue:** BullMQ (Redis) - Scheduled jobs, background processing

### Infrastructure
- **Container:** Docker Compose - Dev/production parity
- **Upload:** Cloudflare R2 / AWS S3 - Image storage
- **Monitoring:** Sentry - Error tracking, performance
- **AI:** Evolution API - WhatsApp integration

## Code Style & Conventions

### File Organization
```
src/
├── app/                    # Next.js routes
│   ├── (routes)/           # Route groups
│   ├── api/                # API routes (tRPC handler, auth)
│   ├── dashboard/          # Protected routes
│   └── cardapio/           # Public menu
├── components/
│   ├── ui/                 # shadcn components
│   ├── forms/              # Form-specific components
│   └── layout/             # Shell components
├── lib/
│   ├── trpc/               # tRPC configuration
│   ├── db.ts               # Prisma client
│   └── utils.ts            # Utilities
├── server/
│   └── routers/            # tRPC routers
└── hooks/                  # Custom React hooks
```

### Naming Conventions
- **Files:** kebab-case (`category-router.ts`)
- **Components:** PascalCase (`CategoryCard.tsx`)
- **Functions:** camelCase (`getCategories`)
- **Types/Interfaces:** PascalCase (`CategoryInput`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_UPLOAD_SIZE`)
- **Database:** snake_case (`created_at`)

### Router Pattern
```typescript
// Must include CRUD operations:
export const routerName = router({
  list: tenantProcedure.query(...),      // List with filters
  byId: tenantProcedure.query(...),      // Single item
  create: tenantProcedure.mutation(...), // Create item
  update: tenantProcedure.mutation(...), // Update item
  delete: tenantProcedure.mutation(...), // Soft delete
});
```

### Error Handling
- **API:** TRPCError with appropriate codes
- **UI:** Error boundaries + toast notifications
- **Forms:** Field-level validation with Zod

### Database Schema
```prisma
// Required fields on all models:
// - id: String @id @default(cuid())
// - tenantId: String (except Tenant model itself)
// - createdAt: DateTime @default(now())
// - updatedAt: DateTime @updatedAt
// 
// Soft delete support:
// - isDeleted: Boolean @default(false)
// - isActive: Boolean @default(true)
```

## State Management

### Server State (React Query / tRPC)
- Use `api.{router}.{procedure}.useQuery()` for data fetching
- Use `api.{router}.{procedure}.useMutation()` for mutations
- Invalidate queries after mutations: `utils.{router}.list.invalidate()`

### Client State (React Context)
- TenantContext - Current tenant selection
- ToastContext - Notification system
- ThemeContext - Dark/light mode

### Form State
- `useState` for controlled inputs
- `useForm` (React Hook Form) for complex forms
- Zod resolver for validation

## UI/UX Guidelines

### Layout
- Max content width: `max-w-7xl mx-auto`
- Padding: `px-4 sm:px-6 lg:px-8` (responsive)
- Card spacing: `gap-4` or `gap-6`

### Colors
- Primary: `blue-600` (actions, links)
- Success: `green-500` (positive feedback)
- Danger: `red-500` (deletions, errors)
- Warning: `yellow-500` (cautions)

### Components
- Always use shadcn/ui base components
- Extend, don't replace (wrappers okay)
- Accessibility: Labels, aria attributes, keyboard nav

### Loading States
- Skeletons for initial load
- Spinners for actions (buttons)
- Optimistic UI for mutations

## Security Principles

1. **Never Trust Client** - Validate all inputs server-side
2. **RBAC on Every Route** - Check permissions in procedures
3. **Sanitize Output** - Escape user content (XSS prevention)
4. **Secure Auth** - bcrypt passwords, HttpOnly cookies
5. **Rate Limit** - API endpoints protected

## Performance Guidelines

1. **Prisma Queries** - Always `select` specific fields
2. **Images** - Use Next.js Image component with optimization
3. **Code Splitting** - Dynamic imports for heavy components
4. **Database** - Add indexes on foreign keys and search fields

## Testing Strategy

### Unit Tests
- tRPC procedure logic
- Utility functions
- React component behavior

### Integration Tests
- API endpoints
- Database operations
- Authentication flows

### E2E Tests
- Critical user paths (order flow, checkout)
- Cross-browser compatibility

## Feature Organization

### Feature Flags
Use environment variables for gradual rollouts:
```typescript
const flags = {
  enableWhatsApp: process.env.ENABLE_WHATSAPP === 'true',
  enablePayments: process.env.ENABLE_PAYMENTS === 'true',
  enableNFCe: process.env.ENABLE_NFCE === 'true',
};
```

### Feature Structure
Each major feature gets a folder:
```
features/
├── menu/           # Cardápio digital
├── orders/         # Pedidos e checkout
├── whatsapp/      # Integração Evolution
├── payments/      # Pagamentos
├── kds/            # Kitchen Display System
├── customers/     # CRM
└── fiscal/         # Emissão de NFC-e
```

## Deployment

### Environments
1. **Development** - Local Docker
2. **Staging** - Vercel Preview
3. **Production** - Vercel Production

### Environment Variables
Required in all environments:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Optional (feature flags):
- `REDIS_URL`
- `S3_BUCKET`
- `EVOLUTION_API_URL`

### Database Migrations
```bash
# Never auto-migrate in production
# Use: npx prisma migrate deploy
```

## Success Criteria

### Performance
- Initial page load < 2s
- Time to Interactive < 3s
- API response < 200ms (p95)

### Reliability
- 99.9% uptime SLA
- Zero data loss
- Graceful degradation

### Usability
- Mobile-first (Touch targets ≥ 44px)
- Accessibility WCAG 2.1 AA
- Portuguese language support

## Communication

### Git Workflow
- Branch naming: `feature/description`, `fix/description`
- Commits: Conventional commits (`feat:`, `fix:`, `docs:`)
- PRs: Require review + CI pass

### Documentation
- README: Setup and development
- API: tRPC introspection (future: OpenAPI)
- Components: Storybook (future)

---

**v1.0** - Generated from brownfield analysis  
**Last Updated:** 2026-04-24
