# SaaS Boilerplate

A complete, production-ready SaaS starter built with modern web technologies. Features multi-tenancy, authentication, team management, and a beautiful UI.

## Features

- **Next.js 15** - App Router with Turbopack for fast development
- **TypeScript 5.7** - Full type safety
- **Tailwind CSS 4.0** - Modern styling with CSS variables
- **shadcn/ui** - Beautiful, accessible components
- **NextAuth.js v5** - Complete authentication with credentials and OAuth
- **Prisma** - Type-safe ORM with PostgreSQL
- **tRPC** - End-to-end type-safe APIs
- **Multi-tenancy** - Full tenant isolation and switching
- **Team Management** - Invite members with role-based access
- **i18n Ready** - Pre-configured for internationalization
- **Docker Support** - Complete development environment

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or use Docker)
- npm or pnpm

### 1. Clone and Install

```bash
git clone https://github.com/crislerwin/boilerplate-saas.git
cd boilerplate-saas
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Setup Database

```bash
# Using Docker (recommended)
docker-compose up -d db

# Or use your own PostgreSQL
# Then run migrations
npm run db:migrate
npm run db:seed
```

### 4. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
  app/              # Next.js App Router
    (dashboard)/    # Protected dashboard routes
    api/            # API routes
  components/       # React components
    ui/             # shadcn/ui components
    layout/         # Layout components
  lib/              # Utilities and setup
    trpc/           # tRPC configuration
  server/           # tRPC routers and logic
    routers/        # API routers
  hooks/            # Custom React hooks
  types/            # TypeScript types
```

## Scripts

- `dev` - Start development server with Turbopack
- `build` - Build for production
- `lint` - Run Biome linter
- `format` - Format code with Biome
- `db:generate` - Generate Prisma client
- `db:migrate` - Run database migrations
- `db:studio` - Open Prisma Studio
- `db:seed` - Seed database with sample data
- `test` - Run Vitest tests

## Docker

### Development

```bash
# Start all services
docker-compose up

# With hot reload
docker-compose up --build
```

### Stopping

```bash
docker-compose down

# Remove volumes
docker-compose down -v
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Yes |
| `NEXTAUTH_URL` | App URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | No |
| `GITHUB_CLIENT_ID` | GitHub OAuth ID | No |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Secret | No |

## Multi-tenancy

The boilerplate includes full multi-tenant support:

- **Tenants**: Organizations that contain users and data
- **Memberships**: Users can belong to multiple tenants with different roles
- **Roles**: Owner, Admin, Member, Viewer
- **Isolation**: Data is automatically scoped to the current tenant

### Creating a Tenant

1. Sign in and click the tenant switcher in the header
2. Click "Create Tenant"
3. Enter tenant name and slug
4. You'll be automatically switched to the new tenant

### Switching Tenants

Use the tenant switcher dropdown in the header to switch between your organizations.

## Customization

### Adding Providers

1. Configure in `src/auth.config.ts`
2. Add environment variables

### Adding Routes

Create routes in `src/app/(dashboard)/` for authenticated pages.

### Adding API Endpoints

Add tRPC routers in `src/server/routers/` and export them in `_app.ts`.

## Deployment

### Vercel

```bash
vercel
```

### Docker

```bash
# Build production image
docker build -t boilerplate-saas .

# Run
docker run -p 3000:3000 --env-file .env boilerplate-saas
```

## License

MIT License - feel free to use this boilerplate for any project.

## Credits

Based on [motrx](https://github.com/crislerwin/motrx) project structure.
