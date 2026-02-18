import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listGateways, listESLTags } from '@/lib/minew';

/**
 * GET - Fetch ESL devices grouped by gateway
 * Query params:
 *  - manager_id (required): Administrator identifier
 *  - storeId (required): Minew store ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');
    const storeId = searchParams.get('storeId');

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    // Get gateways from local database for this manager
    const localGateways = await prisma.gateway.findMany({
      where: {
        manager_id: parseInt(managerId),
      },
    });

    // Get gateways from Minew for this store
    const minewGateways = await listGateways(storeId);

    // Get ESL tags from Minew for this store
    const minewTags = await listESLTags(storeId, { size: 1000 });

    // Get local devices for this manager and store
    const localDevices = await prisma.deviceStatus.findMany({
      where: {
        manager_id: parseInt(managerId),
        minewStoreId: storeId,
      },
    });

    // Match gateways: local + Minew
    const matchedGateways = localGateways.map(localGw => {
      const localMac = localGw.mac_address.replace(/[:-]/g, '').toUpperCase();
      const minewGw = minewGateways.find(mg => {
        const minewMac = mg.mac.replace(/[:-]/g, '').toUpperCase();
        return minewMac === localMac;
      });

      return {
        id: localGw.id,
        name: localGw.name,
        mac: localGw.mac_address,
        isOnline: minewGw?.mode === 1,
        minewId: minewGw?.id,
        version: minewGw?.version,
      };
    });

    // Match devices: local + Minew
    const enrichedDevices = localDevices.map(localDev => {
      const localMac = localDev.deviceId.replace(/[:-]/g, '').toLowerCase();
      const minewTag = minewTags.items.find(mt => {
        const minewMac = mt.mac.replace(/[:-]/g, '').toLowerCase();
        return minewMac === localMac || minewMac.includes(localMac.slice(-6));
      });

      return {
        ...localDev,
        minewData: minewTag ? {
          id: minewTag.id,
          mac: minewTag.mac,
          isOnline: minewTag.isOnline === '2',
          battery: minewTag.battery,
          bound: minewTag.bind === '1',
          goodsId: minewTag.goodsId,
          screenSize: minewTag.screenSize,
          screenColor: minewTag.screenInfo?.color,
        } : null,
      };
    });

    // Calculate statistics
    const stats = {
      totalGateways: matchedGateways.length,
      onlineGateways: matchedGateways.filter(g => g.isOnline).length,
      totalDevices: enrichedDevices.length,
      onlineDevices: enrichedDevices.filter(d => d.isOnline === 1).length,
      boundDevices: enrichedDevices.filter(d => d.minewBound === 1).length,
      lowBatteryDevices: enrichedDevices.filter(d => d.batteryLevel && d.batteryLevel < 20).length,
    };

    return NextResponse.json({
      success: true,
      gateways: matchedGateways,
      devices: enrichedDevices,
      stats,
    });
  } catch (error) {
    console.error('Error fetching devices by gateway:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch devices by gateway',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
