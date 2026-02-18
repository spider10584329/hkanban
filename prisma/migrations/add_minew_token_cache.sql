-- Migration: Add Minew token cache table
-- Created: 2026-02-13

CREATE TABLE IF NOT EXISTS minew_token_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  lastRefreshedAt DATETIME NOT NULL,
  username VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expires (expiresAt),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add Minew sync configuration table for storing store mapping
CREATE TABLE IF NOT EXISTS minew_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  configKey VARCHAR(255) NOT NULL UNIQUE,
  configValue TEXT NOT NULL,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (configKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Minew store ID (will be populated on first sync)
INSERT INTO minew_config (configKey, configValue, description) 
VALUES ('default_store_id', '', 'Default Minew store ID for all products')
ON DUPLICATE KEY UPDATE configKey = configKey;

-- Add retry queue for failed syncs
CREATE TABLE IF NOT EXISTS minew_sync_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entityType ENUM('product', 'order', 'device') NOT NULL,
  entityId INT NOT NULL,
  operation ENUM('create', 'update', 'delete') NOT NULL,
  payload JSON NOT NULL,
  retryCount INT DEFAULT 0,
  maxRetries INT DEFAULT 3,
  lastError TEXT,
  status ENUM('pending', 'processing', 'success', 'failed') DEFAULT 'pending',
  scheduledAt DATETIME NOT NULL,
  processedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_scheduled (status, scheduledAt),
  INDEX idx_entity (entityType, entityId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
