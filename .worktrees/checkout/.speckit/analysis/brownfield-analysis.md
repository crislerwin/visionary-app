# Brownfield Analysis Report

## Project Overview

**Project:** food-service  
**Type:** SaaS Platform for Restaurants (Food Service)  
**Analysis Date:** 2026-04-24  
**Current Status:** Active Development - Foundation Phase

## Existing Codebase Assessment

### Architecture Summary

This is a **Next.js 15 + React 19 + TypeScript** application using a modern SaaS architecture:

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App Router (Next 15.1.6)                       │
│  ├── React Server Components                           │
│  ├── Client Components (where needed)                  │
│  └── Server Actions (tRPC)                            │
├─────────────────────────────────────────────────────────┤
│  tRPC 11 (Type-safe API Layer)                        │
│  ├── Server Procedures (CRUD, Business Logic)         │
│  └── Client Procedures (React Query)                  │
├─────────────────────────────────────────────────────────┤
│  Prisma 6 (Database ORM)                               │
│  ├── PostgreSQL (Multi-tenant schema)                  │
│  └── Schema: Auth + Tenant + Food Service Models      │
├─────────────────────────────────────────────────────────┤
│  Auth.js v5 Beta (Next-Auth)                           │
│  ├── Credentials Provider (Email/Password)           │
│  └── OAuth (Google, GitHub)                           │
├─────────────────────────────────────────────────────────┤
│  UI Layer                                              │
│  ├── Tailwind CSS v4                                   │
│  ├── shadcn/ui Components (20+)                       │
│  └── Custom Layout Components                          │
└─────────────────────────────────────────────────────────┘
```

### Current Features Implemented

#### ✅ Foundation (100% Complete)
- [x] Multi-tenant architecture (tenant isolation)
- [x] Authentication system (Next-Auth v5)
- [x] Team/Membership management
- [x] Dashboard shell with navigation
- [x] Tenant switcher
- [x] PostgreSQL + Prisma setup
- [x] tRPC API layer

#### 🔄 Food Service Core (20% Complete)
- [x] Database schema (Category, Product, ProductVariant, Customer, Order)
- [x] Category CRUD (API + UI)
- [x] Product CRUD (API with variants)
- [ ] Product UI management
- [ ] Public menu/catalog page
- [ ] Order creation flow
- [ ] Checkout system

#### ⏸️ Pending Features
- [ ] WhatsApp integration (Evolution API)
- [ ] Payment processing (PIX, Credit Card)
- [ ] Kitchen Display System (KDS)
- [ ] Order management dashboard
- [ ] Customer CRM
- [ ] Coupon/Fidelity system
- [ ] Fiscal integration (NFC-e)

### Technology Stack Confirmed

| Component | Version | Status | Notes |
|-----------|---------|--------|-------|
| Next.js | 15.1.6 | ✅ Active | App Router, Turbopack |
| React | 19.0.0 | ✅ Active | Concurrent features |
| TypeScript | ^5 | ✅ Active | Strict configuration |
| tRPC | 11.0.0-rc.730 | ✅ Active | Server/client procedures |
| Prisma | 6.3.0 | ✅ Active | PostgreSQL provider |
| Next-Auth | 5.0.0-beta.25 | ✅ Active | Credentials + OAuth |
| Tailwind CSS | ^4.0.0 | ✅ Active | v4 with @plugin syntax |
| shadcn/ui | Latest | ✅ Active | 20+ components installed |
| Biome | ^1.9.4 | ✅ Active | Lint + Format |

### Database Schema Analysis

#### Core SaaS Models (Boilerplate)
1. **User** - Authentication identity
2. **Account** - OAuth account linking
3. **Session** - Auth sessions with tenant context
4. **Tenant** - Multi-tenant organization
5. **Membership** - User-Tenant relationship with roles
6. **Post** - Example content model

#### Food Service Models (Custom)
1. **Category** - Product categorization
   - Fields: name, slug, description, image, sortOrder, isActive, isDeleted
   - Relations: belongs to Tenant, has many Products
   - Soft delete support
   
2. **Product** - Menu items
   - Fields: name, description, image, price, stock, trackStock
   - Relations: belongs to Category, has Variants, has OrderItems
   - Multi-tenant isolated
   
3. **ProductVariant** - Product options (size, etc.)
   - Fields: name, price, stock, isActive
   - Relations: belongs to Product
   
4. **Customer** - Restaurant customers
   - Fields: name, phone, email, addresses (JSON), points, creditLimit
   - Relations: belongs to Tenant, has Orders
   - Unique constraint on phone+tenant
   
5. **Order** - Purchase orders
   - Fields: orderNumber, type, status, values, payment, address
   - Relations: belongs to Customer and Tenant, has OrderItems
   - Enums: OrderType (DELIVERY, PICKUP, DINE_IN), OrderStatus (7 states)
   
6. **OrderItem** - Individual order items
   - Fields: quantity, prices, notes, product snapshot
   - Relations: belongs to Order, Product, optional Variant

### API Layer Analysis

#### tRPC Routers Implemented

```typescript
// Existing Routers
├── auth          // Authentication operations
├── user          // User management
├── tenant        // Tenant CRUD
├── team          // Membership operations
├── post          // Example content (can be removed)
├── category      ✅ New - Category CRUD
└── product       ✅ New - Product CRUD + Variants
```

#### Pattern Analysis
- **Tenant Isolation**: All procedures use `tenantProcedure` with `tenantId` input
- **CRUD Pattern**: Consistent `list`, `byId`, `create`, `update`, `delete` structure
- **Error Handling**: TRPCError with proper codes (NOT_FOUND, CONFLICT, FORBIDDEN)
- **Soft Delete**: `isDeleted` flag with validation (can't delete if has dependencies)

### UI Components Inventory

#### shadcn/ui Components (20+)
- Form: Button, Input, Label, Select
- Feedback: Dialog, AlertDialog, Badge, Toast
- Layout: Card, Separator, Sheet
- Navigation: Tabs, DropdownMenu
- Data Display: Avatar, Table

#### Custom Layout Components
- DashboardShell - Main layout wrapper
- MainNav - Navigation menu
- TenantSwitcher - Tenant selection
- UserNav - User menu with logout
- Header - Page header component

### Code Patterns Identified

#### 1. Router Procedure Pattern
```typescript
export const {name}Router = router({
  list: tenantProcedure.input(filterSchema).query(...),
  byId: tenantProcedure.input(idSchema).query(...),
  create: tenantProcedure.input(createSchema).mutation(...),
  update: tenantProcedure.input(updateSchema).mutation(...),
  delete: tenantProcedure.input(deleteSchema).mutation(...),
});
```

#### 2. Form State Management
- React useState for form fields
- Loading states with `mutation.isPending`
- Validation with Zod schemas (shared with API)

#### 3. Dashboard Page Structure
```typescript
export default function Page() {
  const { currentTenant } = useCurrentTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // tRPC queries/mutations
  // Form state
  // UI structure
}
```

### Configuration Files

- **tsconfig.json** - Strict TypeScript with path aliases (@/*)
- **next.config.ts** - Next.js 15 configuration
- **biome.json** - Lint/Format rules (not ESLint/Prettier)
- **tailwind.config.ts** - Tailwind v4 with CSS config
- **prisma/schema.prisma** - Database schema
- **docker-compose.yml** - PostgreSQL + Redis services

### Development Workflow

#### Build & Development
```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # Biome lint check
```

#### Database Operations
```bash
npx prisma migrate dev    # Create/apply migrations
npx prisma generate       # Generate client
npx prisma db seed        # Seed data (if configured)
```

### Code Quality Indicators

#### Strengths
1. **Type Safety**: Full TypeScript with strict mode
2. **Consistency**: tRPC routers follow same pattern
3. **Multi-tenancy**: Proper tenant isolation throughout
4. **Modern Stack**: Next.js 15, React 19, Tailwind v4
5. **Component Library**: shadcn/ui provides consistent UI
6. **Soft Deletes**: Data integrity preserved

#### Areas for Improvement
1. **Test Coverage**: No test files detected
2. **Documentation**: Missing API documentation (Swagger/OpenAPI)
3. **Error Boundaries**: Limited error handling in UI
4. **i18n**: No internationalization setup
5. **Accessibility**: Not fully audited
6. **Performance**: No pagination on large lists (only basic cursor)

### Integration Points

#### External Services Needed
1. **Evolution API** - WhatsApp integration (containerized)
2. **Stripe/Mercado Pago** - Payment processing
3. **FocusNFe** - Brazilian fiscal integration (NFC-e)
4. **S3/R2** - Image storage for products

#### Environment Variables Required
```bash
# Core
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# External (future)
EVOLUTION_API_URL=...
STRIPE_SECRET_KEY=...
FOCUSNFE_TOKEN=...
S3_BUCKET=...
```

### Feature Dependencies Map

```
category-crud ✅
├── prerequisite for: product-crud ✅
└── prerequisite for: public-menu

