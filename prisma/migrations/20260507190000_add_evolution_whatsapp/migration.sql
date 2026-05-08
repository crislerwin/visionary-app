-- Add Evolution API WhatsApp fields to AgentConfig

-- Add columns
ALTER TABLE "agent_configs" 
ADD COLUMN IF NOT EXISTS "evolution_instance_name" TEXT,
ADD COLUMN IF NOT EXISTS "evolution_instance_id" TEXT,
ADD COLUMN IF NOT EXISTS "whatsapp_status" TEXT DEFAULT 'DISCONNECTED',
ADD COLUMN IF NOT EXISTS "whatsapp_phone" TEXT,
ADD COLUMN IF NOT EXISTS "whatsapp_qr_code" TEXT,
ADD COLUMN IF NOT EXISTS "whatsapp_pairing_code" TEXT,
ADD COLUMN IF NOT EXISTS "whatsapp_connected_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "whatsapp_disconnected_at" TIMESTAMP(3);

-- Add index for instance name lookup
CREATE INDEX IF NOT EXISTS "agent_configs_evolution_instance_name_idx" 
ON "agent_configs"("evolution_instance_name");
