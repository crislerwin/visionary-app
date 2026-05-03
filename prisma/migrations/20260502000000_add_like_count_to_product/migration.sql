-- Add like_count column to products table

ALTER TABLE "products" ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0;
