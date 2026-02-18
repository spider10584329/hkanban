import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET - Device analytics and trends
 * Query params:
 *  - manager_id (required)
 *  - period (optional): day, week, month, year
 *  - groupBy (optional): store, location, deviceType
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');
    const period = searchParams.get('period') || 'week';
    const groupBy = searchParams.get('groupBy');

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Fetch all devices for this manager
    const devices = await prisma.deviceStatus.findMany({
      where: {
        manager_id: parseInt(managerId),
      },
    });

    // Overall statistics
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.isOnline === 1).length;
    const offlineDevices = totalDevices - onlineDevices;
    const boundDevices = devices.filter(d => d.minewBound === 1).length;
    const unboundDevices = devices.filter(d => d.minewSynced === 1 && d.minewBound === 0).length;

    // Battery statistics
    const devicesWithBattery = devices.filter(d => d.batteryLevel !== null);
    const averageBattery =
      devicesWithBattery.length > 0
        ? devicesWithBattery.reduce((sum, d) => sum + (d.batteryLevel || 0), 0) /
          devicesWithBattery.length
        : 0;

    const batteryDistribution = {
      critical: devices.filter(d => d.batteryLevel !== null && d.batteryLevel < 10).length,
      low: devices.filter(d => d.batteryLevel !== null && d.batteryLevel >= 10 && d.batteryLevel < 20).length,
      medium: devices.filter(d => d.batteryLevel !== null && d.batteryLevel >= 20 && d.batteryLevel < 50).length,
      good: devices.filter(d => d.batteryLevel !== null && d.batteryLevel >= 50 && d.batteryLevel < 80).length,
      excellent: devices.filter(d => d.batteryLevel !== null && d.batteryLevel >= 80).length,
    };

    // Sync activity
    const recentlySynced = devices.filter(
      d => d.lastSyncAt && new Date(d.lastSyncAt) > startDate
    ).length;

    const neverSynced = devices.filter(d => !d.lastSyncAt).length;

    // Group by analysis
    let groupedData: any = null;

    if (groupBy === 'store') {
      const storeGroups: Record<string, any> = {};
      devices.forEach(device => {
        const store = device.minewStoreId || 'unassigned';
        if (!storeGroups[store]) {
          storeGroups[store] = {
            storeId: store,
            total: 0,
            online: 0,
            offline: 0,
            bound: 0,
            unbound: 0,
            averageBattery: 0,
            batterySum: 0,
            batteryCount: 0,
          };
        }
        storeGroups[store].total++;
        if (device.isOnline === 1) storeGroups[store].online++;
        else storeGroups[store].offline++;
        if (device.minewBound === 1) storeGroups[store].bound++;
        else if (device.minewSynced === 1) storeGroups[store].unbound++;
        if (device.batteryLevel !== null) {
          storeGroups[store].batterySum += device.batteryLevel;
          storeGroups[store].batteryCount++;
        }
      });

      // Calculate average battery per store
      Object.values(storeGroups).forEach((group: any) => {
        if (group.batteryCount > 0) {
          group.averageBattery = Math.round(group.batterySum / group.batteryCount);
        }
        delete group.batterySum;
        delete group.batteryCount;
      });

      groupedData = Object.values(storeGroups);
    } else if (groupBy === 'location') {
      const locationGroups: Record<string, any> = {};
      devices.forEach(device => {
        const location = device.location || 'unassigned';
        if (!locationGroups[location]) {
          locationGroups[location] = {
            location,
            total: 0,
            online: 0,
            offline: 0,
          };
        }
        locationGroups[location].total++;
        if (device.isOnline === 1) locationGroups[location].online++;
        else locationGroups[location].offline++;
      });
      groupedData = Object.values(locationGroups);
    } else if (groupBy === 'deviceType') {
      const typeGroups: Record<string, any> = {};
      devices.forEach(device => {
        const type = device.deviceType || 'unknown';
        if (!typeGroups[type]) {
          typeGroups[type] = {
            deviceType: type,
            total: 0,
            online: 0,
            offline: 0,
          };
        }
        typeGroups[type].total++;
        if (device.isOnline === 1) typeGroups[type].online++;
        else typeGroups[type].offline++;
      });
      groupedData = Object.values(typeGroups);
    }

    // Device health score (0-100)
    let healthScore = 100;
    if (totalDevices > 0) {
      const offlineRatio = offlineDevices / totalDevices;
      const lowBatteryRatio = batteryDistribution.critical / totalDevices;
      const notSyncedRatio = neverSynced / totalDevices;

      healthScore = Math.max(
        0,
        100 - offlineRatio * 30 - lowBatteryRatio * 40 - notSyncedRatio * 30
      );
      healthScore = Math.round(healthScore);
    }

    return NextResponse.json({
      success: true,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      summary: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        onlinePercentage: totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0,
        boundDevices,
        unboundDevices,
        bindingRate: totalDevices > 0 ? Math.round((boundDevices / totalDevices) * 100) : 0,
        healthScore,
      },
      battery: {
        average: Math.round(averageBattery),
        distribution: batteryDistribution,
      },
      syncActivity: {
        recentlySynced,
        neverSynced,
        syncRate: totalDevices > 0 ? Math.round((recentlySynced / totalDevices) * 100) : 0,
      },
      groupedData,
    });
  } catch (error) {
    console.error('Error fetching device analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
