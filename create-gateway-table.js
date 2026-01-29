const mysql = require('mysql2/promise');

async function createGatewayTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'node_svc',
      password: 'Defender-payment-separate',
      database: 'hkanban'
    });

    console.log('Connected to database...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS gateway (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        mac_address VARCHAR(20) NOT NULL,
        manager_id INT NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE INDEX unique_manager_mac (manager_id, mac_address),
        INDEX gateway_manager_id_idx (manager_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Gateway table created successfully!');

    await connection.end();
    console.log('Connection closed.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. MySQL is running');
    console.error('2. Database credentials in setupENV file are correct');
    console.error('3. User has permissions to create tables');
    process.exit(1);
  }
}

createGatewayTable();
