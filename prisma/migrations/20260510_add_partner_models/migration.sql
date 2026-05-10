-- CreateEnum
CREATE TYPE "partner_types" AS ENUM ('SUPPLIER', 'AFFILIATE', 'DISTRIBUTOR', 'SERVICE_PROVIDER', 'OTHER');

-- CreateEnum
CREATE TYPE "partner_statuses" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "commission_types" AS ENUM ('PERCENTAGE', 'FIXED', 'HYBRID');

-- CreateEnum
CREATE TYPE "partner_invoice_statuses" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "partner_types" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "document" TEXT,
    "pix_key" TEXT,
    "bank_name" TEXT,
    "bank_agency" TEXT,
    "bank_account" TEXT,
    "bank_account_type" TEXT,
    "commission_type" "commission_types" NOT NULL DEFAULT 'PERCENTAGE',
    "commission_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "partner_statuses" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_invoices" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "status" "partner_invoice_statuses" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partners_tenant_id_idx" ON "partners"("tenant_id");
CREATE INDEX "partners_status_idx" ON "partners"("status");
CREATE INDEX "partners_type_idx" ON "partners"("type");
CREATE INDEX "partners_name_idx" ON "partners"("name");

-- CreateIndex
CREATE INDEX "partner_invoices_partner_id_idx" ON "partner_invoices"("partner_id");
CREATE INDEX "partner_invoices_tenant_id_idx" ON "partner_invoices"("tenant_id");
CREATE INDEX "partner_invoices_status_idx" ON "partner_invoices"("status");
CREATE INDEX "partner_invoices_due_date_idx" ON "partner_invoices"("due_date");

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_invoices" ADD CONSTRAINT "partner_invoices_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_invoices" ADD CONSTRAINT "partner_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
