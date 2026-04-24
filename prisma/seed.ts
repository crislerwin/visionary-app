import { PrismaClient, MemberRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: adminPassword,
    },
  });

  // Create demo user
  const userPassword = await bcrypt.hash("user123", 10);
  const demoUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      name: "Demo User",
      password: userPassword,
    },
  });

  // Create sample tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
      description: "A sample tenant for demonstration",
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

  // Create sample posts
  await prisma.post.createMany({
    skipDuplicates: true,
    data: [
      {
        title: "Welcome to the Boilerplate",
        content:
          "This is a sample post to demonstrate the CRUD functionality. You can create, read, update, and delete posts.",
        published: true,
        authorId: admin.id,
        tenantId: tenant.id,
      },
      {
        title: "Getting Started Guide",
        content:
          "1. Create an account\n2. Join or create a tenant\n3. Start managing your content",
        published: true,
        authorId: admin.id,
        tenantId: tenant.id,
      },
      {
        title: "Draft Post Example",
        content: "This post is not published yet. Only admins can see drafts.",
        published: false,
        authorId: demoUser.id,
        tenantId: tenant.id,
      },
    ],
  });

  // Create another tenant for testing tenant switching
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: "stark-industries" },
    update: {},
    create: {
      name: "Stark Industries",
      slug: "stark-industries",
      description: "Advanced technology and innovation",
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
  console.log("- Admin user: admin@example.com / admin123");
  console.log("- Demo user: user@example.com / user123");
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
