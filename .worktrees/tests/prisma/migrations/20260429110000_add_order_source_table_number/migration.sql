-- Add source and table_number to Order

-- Add source field to Order
ALTER TABLE "orders" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEB';

-- Add table_number field to Order
ALTER TABLE "orders" ADD COLUMN "table_number" TEXT;
