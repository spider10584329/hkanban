import { NextRequest, NextResponse } from 'next/server';
import { MinewESLManager, listStores, testMinewConnection } from '@/lib/minew';

/**
 * GET - Get comprehensive Minew ESL dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    // First, test the connection
    const connectionStatus = await testMinewConnection();

    if (!connectionStatus.connected) {
      return NextResponse.json({
        success: false,
        connected: false,
        message: connectionStatus.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Get list of stores
    const stores = await listStores();

    // If a specific store is requested, get detailed status
    if (storeId) {
      const manager = new MinewESLManager(storeId);
      const storeStatus = await manager.getStoreStatus();

      return NextResponse.json({
        success: true,
        connected: true,
        message: 'Connected to Minew ESL Cloud',
        stores,
        currentStore: {
          id: storeId,
          ...storeStatus,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Return general dashboard with all stores summary
    const storesSummary = [];
    for (const store of stores.slice(0, 5)) { // Limit to 5 stores to avoid timeout
      try {
        const storeIdToUse = store.storeId || store.id;
        if (!storeIdToUse) {
          console.warn('Store has no storeId or id:', store);
          continue;
        }
        const manager = new MinewESLManager(storeIdToUse);
        const status = await manager.getStoreStatus();
        storesSummary.push({
          storeId: storeIdToUse,
          name: store.name,
          number: store.number,
          ...status,
        });
      } catch (err) {
        const storeIdToUse = store.storeId || store.id;
        console.error(`Error fetching status for store ${storeIdToUse}:`, err);
        storesSummary.push({
          storeId: storeIdToUse,
          name: store.name,
          number: store.number,
          error: 'Failed to fetch status',
        });
      }
    }

    // Calculate totals
    const totals = storesSummary.reduce(
      (acc, store) => {
        if ('gateways' in store && store.gateways) {
          acc.gateways.total += store.gateways.total || 0;
          acc.gateways.online += store.gateways.online || 0;
          acc.gateways.offline += store.gateways.offline || 0;
        }
        if ('eslTags' in store && store.eslTags) {
          acc.eslTags.total += store.eslTags.total || 0;
          acc.eslTags.online += store.eslTags.online || 0;
          acc.eslTags.offline += store.eslTags.offline || 0;
          acc.eslTags.lowBattery += store.eslTags.lowBattery || 0;
          acc.eslTags.bound += store.eslTags.bound || 0;
          acc.eslTags.unbound += store.eslTags.unbound || 0;
        }
        if ('warnings' in store && typeof store.warnings === 'number') {
          acc.warnings += store.warnings;
        }
        return acc;
      },
      {
        gateways: { total: 0, online: 0, offline: 0 },
        eslTags: { total: 0, online: 0, offline: 0, lowBattery: 0, bound: 0, unbound: 0 },
        warnings: 0,
      }
    );

    return NextResponse.json({
      success: true,
      connected: true,
      message: 'Connected to Minew ESL Cloud',
      stores,
      storesSummary,
      totals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching Minew dashboard:', error);
    return NextResponse.json(
      {
        success: false,
        connected: false,
        message: error instanceof Error ? error.message : 'Failed to fetch dashboard',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
