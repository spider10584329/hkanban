-- Create gateway table
CREATE TABLE IF NOT EXISTS `gateway` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `mac_address` VARCHAR(20) NOT NULL,
  `manager_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_manager_mac` (`manager_id`, `mac_address`),
  INDEX `gateway_manager_id_idx` (`manager_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
