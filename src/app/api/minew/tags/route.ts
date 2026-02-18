import { NextRequest, NextResponse } from 'next/server';
import {
  listESLTags,
  getESLTag,
  importESLTags,
  deleteESLTags,
  wakeupESLTags,
  locateESLTag,
  getESLTagStats,
  testMinewConnection,
} from '@/lib/minew';

/**
 * GET - List ESL tags for a store or get tag details
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const mac = searchParams.get('mac');
    const stats = searchParams.get('stats');
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '50');
    const status = searchParams.get('status') as 'online' | 'offline' | 'lowBattery' | 'bound' | 'unbound' | null;

    // Test connection first to ensure we have a valid token
    const connectionStatus = await testMinewConnection();
    
    if (!connectionStatus.connected) {
      console.error('Minew connection failed:', connectionStatus.message);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Minew cloud',
          details: connectionStatus.message,
          tags: [] // Return empty array to prevent frontend errors
        },
        { status: 503 }
      );
    }

    // Get single tag by MAC
    if (mac) {
      const tag = await getESLTag(mac);
      if (!tag) {
        return NextResponse.json(
          { error: 'Tag not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ tag });
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    // Get stats
    if (stats === 'true') {
      const tagStats = await getESLTagStats(storeId);
      return NextResponse.json({ stats: tagStats });
    }

    // List tags
    const result = await listESLTags(storeId, { page, size, status: status || undefined });
    return NextResponse.json({
      tags: result.items,
      total: result.total,
      page,
      size,
    });
  } catch (error) {
    console.error('Error fetching ESL tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ESL tags', tags: [] },
      { status: 500 }
    );
  }
}

/**
 * POST - Import ESL tags or perform actions (wakeup, locate)
 */
export async function POST(request: NextRequest) {
  try {
    const { action, storeId, macAddresses, mac } = await request.json();

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'import': {
        if (!macAddresses || !Array.isArray(macAddresses) || macAddresses.length === 0) {
          return NextResponse.json(
            { error: 'macAddresses array is required for import' },
            { status: 400 }
          );
        }

        // Clean and validate MAC addresses
        const cleanMacs = macAddresses.map((m: string) => 
          m.replace(/[:-]/g, '').toLowerCase()
        );

        const invalidMacs = cleanMacs.filter((m: string) => !/^[0-9a-f]{12}$/.test(m));
        if (invalidMacs.length > 0) {
          return NextResponse.json(
            { error: `Invalid MAC addresses: ${invalidMacs.join(', ')}` },
            { status: 400 }
          );
        }

        const result = await importESLTags(storeId, cleanMacs);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to import tags' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          results: result.results,
        });
      }

      case 'wakeup': {
        if (!macAddresses || !Array.isArray(macAddresses) || macAddresses.length === 0) {
          return NextResponse.json(
            { error: 'macAddresses array is required for wakeup' },
            { status: 400 }
          );
        }

        const cleanMacs = macAddresses.map((m: string) => 
          m.replace(/[:-]/g, '').toLowerCase()
        );

        const success = await wakeupESLTags(storeId, cleanMacs);

        return NextResponse.json({ success });
      }

      case 'locate': {
        if (!mac) {
          return NextResponse.json(
            { error: 'mac is required for locate' },
            { status: 400 }
          );
        }

        const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
        const success = await locateESLTag(storeId, cleanMac);

        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: import, wakeup, or locate' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing ESL tag action:', error);
    return NextResponse.json(
      { error: 'Failed to process ESL tag action' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete ESL tags from both Minew Cloud and Local Database
 */
export async function DELETE(request: NextRequest) {
  try {
    const { storeId, macAddresses, manager_id } = await request.json();

    if (!storeId || !macAddresses || !Array.isArray(macAddresses)) {
      return NextResponse.json(
        { error: 'storeId and macAddresses array are required' },
        { status: 400 }
      );
    }

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const cleanMacs = macAddresses.map((m: string) =>
      m.replace(/[:-]/g, '').toLowerCase()
    );

    console.log('[Delete Tags] Starting deletion for:', { storeId, cleanMacs, manager_id });

    // 1. Delete from Minew Cloud
    const minewResult = await deleteESLTags(storeId, cleanMacs);
    console.log('[Delete Tags] Minew Cloud result:', minewResult);

    // 2. Delete from Local Database (regardless of Minew result)
    const { prisma } = await import('@/lib/prisma');
    const localDeleteResults: { mac: string; success: boolean; error?: string }[] = [];

    for (const mac of cleanMacs) {
      try {
        // Find and delete device from local database
        const existingDevice = await prisma.device.findFirst({
          where: {
            manager_id: Number(manager_id),
            mac_address: mac,
          },
        });

        if (existingDevice) {
          await prisma.device.delete({
            where: { id: existingDevice.id },
          });
          console.log(`[Delete Tags] Deleted ${mac} from local database`);
          localDeleteResults.push({ mac, success: true });
        } else {
          console.log(`[Delete Tags] Device ${mac} not found in local database`);
          localDeleteResults.push({ mac, success: true }); // Consider success if not found
        }
      } catch (dbError) {
        console.error(`[Delete Tags] Failed to delete ${mac} from local database:`, dbError);
        localDeleteResults.push({
          mac,
          success: false,
          error: dbError instanceof Error ? dbError.message : 'Database error',
        });
      }
    }

    const localSuccessCount = localDeleteResults.filter(r => r.success).length;

    // Return combined result
    return NextResponse.json({
      success: minewResult.success || localSuccessCount > 0,
      message: `Deleted ${localSuccessCount}/${cleanMacs.length} tags`,
      data: {
        minew: minewResult,
        localDatabase: localDeleteResults,
      },
    });
  } catch (error) {
    console.error('Error deleting ESL tags:', error);
    return NextResponse.json(
      { error: 'Failed to delete ESL tags' },
      { status: 500 }
    );
  }
}
