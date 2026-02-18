import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface DeviceAlert {
  id: number;
  deviceId: string;
  deviceName: string | null;
  location: string | null;
  alertType: 'low_battery' | 'offline' | 'not_synced';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  batteryLevel?: number | null;
  lastSyncAt?: Date | null;
}

/**
 * GET - Fetch device alerts for a manager
 * Query params:
 *  - manager_id (required)
 *  - severity (optional): critical, warning, info
 *  - type (optional): low_battery, offline, not_synced
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');
    const severityFilter = searchParams.get('severity');
    const typeFilter = searchParams.get('type');

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    // Fetch all devices for this manager
    const devices = await prisma.deviceStatus.findMany({
      where: {
        manager_id: parseInt(managerId),
        minewSynced: 1, // Only check synced devices
      },
    });

    const alerts: DeviceAlert[] = [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const device of devices) {
      // Critical: Battery below 10%
      if (device.batteryLevel !== null && device.batteryLevel < 10) {
        alerts.push({
          id: device.id,
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location: device.location,
          alertType: 'low_battery',
          severity: 'critical',
          message: `Critical battery level: ${device.batteryLevel}%`,
          batteryLevel: device.batteryLevel,
          lastSyncAt: device.lastSyncAt,
        });
      }
      // Warning: Battery below 20%
      else if (device.batteryLevel !== null && device.batteryLevel < 20) {
        alerts.push({
          id: device.id,
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location: device.location,
          alertType: 'low_battery',
          severity: 'warning',
          message: `Low battery: ${device.batteryLevel}%`,
          batteryLevel: device.batteryLevel,
          lastSyncAt: device.lastSyncAt,
        });
      }

      // Critical: Device offline
      if (device.isOnline === 0) {
        alerts.push({
          id: device.id,
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location: device.location,
          alertType: 'offline',
          severity: 'critical',
          message: 'Device is offline',
          batteryLevel: device.batteryLevel,
          lastSyncAt: device.lastSyncAt,
        });
      }

      // Warning: Not synced in 24 hours
      if (device.lastSyncAt && device.lastSyncAt < twentyFourHoursAgo) {
        alerts.push({
          id: device.id,
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location: device.location,
          alertType: 'not_synced',
          severity: 'warning',
          message: `Not synced for ${Math.floor((now.getTime() - device.lastSyncAt.getTime()) / (1000 * 60 * 60))} hours`,
          batteryLevel: device.batteryLevel,
          lastSyncAt: device.lastSyncAt,
        });
      }
    }

    // Apply filters
    let filteredAlerts = alerts;
    if (severityFilter) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severityFilter);
    }
    if (typeFilter) {
      filteredAlerts = filteredAlerts.filter(a => a.alertType === typeFilter);
    }

    // Calculate statistics
    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      byType: {
        low_battery: alerts.filter(a => a.alertType === 'low_battery').length,
        offline: alerts.filter(a => a.alertType === 'offline').length,
        not_synced: alerts.filter(a => a.alertType === 'not_synced').length,
      },
    };

    return NextResponse.json({
      success: true,
      alerts: filteredAlerts,
      stats,
    });
  } catch (error) {
    console.error('Error fetching device alerts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Mark alert as acknowledged (optional feature for tracking)
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId, alertType, managerId } = await request.json();

    if (!deviceId || !alertType || !managerId) {
      return NextResponse.json(
        { error: 'deviceId, alertType, and managerId are required' },
        { status: 400 }
      );
    }

    // You could create an AlertLog table to track acknowledged alerts
    // For now, we'll just return success
    // TODO: Implement alert acknowledgment tracking

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged',
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      {
        error: 'Failed to acknowledge alert',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
