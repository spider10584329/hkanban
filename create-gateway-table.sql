-- Create gateway table for hKanban project
-- Run this with: mysql -u node_svc -p hkanban < create-gateway-table.sql
-- Password: Defender-payment-separate

CREATE TABLE IF NOT EXISTS gateway (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mac_address VARCHAR(20) NOT NULL,
    manager_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_manager_id (manager_id),
    UNIQUE KEY unique_manager_mac (manager_id, mac_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table was created
DESCRIBE gateway;

SELECT 'Gateway table created successfully!' AS status;
