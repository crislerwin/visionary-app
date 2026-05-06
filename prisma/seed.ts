import "dotenv/config";
import { PrismaClient, MemberRole, CategoryType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Default categories for all tenants
const defaultCategories = [
  // Income categories
  { name: "Salário", type: CategoryType.INCOME, icon: "wallet", color: "#10B981" },
  { name: "Freelance", type: CategoryType.INCOME, icon: "briefcase", color: "#34D399" },
  { name: "Investimentos", type: CategoryType.INCOME, icon: "trending-up", color: "#6EE7B7" },
  { name: "Outras Receitas", type: CategoryType.INCOME, icon: "plus-circle", color: "#A7F3D0" },
  
  // Expense categories
  { name: "Moradia", type: CategoryType.EXPENSE, icon: "home", color: "#EF4444" },
  { name: "Alimentação", type: CategoryType.EXPENSE, icon: "utensils", color: "#F87171" },
  { name: "Transporte", type: CategoryType.EXPENSE, icon: "car", color: "#FCA5A5" },
  { name: "Saúde", type: CategoryType.EXPENSE, icon: "heart", color: "#FECACA" },
  { name: "Educação", type: CategoryType.EXPENSE, icon: "book-open", color: "#FDBA74" },
  { name: "Lazer", type: CategoryType.EXPENSE, icon: "gamepad-2", color: "#FCD34D" },
  { name: "Compras", type: CategoryType.EXPENSE, icon: "shopping-bag", color: "#FDE047" },
  { name: "Contas", type: CategoryType.EXPENSE, icon: "receipt", color: "#C084FC" },
  { name: "Outras Despesas", type: CategoryType.EXPENSE, icon: "minus-circle", color: "#E9D5FF" },
];

async function seedCategories(tenantId: string) {
  console.log(`Seeding categories for tenant: ${tenantId}`);
  
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        id: `${tenantId}-${category.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        ...category,
        tenantId,
        isDefault: true,
      },
    });
  }
  
  console.log(`Created ${defaultCategories.length} default categories`);
}

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

  // Seed categories for the main tenant
  await seedCategories(tenant.id);

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

  // Seed categories for second tenant
  await seedCategories(tenant2.id);

  // Create sample bank accounts for tenant 1
  const checkingAccount = await prisma.bankAccount.create({
    data: {
      name: "Conta Corrente Principal",
      type: "CHECKING",
      currency: "BRL",
      initialBalance: 5000.0,
      currentBalance: 5000.0,
      tenantId: tenant.id,
    },
  });

  const savingsAccount = await prisma.bankAccount.create({
    data: {
      name: "Poupança",
      type: "SAVINGS",
      currency: "BRL",
      initialBalance: 10000.0,
      currentBalance: 10000.0,
      tenantId: tenant.id,
    },
  });

  const creditCard = await prisma.bankAccount.create({
    data: {
      name: "Cartão de Crédito",
      type: "CREDIT",
      currency: "BRL",
      initialBalance: -2000.0,
      currentBalance: -2000.0,
      tenantId: tenant.id,
    },
  });

  console.log("Created sample bank accounts:");
  console.log("- Conta Corrente Principal");
  console.log("- Poupança");
  console.log("- Cartão de Crédito");

  console.log("Seeding completed!");
  console.log("- Admin user: admin@example.com / admin123");
  console.log("- Demo user: user@example.com / user123");
  console.log("- Tenant 1:", tenant.slug);
  console.log("- Tenant 2:", tenant2.slug);
  console.log("- Default categories: 13 (7 expense + 6 income)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
