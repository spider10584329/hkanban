-- Add Minew synchronization tracking fields to products table
-- Migration: add_minew_sync_fields
-- Date: 2026-02-12

ALTER TABLE `products` 
ADD COLUMN `minewSynced` TINYINT NOT NULL DEFAULT 0 COMMENT 'Minew sync status: 0=not synced, 1=synced',
ADD COLUMN `minewSyncedAt` DATETIME NULL COMMENT 'Last successful sync timestamp',
ADD COLUMN `minewGoodsId` VARCHAR(255) NULL COMMENT 'Minew cloud product ID',
ADD COLUMN `minewSyncError` TEXT NULL COMMENT 'Last sync error message';

-- Add index for querying unsynced products
CREATE INDEX `idx_products_minew_synced` ON `products` (`minewSynced`);

-- Add index for Minew goods ID lookup
CREATE INDEX `idx_products_minew_goods_id` ON `products` (`minewGoodsId`);
