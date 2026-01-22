# E-ink Device Status Management

## Understanding Online/Offline Status

### How Device Status Works

When you register a new E-ink device in the system, it initially shows as **Offline**. This is the expected behavior because:

1. **New Registration**: The device has been added to your local database but hasn't communicated with the MinewTag cloud platform yet.

2. **Real-time Sync Required**: The device status (Online/Offline) reflects the actual connectivity state from the Minew cloud platform.

3. **Automatic Updates**: In production, devices sync their status automatically when they:
   - Power on and connect to the network
   - Send periodic heartbeat signals
   - Update their display content
   - Report battery levels

### Status Indicators

| Status | Meaning | Badge Color |
|--------|---------|-------------|
| **Online** | Device is connected and communicating with MinewTag cloud | Green |
| **Offline** | Device is newly registered, powered off, or not connected | Red |

### Making Devices Online

There are several ways a device becomes "Online":

#### 1. **Sync Status Button** (Recommended)
- Click the **"Sync Status"** button at the top of the devices page
- This fetches the latest status from the MinewTag cloud platform
- All registered devices will be updated with their current connectivity state

#### 2. **Manual Toggle** (Testing Only)
- Click on the status badge (Online/Offline) in the table
- This manually toggles the status for testing purposes
- **Note**: This is for development/testing only and doesn't reflect actual device state

#### 3. **Automatic Sync via MinewTag API** (Production)
- Configure Minew API credentials in your `.env` file:
  ```env
  MINEW_API_BASE=https://api.minew.com
  MINEW_API_KEY=your_api_key_here
  MINEW_API_SECRET=your_api_secret_here
  ```
- The system will automatically sync device status from the cloud
- Devices will show as Online when they're actually connected to the MinewTag platform

### Device Lifecycle

```
1. Register Device (MAC Address)
   ↓
   Status: Offline (default)
   
2. Physical Device Powers On
   ↓
   Device connects to MinewTag cloud
   
3. Click "Sync Status" Button
   ↓
   System fetches status from Minew API
   ↓
   Status: Online ✓
   
4. Device Reports Data
   ↓
   Battery level, display status updated
   ↓
   Last Sync timestamp updated
```

### API Endpoints

#### GET `/api/devices`
Fetch all devices for a manager with their current status.

#### POST `/api/devices`
Register a new device (starts as Offline).

#### PUT `/api/devices`
Update device information (name, location, etc.).

#### DELETE `/api/devices`
Remove a device from the system.

#### POST `/api/devices/sync`
Sync all devices with MinewTag cloud platform to get real-time status.

#### PATCH `/api/devices/toggle`
Manually toggle device online/offline status (for testing only).

### Troubleshooting

**Q: Why is my device showing as Offline?**
A: 
- The device may not be powered on
- The device hasn't connected to the network yet
- The device hasn't been registered in the MinewTag cloud platform
- You haven't clicked "Sync Status" to fetch the latest state

**Q: How do I make a device Online?**
A:
1. Ensure the physical device is powered on and connected to the network
2. Make sure the device is registered in the MinewTag cloud platform
3. Click "Sync Status" to fetch the current state from the cloud
4. For testing: Click the status badge to manually toggle

**Q: How often does the status update?**
A:
- Manually: Click "Sync Status" anytime
- Automatically: Configure a webhook from MinewTag to receive real-time updates
- On page load: Status is fetched from your database (last known state)

### Production Setup

For production use with actual MinewTag devices:

1. **Configure API Credentials**: Add Minew API keys to your environment variables

2. **Set Up Webhooks**: Configure MinewTag webhooks to notify your system of status changes

3. **Schedule Periodic Syncs**: Set up a cron job or scheduled task to regularly sync device status:
   ```bash
   # Example: Sync every 5 minutes
   */5 * * * * curl -X POST http://yourapp.com/api/devices/sync
   ```

4. **Monitor Device Health**: Use the dashboard stats to track online/offline devices and set up alerts for prolonged offline periods

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Initial Status | Offline | Offline |
| Status Update | Manual toggle + Sync button | Automatic sync + Webhooks |
| API Integration | Optional (mock data) | Required (real MinewTag API) |
| Refresh Rate | Manual | Real-time or scheduled |

---

For more information about the MinewTag API, refer to the `minew API.pdf` documentation in the project root.
