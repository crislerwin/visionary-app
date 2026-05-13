import "dotenv/config";
import { CategoryType, MemberRole, PrismaClient } from "@prisma/client";
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
        content: "1. Create an account\n2. Join or create a tenant\n3. Start managing your content",
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

  // Clean up existing transactions for this tenant to avoid duplicates on re-seed
  const existingAccounts = await prisma.bankAccount.findMany({
    where: { tenantId: tenant.id },
  });

  for (const account of existingAccounts) {
    await prisma.transaction.deleteMany({
      where: { bankAccountId: account.id },
    });
  }

  // Reset bank accounts to initial state
  for (const account of existingAccounts) {
    await prisma.bankAccount.update({
      where: { id: account.id },
      data: { currentBalance: account.initialBalance },
    });
  }

  // Create sample bank accounts for tenant 1 (reuse if exists)
  let checkingAccount = existingAccounts.find((a) => a.name === "Conta Corrente Principal");
  if (!checkingAccount) {
    checkingAccount = await prisma.bankAccount.create({
      data: {
        name: "Conta Corrente Principal",
        type: "CHECKING",
        currency: "BRL",
        initialBalance: 5000.0,
        currentBalance: 5000.0,
        tenantId: tenant.id,
      },
    });
  }

  let savingsAccount = existingAccounts.find((a) => a.name === "Poupança");
  if (!savingsAccount) {
    savingsAccount = await prisma.bankAccount.create({
      data: {
        name: "Poupança",
        type: "SAVINGS",
        currency: "BRL",
        initialBalance: 10000.0,
        currentBalance: 10000.0,
        tenantId: tenant.id,
      },
    });
  }

  let creditCard = existingAccounts.find((a) => a.name === "Cartão de Crédito");
  if (!creditCard) {
    creditCard = await prisma.bankAccount.create({
      data: {
        name: "Cartão de Crédito",
        type: "CREDIT",
        currency: "BRL",
        initialBalance: -2000.0,
        currentBalance: -2000.0,
        tenantId: tenant.id,
      },
    });
  }

  // Get categories for transactions
  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id },
  });

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  // Create sample transactions for the last 12 months
  const now = new Date();
  const sampleTransactions = [
    // Current month
    { description: "Salário mensal", amount: 8500, type: "INCOME", day: 5, categoryIdx: 0 },
    { description: "Aluguel", amount: 2200, type: "EXPENSE", day: 10, categoryIdx: 0 },
    { description: "Supermercado", amount: 680, type: "EXPENSE", day: 12, categoryIdx: 1 },
    { description: "Freelance", amount: 3200, type: "INCOME", day: 15, categoryIdx: 1 },
    { description: "Uber/Transporte", amount: 150, type: "EXPENSE", day: 18, categoryIdx: 2 },
    { description: "Netflix/Spotify", amount: 60, type: "EXPENSE", day: 20, categoryIdx: 4 },
    { description: "Farmácia", amount: 210, type: "EXPENSE", day: 22, categoryIdx: 3 },
    { description: "Investimentos", amount: 1000, type: "INCOME", day: 25, categoryIdx: 2 },

    // Previous months
    {
      description: "Salário",
      amount: 8500,
      type: "INCOME",
      day: 5,
      monthOffset: -1,
      categoryIdx: 0,
    },
    {
      description: "Aluguel",
      amount: 2200,
      type: "EXPENSE",
      day: 10,
      monthOffset: -1,
      categoryIdx: 0,
    },
    {
      description: "Supermercado",
      amount: 750,
      type: "EXPENSE",
      day: 12,
      monthOffset: -1,
      categoryIdx: 1,
    },
    {
      description: "Freelance",
      amount: 1500,
      type: "INCOME",
      day: 15,
      monthOffset: -1,
      categoryIdx: 1,
    },
    {
      description: "Gasolina",
      amount: 300,
      type: "EXPENSE",
      day: 18,
      monthOffset: -1,
      categoryIdx: 2,
    },
    {
      description: "Salário",
      amount: 8500,
      type: "INCOME",
      day: 5,
      monthOffset: -2,
      categoryIdx: 0,
    },
    {
      description: "Aluguel",
      amount: 2200,
      type: "EXPENSE",
      day: 10,
      monthOffset: -2,
      categoryIdx: 0,
    },
    {
      description: "Supermercado",
      amount: 620,
      type: "EXPENSE",
      day: 12,
      monthOffset: -2,
      categoryIdx: 1,
    },
    {
      description: "Bonus",
      amount: 2000,
      type: "INCOME",
      day: 20,
      monthOffset: -2,
      categoryIdx: 0,
    },
    {
      description: "Salário",
      amount: 8500,
      type: "INCOME",
      day: 5,
      monthOffset: -3,
      categoryIdx: 0,
    },
    {
      description: "Aluguel",
      amount: 2200,
      type: "EXPENSE",
      day: 10,
      monthOffset: -3,
      categoryIdx: 0,
    },
    {
      description: "Supermercado",
      amount: 800,
      type: "EXPENSE",
      day: 12,
      monthOffset: -3,
      categoryIdx: 1,
    },
    {
      description: "Restaurante",
      amount: 180,
      type: "EXPENSE",
      day: 15,
      monthOffset: -3,
      categoryIdx: 1,
    },
    {
      description: "Salário",
      amount: 8500,
      type: "INCOME",
      day: 5,
      monthOffset: -4,
      categoryIdx: 0,
    },
    {
      description: "Aluguel",
      amount: 2200,
      type: "EXPENSE",
      day: 10,
      monthOffset: -4,
      categoryIdx: 0,
    },
    {
      description: "Supermercado",
      amount: 550,
      type: "EXPENSE",
      day: 12,
      monthOffset: -4,
      categoryIdx: 1,
    },
    {
      description: "Freelance",
      amount: 2500,
      type: "INCOME",
      day: 18,
      monthOffset: -4,
      categoryIdx: 1,
    },
    {
      description: "Salário",
      amount: 8500,
      type: "INCOME",
      day: 5,
      monthOffset: -5,
      categoryIdx: 0,
    },
    {
      description: "Aluguel",
      amount: 2200,
      type: "EXPENSE",
      day: 10,
      monthOffset: -5,
      categoryIdx: 0,
    },
    {
      description: "Supermercado",
      amount: 700,
      type: "EXPENSE",
      day: 12,
      monthOffset: -5,
      categoryIdx: 1,
    },
    {
      description: "Viagem",
      amount: 1200,
      type: "EXPENSE",
      day: 20,
      monthOffset: -5,
      categoryIdx: 4,
    },
    {
      description: "Salário",
      amount: 8500,
      type: "INCOME",
      day: 5,
      monthOffset: -6,
      categoryIdx: 0,
    },
    {
      description: "Aluguel",
      amount: 2200,
      type: "EXPENSE",
      day: 10,
      monthOffset: -6,
      categoryIdx: 0,
    },
    {
      description: "Supermercado",
      amount: 650,
      type: "EXPENSE",
      day: 12,
      monthOffset: -6,
      categoryIdx: 1,
    },
    {
      description: "Dividendos",
      amount: 500,
      type: "INCOME",
      day: 25,
      monthOffset: -6,
      categoryIdx: 2,
    },
  ];

  for (const tx of sampleTransactions) {
    const monthOffset = tx.monthOffset ?? 0;
    const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, tx.day);
    const categoryList = tx.type === "INCOME" ? incomeCategories : expenseCategories;
    const category = categoryList[tx.categoryIdx % categoryList.length];

    await prisma.transaction.create({
      data: {
        amount: tx.amount,
        type: tx.type as "INCOME" | "EXPENSE",
        description: tx.description,
        date,
        bankAccountId: checkingAccount.id,
        categoryId: category?.id ?? null,
        status: "COMPLETED",
      },
    });
  }

  // Update account balance to reflect transactions
  const totalIncome = sampleTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = sampleTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  await prisma.bankAccount.update({
    where: { id: checkingAccount.id },
    data: {
      currentBalance: checkingAccount.initialBalance.toNumber() + totalIncome - totalExpense,
    },
  });

  console.log("Created sample bank accounts:");
  console.log("- Conta Corrente Principal");
  console.log("- Poupança");
  console.log("- Cartão de Crédito");
  console.log(`- ${sampleTransactions.length} sample transactions`);

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
