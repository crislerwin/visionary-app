# AGENTS Guidelines for This Repository

This repository is developed with the assistance of AI agents. These guidelines ensure consistency, quality, and a shared mental model of the system.

## Core Philosophy

We adhere to the "Theory Building" view of programming (Peter Naur). The goal is not just working code, but a clear, shared mental model ("The Theory") of the system.
**Source Code is Design.** You are not just a coder; you are a designer.

## Rules of Engagement

### 1. Protect the "Theory"

- **Explain the 'Why':** When generating complex logic, you must explicitly state the "theory" or reasoning behind the design choice in the comments or PR description.
- **Mental Model Matching:** Code structure must match the domain language. Use explicit naming conventions that reveal the intent, not just the mechanism (e.g., `calculateNetWorth()` vs `sumArray()`).
- **Type Safety First:** Leverage TypeScript's type system to encode the domain model. Never use `any` unless absolutely necessary — prefer `unknown` with runtime validation (Zod) when types are dynamic.

### 2. Optimize for "Cost of Change" (Constantine's Equivalence)

- **Minimize Coupling:** Prefer code that can be understood in isolation. Avoid creating "spooky action at a distance" where changing one module breaks an unrelated one.
- **Explicit > Implicit:** Do not use "clever" one-liners if they obscure the mental model. Readability for the human reviewer is higher priority than brevity.
- **Co-location:** Keep related logic close. tRPC routers, Zod schemas, and React hooks that share a domain concept should live in proximity.

### 3. The "Prompt is Source" Protocol

- If I provide a high-level specification (Natural Language), treat that as the "immutable source."
- If the implementation fails, **do not just patch the code**. Analyze if the "Theory" (the prompt/spec) was ambiguous. Ask for clarification on the spec before "hacking" a fix.
- **Reference is Law:** When I say "Coloquei como quero que fica..." or "matches this layout", read the reference sketch at `~/projects/visionary-sketch/` immediately and reproduce **exactly** — including table vs DataTable, Card wrappers, tab bar layout, pagination style.

### 4. Code Review Readiness

- Assume I need to reconstruct the mental model from your code immediately.
- Use **Extract Function/Component** aggressively to label blocks of logic with domain-centric names.
- If you introduce a new pattern, explain it first.
- **No Toast/Notifications:** This project does not use toast/sonner libraries. For error feedback, use `console.error` only. Do not add visual toast popups.

### 5. Reuse Before Reinventing

