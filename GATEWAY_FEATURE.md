# Gateway Feature Implementation

## Database Setup

The Gateway table needs to be created in your MySQL database. Run the following SQL command:

```sql
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
```

## Prisma Client Generation

After creating the table, regenerate the Prisma client:

```bash
npx prisma generate
```

If you encounter permission errors, try:
1. Close your development server
2. Run the command again
3. Restart your development server

## Features Implemented

### 1. Database Schema
- Created `Gateway` model in `prisma/schema.prisma`
- Table name: `gateway`
- Fields:
  - `id`: Auto-increment primary key
  - `name`: Gateway name (VARCHAR 255)
  - `mac_address`: MAC address (VARCHAR 20)
  - `manager_id`: Manager/tenant ID
  - `created_at`: Creation timestamp

### 2. API Route (`/api/gateway/route.ts`)
- **POST**: Register a new gateway
  - Validates MAC address format
  - Registers with Minew API first
  - Saves to local database on success
  - Returns error if either step fails
- **GET**: List all gateways for a manager
- **DELETE**: Delete a gateway by ID

### 3. UI Components
- **Add Gateway Modal**: Clean modal with Name and MAC address fields
- **Gateway Table**: Displays all registered gateways with:
  - Gateway name
  - MAC address (monospace font)
  - Creation timestamp
  - Delete button
- **Add Button**: Opens the modal to register new gateway

### 4. Workflow
1. User clicks "Add" button in Gateway tab
2. Modal opens with two fields: Name and MAC address
3. User enters gateway information
4. On submit:
   - Validates input
   - Calls Minew API to register gateway (`/apis/esl/gateway/add`)
   - If successful, saves to local database
   - Refreshes gateway list
   - Shows success message
5. Gateways are displayed in the table with delete option

## API Integration

The implementation uses the Minew Gateway API:
- **Endpoint**: `https://cloud.minewesl.com/apis/esl/gateway/add`
- **Method**: POST
- **Parameters**:
  - `token`: From login (handled in `minew.ts`)
  - `mac`: Gateway MAC address
  - `name`: Gateway name
  - `storeId`: Store ID (selected from dropdown)

## Testing

1. Ensure you have a Minew store selected
2. Click the "Add" button in the Gateway tab
3. Enter gateway name and MAC address
4. Click "Confirm"
5. Gateway should appear in the table if registration succeeds

## Troubleshooting

- **MAC Address Format**: Should be 12 hexadecimal characters (colons/hyphens optional)
- **Minew API Errors**: Check that store is selected and credentials are correct
- **Database Errors**: Ensure table is created and Prisma client is regenerated
