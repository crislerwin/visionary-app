import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

// Generate unique email for test isolation
function getUniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
}

// Helper to reset database before tests
export async function resetDatabase() {
  // Clean up tables in correct order to avoid FK constraints
  const tables = [
    "OrderItem",
    "Order",
    "ProductVariant",
    "Product",
    "Category",
    "Membership",
    "TenantInvitation",
    "Session",
    "Account",
    "User",
    "Tenant",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (e) {
      // Table might not exist, ignore
    }
  }
}

// Helper to setup test data
export async function setupTestData() {
  // Create test tenant with unique email
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test Restaurant",
      slug: `test-restaurant-${Date.now()}`,
      owner: {
        create: {
          email: getUniqueEmail("owner"),
          name: "Test Owner",
        },
      },
    },
    include: {
      owner: true,
    },
  });

  // Create test user with membership
  const user = await prisma.user.create({
    data: {
      email: getUniqueEmail("user"),
      name: "Test User",
      memberships: {
        create: {
          tenantId: tenant.id,
          role: "ADMIN",
        },
      },
    },
  });

  return { tenant, user };
}

export { prisma };
