# Gateway Feature - Setup Instructions

## ⚠️ Important: Complete These Steps to Fix the Errors

The gateway feature has been implemented but requires database setup to work properly.

## Step 1: Create the Database Table

You have **3 options** to create the gateway table:

### Option A: Using the Node.js script (Recommended)
```bash
node create-gateway-table.js
```

### Option B: Using Prisma CLI
```bash
npx prisma db push
```

### Option C: Run SQL directly in your MySQL client
```sql
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
```

## Step 2: Regenerate Prisma Client

After creating the table, regenerate the Prisma client:

```bash
# Stop your dev server first (Ctrl+C)
npx prisma generate

# Then restart your dev server
npm run dev
```

**Note**: If you get permission errors during `npx prisma generate`:
1. Stop all running Node processes
2. Close any terminals running the dev server
3. Try again

## Step 3: Verify the Setup

1. Navigate to the Devices page in your app
2. Click on the "Gateway" tab
3. Click the "Add" button
4. You should see the modal with Name and MAC address fields

## Troubleshooting

### Error: "Property 'gateway' does not exist on type 'PrismaClient'"
- **Solution**: You need to run `npx prisma generate` after creating the table

### Error: "Access denied for user"
- **Solution**: Check your database credentials in the `setupENV` file
- The default credentials are:
  - User: `node_svc`
  - Password: `Defender-payment-separate`
  - Database: `hkanban`

### Error: "Table 'gateway' doesn't exist"
- **Solution**: Run one of the table creation options above

### Modal not opening when clicking Add
- **Solution**: Clear your browser cache and restart the dev server

## Features Implemented

✅ Database schema for gateway table
✅ API routes for gateway CRUD operations
✅ Minew API integration for gateway registration
✅ UI modal with clean design
✅ Gateway table display
✅ Add and delete functionality

## How It Works

1. **User clicks Add** → Modal opens
2. **User enters Name and MAC address** → Form validation
3. **On submit**:
   - Validates MAC address format
   - Registers gateway with Minew Cloud API
   - If successful, saves to local database
   - Refreshes the gateway list
4. **Displays in table** with creation date and delete option

## API Integration

The implementation uses:
- **Minew API**: `https://cloud.minewesl.com/apis/esl/gateway/add`
- **Local API**: `/api/gateway` (POST, GET, DELETE)

The workflow ensures data consistency by:
1. First registering with Minew (external system)
2. Then saving to local database
3. Rolling back if either step fails
