import { MemberRole, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@pizzariacentral.com" },
    update: {},
    create: {
      email: "admin@pizzariacentral.com",
      name: "Admin User",
      password: adminPassword,
    },
  });

  // Create demo user
  const userPassword = await bcrypt.hash("user123", 10);
  const demoUser = await prisma.user.upsert({
    where: { email: "gerente@bomsabor.com" },
    update: {},
    create: {
      email: "gerente@bomsabor.com",
      name: "Demo User",
      password: userPassword,
    },
  });

  // Create sample tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "pizzaria-central" },
    update: {},
    create: {
      name: "Pizzaria Central",
      slug: "pizzaria-central",
      description: "Pizzas artesanais com delivery rápido",
      ownerId: admin.id,
      memberships: {
        create: {
          userId: admin.id,
          role: MemberRole.OWNER,
          joinedAt: new Date(),
        },
      },
    },
  });

  // Add demo user as member
  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: demoUser.id,
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      tenantId: tenant.id,
      role: MemberRole.MEMBER,
      joinedAt: new Date(),
    },
  });

  // Create another tenant for testing tenant switching
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: "restaurante-bom-sabor" },
    update: {},
    create: {
      name: "Restaurante Bom Sabor",
      slug: "restaurante-bom-sabor",
      description: "Comida caseira e pratos brasileiros",
      ownerId: demoUser.id,
      memberships: {
        create: {
          userId: demoUser.id,
          role: MemberRole.OWNER,
          joinedAt: new Date(),
        },
      },
    },
  });

  console.log("Seeding completed!");
  console.log("- Admin user: admin@pizzariacentral.com / admin123");
  console.log("- Demo user: gerente@bomsabor.com / user123");
  console.log("- Tenant 1:", tenant.slug);
  console.log("- Tenant 2:", tenant2.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
