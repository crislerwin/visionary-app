import { prisma } from "@/lib/db";
import { router, tenantProcedure } from "@/lib/trpc/trpc";
import { DataSourceType, TransactionStatus, TransactionType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// ── Column mapping schema ──
const columnMappingSchema = z.object({
  date: z.string().min(1, "Date column is required"),
  description: z.string().min(1, "Description column is required"),
  amount: z.string().min(1, "Amount column is required"),
  type: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

// ── CSV row (after parsing, before mapping) ──
const csvRowSchema = z.record(z.string(), z.string());

// ── Import input ──
const csvImportSchema = z.object({
  sourceName: z.string().min(1).max(100),
  bankAccountId: z.string().min(1),
  columnMapping: columnMappingSchema,
  rows: z.array(csvRowSchema).min(1).max(5000),
  dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]).default("YYYY-MM-DD"),
  // If true, negative values = expense; if false, use type column
  inferTypeFromSign: z.boolean().default(true),
});

// ── Helpers ──

function parseDate(raw: string, format: string): Date | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  const parts = cleaned.split(/[-/]/);
  if (parts.length !== 3) return null;

  let year: number;
  let month: number;
  let day: number;

  switch (format) {
    case "DD/MM/YYYY":
      [day, month, year] = parts.map(Number);
      break;
    case "MM/DD/YYYY":
      [month, day, year] = parts.map(Number);
      break;
    default:
      [year, month, day] = parts.map(Number);
      break;
  }

  if (!year || !month || !day) return null;
  // Handle 2-digit years
  if (year < 100) year += year < 50 ? 2000 : 1900;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function parseAmount(raw: string): number | null {
  // Handle BR format: "1.234,56" → 1234.56
  const cleaned = raw.trim().replace(/\s/g, "");
  // Detect BR format: has comma as decimal + dot as thousands
  if (/,/.test(cleaned) && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
    // BR format: remove dots, replace comma with dot
    return Number.parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  // US format or plain number
  return Number.parseFloat(cleaned.replace(/,/g, ""));
}

function inferType(
  row: Record<string, string>,
  mapping: z.infer<typeof columnMappingSchema>,
  inferFromSign: boolean,
  amount: number,
): TransactionType {
  // Priority 1: explicit type column
  if (mapping.type) {
    const raw = (row[mapping.type] ?? "").toLowerCase().trim();
    if (
      raw === "income" ||
      raw === "entrada" ||
      raw === "crédito" ||
      raw === "credito" ||
      raw === "receita"
    ) {
      return TransactionType.INCOME;
    }
    if (
      raw === "expense" ||
      raw === "saída" ||
      raw === "saida" ||
      raw === "débito" ||
      raw === "debito" ||
      raw === "despesa"
    ) {
      return TransactionType.EXPENSE;
    }
  }

  // Priority 2: infer from sign
  if (inferFromSign) {
    return amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
  }

  // Default
  return TransactionType.EXPENSE;
}

function parseStatus(
  row: Record<string, string>,
  mapping: z.infer<typeof columnMappingSchema>,
): TransactionStatus {
  if (!mapping.status) return TransactionStatus.COMPLETED;
  const raw = (row[mapping.status] ?? "").toLowerCase().trim();
  if (raw === "pending" || raw === "pendente") return TransactionStatus.PENDING;
  if (raw === "cancelled" || raw === "cancelado" || raw === "cancelada")
    return TransactionStatus.CANCELLED;
  return TransactionStatus.COMPLETED;
}

// ── Router ──

export const dataSourceRouter = router({
  csvImport: tenantProcedure.input(csvImportSchema).mutation(async ({ ctx, input }) => {
    // 1. Verify bank account
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: input.bankAccountId, tenantId: ctx.tenantId },
    });
    if (!bankAccount) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bank account not found" });
    }

    // 2. Upsert DataSource
    const source = await prisma.dataSource.upsert({
      where: {
        tenantId_type_name: {
          tenantId: ctx.tenantId,
          type: DataSourceType.CSV,
          name: input.sourceName,
        },
      },
      update: { lastSyncAt: new Date(), status: "ACTIVE" },
      create: {
        name: input.sourceName,
        type: DataSourceType.CSV,
        status: "ACTIVE",
        tenantId: ctx.tenantId,
        lastSyncAt: new Date(),
        config: {
          bankAccountId: input.bankAccountId,
          dateFormat: input.dateFormat,
          columnMapping: input.columnMapping,
        },
      },
    });

    // 3. Process rows
    const mapping = input.columnMapping;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    let balanceDelta = 0;

    for (let i = 0; i < input.rows.length; i++) {
      const row = input.rows[i];
      try {
        // Parse date
        const date = parseDate(row[mapping.date] ?? "", input.dateFormat);
        if (!date) {
          errors.push(`Row ${i + 1}: Invalid date "${row[mapping.date]}"`);
          skipped++;
          continue;
        }

        // Parse amount
        const amountVal = parseAmount(row[mapping.amount] ?? "");
        if (amountVal === null || Number.isNaN(amountVal)) {
          errors.push(`Row ${i + 1}: Invalid amount "${row[mapping.amount]}"`);
          skipped++;
          continue;
        }

        // Parse description
        const description = (row[mapping.description] ?? "").trim();
        if (!description) {
          errors.push(`Row ${i + 1}: Empty description`);
          skipped++;
          continue;
        }

        // Determine type
        const type = inferType(row, mapping, input.inferTypeFromSign, amountVal);
        const absoluteAmount = Math.abs(amountVal);

        // Parse status
        const status = parseStatus(row, mapping);

        // Get or create category
        let categoryId: string | undefined;
        if (mapping.category) {
          const catName = (row[mapping.category] ?? "").trim();
          if (catName) {
            const categoryType =
              type === TransactionType.INCOME ? ("INCOME" as const) : ("EXPENSE" as const);
            const existing = await prisma.category.findFirst({
              where: { tenantId: ctx.tenantId, name: { equals: catName, mode: "insensitive" } },
            });
            if (existing) {
              categoryId = existing.id;
            } else {
              const created = await prisma.category.create({
                data: { name: catName, type: categoryType, tenantId: ctx.tenantId },
              });
              categoryId = created.id;
            }
          }
        }

        // Create transaction
        await prisma.transaction.create({
          data: {
            amount: absoluteAmount,
            type,
            description: description.slice(0, 500),
            date,
            bankAccountId: input.bankAccountId,
            categoryId,
            status,
          },
        });

        balanceDelta += type === TransactionType.INCOME ? absoluteAmount : -absoluteAmount;
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
        skipped++;
      }
    }

    // 4. Update bank account balance
    if (balanceDelta !== 0) {
      await prisma.bankAccount.update({
        where: { id: input.bankAccountId },
        data: { currentBalance: { increment: balanceDelta } },
      });
    }

    // 5. Update DataSource
    await prisma.dataSource.update({
      where: { id: source.id },
      data: { lastSyncAt: new Date() },
    });

    return {
      sourceId: source.id,
      imported,
      skipped,
      total: input.rows.length,
      errors: errors.slice(0, 20), // cap errors
    };
  }),
});