product-crud ✅
├── prerequisite for: public-menu
├── prerequisite for: order-creation
└── prerequisite for: checkout-flow

public-menu ⏸️
├── requires: category-crud ✅
└── requires: product-crud ✅

order-creation ⏸️
├── requires: product-crud ✅
├── requires: customer-crm ⏸️
└── requires: checkout-flow ⏸️

whatsapp-integration ⏸️
├── requires: order-creation ⏸️
└── requires: customer-crm ⏸️

kds ⏸️
├── requires: order-creation ⏸️
└── prerequisite for: kitchen-operations

payment-processing ⏸️
├── requires: order-creation ⏸️
└── requires: checkout-flow ⏸️
```

### Recommendations for SDD Integration

#### 1. Convert Existing Features
Document completed features as SDD specs:
- Category CRUD → `features/category-management/`
- Product CRUD → `features/product-management/`

#### 2. Prioritize Next Features
Based on dependencies and business value:
1. **Public Menu** (catalog) - High visibility
2. **Order Creation Flow** - Core functionality
3. **Checkout System** - Revenue critical
4. **Customer CRM** - Enables loyalty/marketing

#### 3. Maintain Constitution
Update `.speckit/constitution.md` with discovered patterns:
- Router naming conventions
- Form state management approach
- Component organization
- Error handling strategy

#### 4. Test Strategy
Add testing infrastructure:
- Unit tests for tRPC procedures
- Integration tests for API
- E2E tests for critical flows

---
**Analysis Complete** - Ready to proceed with SDD workflow constitution generation.
