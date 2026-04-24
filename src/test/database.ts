import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

// Helper to reset database before tests
export async function resetDatabase() {
  // Clean up all tables
  const tablenames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames as { tablename: string }[]) {
    if (tablename !== "_prisma_migrations") {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tablename}" CASCADE;`
      );
    }
  }
}

// Helper to setup test data
export async function setupTestData() {
  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test Restaurant",
      slug: "test-restaurant",
      owner: {
        create: {
          email: "owner@test.com",
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
      email: "user@test.com",
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
