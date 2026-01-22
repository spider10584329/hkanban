# QR Code Scanning Feature - Agent Interface

## Overview

The QR Code scanning feature allows agents (staff members) to quickly request product replenishment by scanning QR codes attached to product shelves or storage locations. This streamlines the inventory management process and ensures timely restocking.

## How It Works

### 1. **QR Code Scanner (Camera-based)**

- **Start Camera**: Click the "Start Camera" button to activate the device camera
- **Position QR Code**: Hold the QR code within the scanning frame
- **Automatic Detection**: The system automatically detects and processes the QR code
- **Instant Lookup**: Product information is retrieved immediately
- **Auto-Submit**: A replenishment request is automatically created

### 2. **Manual Entry (Alternative Method)**

If the camera is not available or the QR code is damaged:

1. Enter the **Product SKU** or **QR Code** manually
2. Specify the **Location** where the product is needed
3. (Optional) Enter **Quantity Needed** (defaults to standard order quantity)
4. Select **Priority** level (Normal, High, Urgent)
5. (Optional) Add **Notes** for additional context
6. Click **Submit Request**

## Features

### ✅ Camera Integration
- Uses device camera (front or back)
- Real-time QR code detection
- Automatic focus and frame optimization
- Stop/start scanning on demand

### ✅ Product Lookup
- Searches by SKU or QR code URL
- Validates product exists in inventory
- Shows product details instantly
- Displays product location and category

### ✅ Request Submission
- **Automatic** after successful QR scan
- **Manual** submission for typed entries
- Includes request method tracking (QR_SCAN vs MANUAL)
- Stores device information
- Supports priority levels
- Optional notes field

### ✅ Recent Scans History
- Displays last 5 scanned products
- Shows scan timestamp
- Indicates request status
- Quick reference for recent activity

## User Flow

```
Agent → Click "Start Camera" → Point at QR Code → 
Scan Success → Product Found → Auto-Submit Request → 
Confirmation Alert → Added to Recent Scans
```

Or for manual entry:

```
Agent → Enter Product Code → Enter Location → 
(Optional: Quantity, Priority, Notes) → Submit Request → 
Lookup Product → Auto-Submit Request → Confirmation
```

## API Endpoints Used

### 1. Product Lookup
```
GET /api/products/lookup?manager_id={id}&code={code}
```
- Searches for product by SKU or QR code URL
- Returns complete product details
- Validates product belongs to manager's account

### 2. Create Replenishment Request
```
POST /api/requests
Body: {
  manager_id: number,
  product_id: number,
  requested_by_id: number,
  request_method: 'QR_SCAN' | 'MANUAL' | 'EINK_BUTTON',
  device_info: string (optional),
  requested_qty: number (optional),
  location: string,
  notes: string (optional),
  priority: 'NORMAL' | 'HIGH' | 'URGENT'
}
```
- Creates a new replenishment request
- Sets initial status as 'PENDING'
- Links to product and requesting user
- Tracks request method for analytics

## Technical Implementation

### Libraries Used
- **html5-qrcode**: QR code scanning via browser camera
  - Supports multiple devices
  - Cross-browser compatibility
  - Built-in error handling

### State Management
- React hooks (`useState`, `useEffect`, `useRef`)
- Local state for form inputs
- Session storage for user authentication
- Real-time scanner state management

### Security & Validation
- User authentication required (userId and managerId from localStorage)
- Product validation (must exist and belong to manager)
- Input validation (required fields enforced)
- Manager-specific data isolation

## Permissions Required

### Camera Access
The browser will request camera permissions when you click "Start Camera":

**Chrome/Edge:**
- Click "Allow" when prompted
- Or go to Settings → Privacy → Camera → Allow for this site

**Firefox:**
- Click "Allow" when prompted
- Or go to Page Info → Permissions → Use the Camera → Allow

**Safari (iOS):**
- Settings → Safari → Camera → Allow

## Troubleshooting

### Camera Not Working

**Issue**: "Failed to start camera" error

**Solutions**:
1. **Grant permissions**: Ensure browser has camera access
2. **Check device**: Verify camera is not being used by another app
3. **Try different browser**: Some browsers have better camera support
4. **Use manual entry**: If camera unavailable, use manual code entry

### Product Not Found

**Issue**: "Product not found" after scan

**Solutions**:
1. **Verify QR code**: Ensure it's a valid product QR code
2. **Check product status**: Product must be active in the system
3. **Manager scope**: Product must belong to your organization
4. **Use manual entry**: Try entering the SKU/code manually

### Request Failed

**Issue**: "Failed to submit request" error

**Solutions**:
1. **Check authentication**: Sign out and sign back in
2. **Fill required fields**: Location is mandatory
3. **Verify product**: Ensure product exists in inventory
4. **Check network**: Ensure stable internet connection

## Best Practices

### For Agents (Staff)

1. **Keep camera steady**: Hold device still for 1-2 seconds
2. **Good lighting**: Ensure QR code is well-lit
3. **Correct distance**: Hold device 6-12 inches from QR code
4. **Clean lens**: Wipe camera lens if unclear
5. **Add notes**: Provide context for urgent requests
6. **Verify details**: Check product name before confirming

### For Administrators

1. **Print clear QR codes**: Use high-quality printing
2. **Laminate codes**: Protect from wear and tear
3. **Strategic placement**: Position codes at eye level
4. **Consistent locations**: Keep codes in predictable spots
5. **Regular audits**: Verify QR codes are up to date
6. **Train staff**: Ensure agents know how to use the system

## Priority Levels

| Priority | Use Case | Example |
|----------|----------|---------|
| **NORMAL** | Standard replenishment | Regular restocking |
| **HIGH** | Stock running low | Less than 20% remaining |
| **URGENT** | Critical shortage | Out of stock or emergency |

## Request Workflow

1. **Agent** scans QR code or enters product code
2. **System** creates request with status "PENDING"
3. **Admin** reviews request in admin panel
4. **Admin** approves/rejects request
5. **System** creates order (if approved)
6. **Admin** marks order as completed
7. **System** updates request status to "COMPLETED"

## Data Tracked

For each scan/request:
- Product information (ID, name, SKU)
- Request method (QR_SCAN, MANUAL, EINK_BUTTON)
- Device information
- Agent details (who requested)
- Location (where needed)
- Timestamp (when requested)
- Priority level
- Optional notes
- Status history

## Mobile Optimization

The scanning interface is fully responsive and optimized for:
- ✅ Smartphones (iOS, Android)
- ✅ Tablets
- ✅ Desktop computers with webcams

**Recommended**: Use on mobile devices for best camera experience.

## Future Enhancements

- [ ] Barcode scanning support
- [ ] Offline mode with sync
- [ ] Voice input for notes
- [ ] Multi-product scanning (cart mode)
- [ ] Scan history export
- [ ] Push notifications for request updates
- [ ] Integration with E-ink devices
- [ ] Analytics dashboard for scan patterns

---

**Need Help?** Contact your system administrator or refer to the main project documentation.
