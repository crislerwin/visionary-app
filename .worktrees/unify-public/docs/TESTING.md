# Testing Guide - Food Service

This project uses **Vitest** for testing with the following stack:
- **Vitest** - Test runner (replaces Jest)
- **Testing Library** - React component testing
- **tRPC** - API testing with caller factory
- **jsdom** - DOM environment for component tests

## Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode (development)
npm run test:watch

# Open Vitest UI for debugging
npm run test:ui

# Run with coverage report
npm run test:coverage
```

## Test Structure

```
src/
└── test/
    ├── setup.ts              # Test environment setup (mocks)
    ├── database.ts          # Database helpers (reset, seed)
    └── routers/
        ├── category.test.ts # API tests for category router
        └── product.test.ts # API tests for product router
```

## Writing Tests

### tRPC Router Tests

Test tRPC procedures using the caller factory:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { resetDatabase, setupTestData } from "../database";

describe("Feature Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testData: { tenant: { id: string }; user: { id: string } };

  beforeEach(async () => {
    // Reset database
    await resetDatabase();
    
    // Setup test data
    testData = await setupTestData();

    // Create authenticated caller
    caller = appRouter.createCaller({
      session: {
        user: {
          id: testData.user.id,
          email: "test@example.com",
          name: "Test User",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      headers: new Headers(),
    });
  });

  it("should create a resource", async () => {
    const result = await caller.resource.create({
      tenantId: testData.tenant.id,
      name: "Test Resource",
    });

    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Test Resource");
  });
});
```

### Component Tests

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Test Database

Tests use the same PostgreSQL database but clean up between tests:

1. `resetDatabase()` - Truncates all tables except migrations
2. `setupTestData()` - Creates test tenant and user

### Test Coverage

Check coverage after running tests:
```bash
npm run test:coverage
# Opens HTML report in coverage/index.html
```

## Best Practices

### 1. Test Behaviors, Not Implementation
❌ Test that specific functions were called
✅ Test the end result of the operation

### 2. Use Descriptive Test Names
❌ `it("should work")
✅ `it("should create a category with valid input")

### 3. Follow AAA Pattern
```typescript
it("should update category", async () => {
  // Arrange
  const category = await createCategory();
  
  // Act
  const result = await caller.category.update({ id: category.id, name: "New Name" });
  
  // Assert
  expect(result.name).toBe("New Name");
});
```

### 4. Mock External Services
External APIs (WhatsApp, Stripe, etc.) should be mocked:

```typescript
vi.mock("@/lib/whatsapp", () => ({
  sendMessage: vi.fn(),
}));
```

## Troubleshooting

### Tests failing with "Cannot find module"
Check that path aliases are configured in `vitest.config.ts`.

### Database connection errors
Ensure PostgreSQL is running:
```bash
docker-compose up -d db
```

### TypeScript errors
Run type check before tests:
```bash
npm run type-check
```

---

Happy testing! 🧪
