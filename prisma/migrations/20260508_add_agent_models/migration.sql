CREATE TYPE "AgentTone" AS ENUM ('FRIENDLY', 'PROFESSIONAL', 'CASUAL', 'FORMAL');

CREATE TYPE "AgentInteractionStatus" AS ENUM ('SUCCESS', 'ERROR', 'PENDING');

CREATE TYPE "AgentInteractionType" AS ENUM ('ORDER_CREATE', 'ORDER_LIST', 'CONFIG_GET', 'CONFIG_UPDATE', 'UNKNOWN');

CREATE TABLE "agent_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "prompt_system" TEXT NOT NULL,
    "welcome_message" TEXT,
    "tone" "AgentTone" NOT NULL DEFAULT 'CASUAL',
    "auto_confirm" BOOLEAN NOT NULL DEFAULT false,
    "working_hours" JSONB,
    "webhook_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "agent_name" TEXT DEFAULT 'Sofia',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_interaction_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "agent_config_id" TEXT NOT NULL,
    "type" "AgentInteractionType" NOT NULL DEFAULT 'UNKNOWN',
    "status" "AgentInteractionStatus" NOT NULL DEFAULT 'PENDING',
    "customer_phone" TEXT,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "duration_ms" INTEGER,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_interaction_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_configs_tenant_id_key" ON "agent_configs"("tenant_id");
CREATE INDEX "agent_configs_tenant_id_idx" ON "agent_configs"("tenant_id");
CREATE INDEX "agent_configs_is_active_idx" ON "agent_configs"("is_active");
CREATE INDEX "agent_interaction_logs_tenant_id_idx" ON "agent_interaction_logs"("tenant_id");
CREATE INDEX "agent_interaction_logs_agent_config_id_idx" ON "agent_interaction_logs"("agent_config_id");
CREATE INDEX "agent_interaction_logs_created_at_idx" ON "agent_interaction_logs"("created_at");
CREATE INDEX "agent_interaction_logs_customer_phone_idx" ON "agent_interaction_logs"("customer_phone");

ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_interaction_logs" ADD CONSTRAINT "agent_interaction_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_interaction_logs" ADD CONSTRAINT "agent_interaction_logs_agent_config_id_fkey" FOREIGN KEY ("agent_config_id") REFERENCES "agent_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
