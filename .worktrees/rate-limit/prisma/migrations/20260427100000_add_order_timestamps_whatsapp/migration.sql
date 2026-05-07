-- Add order status timestamps and tenant whatsapp phone

-- Add whatsapp_phone to Tenant
ALTER TABLE "tenants" ADD COLUMN "whatsapp_phone" TEXT;

-- Add status timestamps to Order
ALTER TABLE "orders" ADD COLUMN "paid_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "confirmed_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "ready_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "delivered_at" TIMESTAMP(3);
