import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

// Sync device status from Minew API
export async function POST(request: NextRequest) {
  try {
    const { manager_id } = await request.json();

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const minewApiBase = process.env.MINEW_API_BASE || 'https://api.minew.com';
    const minewApiKey = process.env.MINEW_API_KEY;
    const minewApiSecret = process.env.MINEW_API_SECRET;

    if (!minewApiKey || !minewApiSecret) {
      return NextResponse.json(
        { error: 'Minew API credentials not configured' },
        { status: 500 }
      );
    }

    // Get all registered devices for this manager
    const registeredDevices = await prisma.deviceStatus.findMany({
      where: {
        manager_id: parseInt(manager_id),
      },
    });

    if (registeredDevices.length === 0) {
      return NextResponse.json({
        message: 'No devices to sync',
        synced: 0,
      });
    }

    let syncedCount = 0;
    const errors: string[] = [];

    // Sync each device with Minew API
    for (const device of registeredDevices) {
      try {
        // Call Minew API to get device status
        // NOTE: Replace this with actual Minew API endpoint structure
        const response = await axios.get(
          `${minewApiBase}/v1/devices/${device.deviceId}`,
          {
            headers: {
              'Authorization': `Bearer ${minewApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );

        if (response.data) {
          const minewDevice = response.data;
          
          // Update device status in database
          await prisma.deviceStatus.update({
            where: { id: device.id },
            data: {
              isOnline: minewDevice.online ? 1 : 0,
              batteryLevel: minewDevice.battery || null,
              lastSyncAt: new Date(),
              firmwareVersion: minewDevice.firmwareVersion || device.firmwareVersion,
              currentDisplay: minewDevice.currentDisplay || device.currentDisplay,
              updatedAt: new Date(),
            },
          });

          syncedCount++;
        }
      } catch (deviceError: any) {
        console.error(`Error syncing device ${device.deviceId}:`, deviceError?.message);
        
        // If device not found in Minew (404), mark as offline
        if (deviceError?.response?.status === 404) {
          await prisma.deviceStatus.update({
            where: { id: device.id },
            data: {
              isOnline: 0,
              updatedAt: new Date(),
            },
          });
        }
        
        errors.push(`${device.deviceId}: ${deviceError?.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: `Synced ${syncedCount} of ${registeredDevices.length} devices`,
      synced: syncedCount,
      total: registeredDevices.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Error syncing devices:', error);
    return NextResponse.json(
      { error: 'Failed to sync devices' },
      { status: 500 }
    );
  }
}
