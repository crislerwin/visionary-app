#!/usr/bin/env tsx
/**
 * Database Seed Script — Standalone
 *
 * Populates the database with sample data for development/testing.
 * Uses tsx (available in project devDeps) instead of ts-node.
 *
 * Usage: npx tsx scripts/seed-database.ts
 */

import { prisma } from "../src/lib/db";
import { hash } from "bcryptjs";

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // ── Users ──────────────────────────────────────────
  console.log("Creating test users...");
  const testUser = await prisma.user.upsert({
    where: { email: "dev@visionary.app" },
    update: {},
    create: {
      email: "dev@visionary.app",
      name: "Developer",
      password: await hash("password123", 12),
      emailVerified: new Date(),
    },
  });
  console.log(`✅ User: ${testUser.email}\n`);

  // ── Tenant ─────────────────────────────────────────
  console.log("Creating tenant...");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "visionary-dev" },
    update: {},
    create: {
      name: "Visionary Dev",
      slug: "visionary-dev",
      ownerId: testUser.id,
    },
  });
  console.log(`✅ Tenant: ${tenant.name}\n`);

  // ── Membership ─────────────────────────────────────
  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: testUser.id,
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      tenantId: tenant.id,
      role: "OWNER",
      joinedAt: new Date(),
    },
  });
  console.log("✅ Membership created\n");

  // ── Bank Accounts ─────────────────────────────────
  console.log("Creating bank accounts...");
  const accounts = await Promise.all([
    prisma.bankAccount.create({
      data: {
        name: "Conta Corrente Principal",
        bankName: "Itaú",
        type: "CHECKING",
        currency: "BRL",
        initialBalance: 15000.5,
        currentBalance: 15000.5,
        tenant: { connect: { id: tenant.id } },
      },
    }),
    prisma.bankAccount.create({
      data: {
        name: "Conta Poupança",
        bankName: "Nubank",
        type: "SAVINGS",
        currency: "BRL",
        initialBalance: 8500.0,
        currentBalance: 8500.0,
        tenant: { connect: { id: tenant.id } },
      },
    }),
  ]);
  console.log(`✅ ${accounts.length} bank accounts created\n`);

  // ── Categories ────────────────────────────────────
  console.log("Creating categories...");
  const catIncome = await prisma.category.upsert({
    where: { id: "cat-income" },
    update: {},
    create: {
      id: "cat-income",
      name: "Receitas",
      type: "INCOME",
      color: "#00c853",
      icon: "trending-up",
      tenant: { connect: { id: tenant.id } },
    },
  });
  const catExpense = await prisma.category.upsert({
    where: { id: "cat-expense" },
    update: {},
    create: {
      id: "cat-expense",
      name: "Despesas",
      type: "EXPENSE",
      color: "#ff1744",
      icon: "trending-down",
      tenant: { connect: { id: tenant.id } },
    },
  });
  const catSaas = await prisma.category.upsert({
    where: { id: "cat-saas" },
    update: {},
    create: {
      id: "cat-saas",
      name: "Assinaturas SaaS",
      type: "EXPENSE",
      color: "#ff9100",
      icon: "cloud",
      parent: { connect: { id: catExpense.id } },
      tenant: { connect: { id: tenant.id } },
    },
  });
  console.log("✅ 3 categories created\n");

  // ── Partners ──────────────────────────────────────
  console.log("Creating partners...");
  const partners = await Promise.all([
    prisma.partner.upsert({
      where: { id: "partner-1" },
      update: {},
      create: {
        id: "partner-1",
        name: "Partner A",
        email: "partner-a@example.com",
        type: "SUPPLIER",
        status: "ACTIVE",
        commissionType: "PERCENTAGE",
        commissionValue: 10,
        tenant: { connect: { id: tenant.id } },
      },
    }),
    prisma.partner.upsert({
      where: { id: "partner-2" },
      update: {},
      create: {
        id: "partner-2",
        name: "Partner B",
        email: "partner-b@example.com",
        type: "AFFILIATE",
        status: "ACTIVE",
        commissionType: "FIXED",
        commissionValue: 500,
        tenant: { connect: { id: tenant.id } },
      },
    }),
  ]);
  console.log(`✅ ${partners.length} partners created\n`);

  // ── Transactions ─────────────────────────────────
  console.log("Creating sample transactions...");
  const now = new Date();
  const txs = await Promise.all([
    prisma.transaction.create({
      data: {
        description: "Pagamento Cliente A",
        amount: 5000.0,
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        type: "INCOME",
        status: "COMPLETED",
        category: { connect: { id: catIncome.id } },
        bankAccount: { connect: { id: accounts[0].id } },
      },
    }),
    prisma.transaction.create({
      data: {
        description: "Pagamento Cliente B",
        amount: 3200.0,
        date: new Date(now.getFullYear(), now.getMonth(), 12),
        type: "INCOME",
        status: "COMPLETED",
        category: { connect: { id: catIncome.id } },
        bankAccount: { connect: { id: accounts[0].id } },
      },
    }),
    prisma.transaction.create({
      data: {
        description: "AWS - Hosting",
        amount: 450.0,
        date: new Date(now.getFullYear(), now.getMonth(), 3),
        type: "EXPENSE",
        status: "COMPLETED",
        category: { connect: { id: catSaas.id } },
        bankAccount: { connect: { id: accounts[1].id } },
      },
    }),
    prisma.transaction.create({
      data: {
        description: "Slack - Assinatura",
        amount: 120.0,
        date: new Date(now.getFullYear(), now.getMonth(), 10),
        type: "EXPENSE",
        status: "COMPLETED",
        category: { connect: { id: catSaas.id } },
        bankAccount: { connect: { id: accounts[1].id } },
      },
    }),
    prisma.transaction.create({
      data: {
        description: "Escritório - Aluguel",
        amount: 2500.0,
        date: new Date(now.getFullYear(), now.getMonth(), 1),
        type: "EXPENSE",
        status: "COMPLETED",
        category: { connect: { id: catExpense.id } },
        bankAccount: { connect: { id: accounts[0].id } },
      },
    }),
  ]);
  console.log(`✅ ${txs.length} transactions created\n`);

  // ── Alert Rules ───────────────────────────────────
  console.log("Creating alert rules...");
  await prisma.alertRule.create({
    data: {
      name: "Saldo baixo",
      condition: "balance_below",
      threshold: 1000,
      tenant: { connect: { id: tenant.id } },
    },
  });
  console.log("✅ Alert rule created\n");

  console.log("🎉 Database seed completed successfully!");
  console.log("\nTest credentials:");
  console.log("  Email: dev@visionary.app");
  console.log("  Password: password123");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
