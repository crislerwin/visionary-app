-- CreateEnum
CREATE TYPE "data_source_types" AS ENUM ('PLUGGY', 'WEBHOOK', 'CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "data_source_statuses" AS ENUM ('ACTIVE', 'ERROR', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "data_source_types" NOT NULL,
    "status" "data_source_statuses" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB,
    "tenant_id" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_calls" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_tenant_id_type_name_key" ON "data_sources"("tenant_id", "type", "name");

-- CreateIndex
CREATE INDEX "data_sources_tenant_id_idx" ON "data_sources"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_calls_source_id_idx" ON "webhook_calls"("source_id");

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_calls" ADD CONSTRAINT "webhook_calls_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
