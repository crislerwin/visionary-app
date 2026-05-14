#!/usr/bin/env ts-node
/**
 * Database Seed Script
 * 
 * Populates the database with sample data for development/testing.
 * Usage: npx ts-node scripts/seed-database.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Create test user
  console.log('Creating test user...');
  const testUser = await prisma.user.upsert({
    where: { email: 'dev@visionary.app' },
    update: {},
    create: {
      email: 'dev@visionary.app',
      name: 'Developer',
      password: await hash('password123', 12),
      emailVerified: new Date(),
    },
  });
  console.log(`✅ User: ${testUser.email}\n`);

  // Create organization
  console.log('Creating organization...');
  const org = await prisma.organization.upsert({
    where: { slug: 'visionary-dev' },
    update: {},
    create: {
      name: 'Visionary Dev',
      slug: 'visionary-dev',
      ownerId: testUser.id,
    },
  });
  console.log(`✅ Organization: ${org.name}\n`);

  // Create membership
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: testUser.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      organizationId: org.id,
      role: 'OWNER',
      accepted: true,
    },
  });

  // Create partners
  console.log('Creating partners...');
  const partners = await Promise.all([
    prisma.partner.upsert({
      where: { id: 'partner-1' },
      update: {},
      create: {
        id: 'partner-1',
        name: 'Partner A',
        type: 'PERCENTAGE',
        commissionRate: 10,
        organizationId: org.id,
      },
    }),
    prisma.partner.upsert({
      where: { id: 'partner-2' },
      update: {},
      create: {
        id: 'partner-2',
        name: 'Partner B',
        type: 'FIXED',
        commissionRate: 500,
        organizationId: org.id,
      },
    }),
  ]);
  console.log(`✅ ${partners.length} partners created\n`);

  // Create bank accounts
  console.log('Creating bank accounts...');
  const accounts = await Promise.all([
    prisma.bankAccount.create({
      data: {
        name: 'Conta Corrente Principal',
        bankName: 'Itaú',
        accountNumber: '12345-6',
        agency: '0001',
        balance: 15000.50,
        organizationId: org.id,
      },
    }),
    prisma.bankAccount.create({
      data: {
        name: 'Conta Poupança',
        bankName: 'Nubank',
        accountNumber: '98765-4',
        agency: '0001',
        balance: 8500.00,
        organizationId: org.id,
      },
    }),
  ]);
  console.log(`✅ ${accounts.length} bank accounts created\n`);

  // Create categories
  console.log('Creating categories...');
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 'cat-income' },
      update: {},
      create: {
        id: 'cat-income',
        name: 'Receitas',
        type: 'INCOME',
        color: '#00c853',
        organizationId: org.id,
      },
    }),
    prisma.category.upsert({
      where: { id: 'cat-expense' },
      update: {},
      create: {
        id: 'cat-expense',
        name: 'Despesas',
        type: 'EXPENSE',
        color: '#ff1744',
        organizationId: org.id,
      },
    }),
    prisma.category.upsert({
      where: { id: 'cat-saas' },
      update: {},
      create: {
        id: 'cat-saas',
        name: 'Assinaturas SaaS',
        type: 'EXPENSE',
        color: '#ff9100',
        parentId: 'cat-expense',
        organizationId: org.id,
      },
    }),
  ]);
  console.log(`✅ ${categories.length} categories created\n`);

  // Create sample transactions
  console.log('Creating sample transactions...');
  const now = new Date();
  const transactions = await Promise.all([
    // Income transactions
    prisma.transaction.create({
      data: {
        description: 'Pagamento Cliente A',
        amount: 5000.00,
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        type: 'INCOME',
        status: 'COMPLETED',
        categoryId: 'cat-income',
        organizationId: org.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Pagamento Cliente B',
        amount: 3200.00,
        date: new Date(now.getFullYear(), now.getMonth(), 12),
        type: 'INCOME',
        status: 'COMPLETED',
        categoryId: 'cat-income',
        organizationId: org.id,
      },
    }),
    // Expense transactions
    prisma.transaction.create({
      data: {
        description: 'AWS - Hosting',
        amount: 450.00,
        date: new Date(now.getFullYear(), now.getMonth(), 3),
        type: 'EXPENSE',
        status: 'COMPLETED',
        categoryId: 'cat-saas',
        organizationId: org.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Slack - Assinatura',
        amount: 120.00,
        date: new Date(now.getFullYear(), now.getMonth(), 10),
        type: 'EXPENSE',
        status: 'COMPLETED',
        categoryId: 'cat-saas',
        organizationId: org.id,
      },
    }),
    prisma.transaction.create({
      data: {
        description: 'Escritório - Aluguel',
        amount: 2500.00,
        date: new Date(now.getFullYear(), now.getMonth(), 1),
        type: 'EXPENSE',
        status: 'COMPLETED',
        categoryId: 'cat-expense',
        organizationId: org.id,
      },
    }),
  ]);
  console.log(`✅ ${transactions.length} transactions created\n`);

  console.log('🎉 Database seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Email: dev@visionary.app');
  console.log('  Password: password123');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