- **Search existing components first.** Before creating any new table, form, dialog, chart, card, or layout component, check if a reusable component already exists in the project.
- **Use the project's `DataTable`.** For any table that displays paginated, sortable, or filterable data, always use the existing `DataTable` from `src/components/ui/data-table.tsx` instead of creating a raw `<table>` or a new table component. If the `DataTable` lacks a feature you need, extend it — do not duplicate it.
- **Check `shadcn/ui` primitives.** Before wrapping a Radix primitive in a new component, verify if a reusable wrapper already exists under `src/components/ui/`. The project already has these primitives available:
  `alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `chart`, `checkbox`, `data-table`, `dialog`, `drawer`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `separator`, `sheet`, `skeleton`, `smart-form`, `switch`, `table`, `tabs`, `textarea`, `theme-toggle`.
- **Respect the sketch.** When a reference sketch is provided (e.g., `~/projects/visionary-sketch/`), reproduce the exact components it uses — if the sketch uses `Table`, use `Table`; if it uses `DataTable`, use `DataTable`.

## Development Standards

### Test-Driven Development (TDD)

Follow the **Red-Green-Refactor** cycle:

1. **Red**: Write a failing test that defines the desired behavior.
2. **Green**: Write minimal code to make the test pass.
3. **Refactor**: Improve code quality while keeping tests green.

**Testing Strategy**:

- **Unit Tests**: Test individual utilities, hooks, and tRPC procedures in isolation (Vitest).
- **Integration Tests**: Test tRPC router interactions (use `createCaller` from `src/server/routers/_app.ts`).
- **E2E Tests**: Test complete user flows with Playwright (page navigation, auth, data submission).
- **Table-Driven Tests**: ALWAYS prefer this format for better readability and coverage.

### Architecture & Design

- **Domain-Driven Design (DDD)**: Respect boundaries: Domain Models (Prisma) > tRPC Routers (UseCase layer) > React Components (UI layer) > API/Database (Infrastructure).
- **SOLID Principles**: Apply dependency inversion and single responsibility strictly. tRPC routers should delegate heavy logic to services, not inline everything.
- **Ultra-Compact UI:** This project follows a dense UI philosophy. No Card wrappers around lists/grids, horizontal layouts preferred, font sizes `text-[11px]`–`text-[13px]`, padding max `p-2`, 3–5 column grids, no icon decorations. Social media icons use real brand colors at small size (`w-5 h-5`).

### Clean Code Standards

- **Functions/Components**: Small, focused (SRP). Prefer composition over large monolithic components.
- **Naming**: Intention-revealing. Event handlers use `handle` prefix (`handleSave`), booleans use `is`/`has`/`can` prefix.
- **Comments**: Explanation of _why_, not _what_. Comments explaining "what" are a smell — the code should be self-explanatory.
- **Imports**: Convert path aliases (`@/`) to relative imports when needed for Bun/NodeNext compatibility. Do not assume alias resolution works everywhere.

## Workflow

1. [ ] **Analyze**: Understand the requirement, read the reference sketch if applicable, and internalize the mental model.
2. [ ] **Plan**: Propose a plan and explain tradeoffs. If the task is ambiguous, ask before implementing.
3. [ ] **Test**: Write the test case (Table-Driven).
4. [ ] **Implement**: Write the code to satisfy the test. Follow the ultra-compact UI style.
5. [ ] **Verify**: Run tests and ensure all pass. Run `task check` (Biome lint + format).

## Communication Templates

### When Starting a Task

```
I understand the "Theory" for [requirement] is...
Here's my approach:
...
Tradeoffs:
...
```

### When Implementing

```
I'm creating [component] to support [domain concept].
Key design decisions:
...
```

## Project Maintenance & Commands

### 1. Development

- **`task dev`**: Starts Next.js dev server with Turbopack.
- **`task dev:setup`**: Full setup (install deps + SQLite schema + DB push + seed) and starts dev server.

### 2. Dependencies

- **`task install`**: Install all project dependencies (npm).
- **`task setup`**: Full project setup with SQLite (default dev environment).
- **`task setup:postgres`**: Full setup with PostgreSQL + Docker.

### 3. Testing

- **`task test`**: Run unit tests with Vitest.
- **`task test:ui`**: Run tests with Vitest UI.
- **`task test:watch`**: Run tests in watch mode.

### 4. Quality

- **`task lint`**: Run Biome linter.
- **`task format`**: Run Biome formatter.
- **`task check`**: Run Biome lint + format + import checks (auto-fixes where possible).
- **`task typecheck`**: Run TypeScript compiler (`tsc --noEmit`).

### 5. Database (Prisma)

**IMPORTANT**: Never create migration files manually for development. Use `db push` for dev. Production migrations are managed separately.

- **`task db:generate`**: Generate Prisma Client.
- **`task db:push`**: Synchronize schema with database (dev only — uses `db push --accept-data-loss`).
- **`task db:migrate`**: Create and apply a new migration (use with care).
- **`task db:seed`**: Populate database with demo data.
- **`task db:studio`**: Open Prisma Studio (database GUI).
- **`task db:reset`**: Reset database and re-seed.
- **`task switch:sqlite`**: Switch schema to SQLite.
- **`task switch:postgres`**: Switch schema to PostgreSQL.

### 6. Docker

- **`task docker:up`**: Start PostgreSQL + Redis containers.
- **`task docker:down`**: Stop containers.
- **`task docker:logs`**: Follow container logs.

### 7. Commands Recap

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `task install`         | Install project dependencies.              |
| `task dev`             | Start dev server with Turbopack.           |
| `task dev:setup`       | Full setup + start dev.                  |
| `task test`            | Run unit tests.                            |
| `task test:ui`         | Run tests with UI.                         |
| `task lint`            | Run Biome linter.                          |
| `task format`          | Run Biome formatter.                       |
| `task check`           | Lint + Format + Imports (auto-fix).        |
| `task typecheck`       | Run TypeScript check.                      |
| `task db:push`         | Sync schema with DB (dev).                 |
| `task db:seed`         | Populate demo data.                        |
| `task db:studio`       | Open Prisma Studio GUI.                    |
| `task db:reset`        | Reset DB and re-seed.                      |
| `task switch:sqlite`   | Switch to SQLite schema.                   |
| `task switch:postgres` | Switch to PostgreSQL schema.               |
| `task docker:up`       | Start Docker containers.                   |
| `task docker:down`     | Stop Docker containers.                    |
| `task clean`           | Clean build cache.                         |
| `task clean:all`       | Clean everything (cache, node_modules, DB) |
| `task reset`           | Full reset and re-install.                 |

## Environment Notes

- **Runtime**: Bun (preferred) or Node 22+. Path aliases (`@/`) may need conversion to relative imports for Bun/NodeNext compatibility.
- **Database**: SQLite for local dev (`file:./prisma/dev.db`), PostgreSQL for production/CI.
- **Schema Switching**: Always run `./scripts/prepare-schema.sh [sqlite|postgresql]` before `prisma generate` when switching environments.
- **Auth**: NextAuth.js v5 with credentials + OAuth providers. `AUTH_SECRET` and `AUTH_URL` required.
