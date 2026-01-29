import { NextRequest, NextResponse } from 'next/server';
import {
  listESLTags,
  getESLTag,
  importESLTags,
  deleteESLTags,
  wakeupESLTags,
  locateESLTag,
  getESLTagStats,
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
      { error: 'Failed to fetch ESL tags' },
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
 * DELETE - Delete ESL tags
 */
export async function DELETE(request: NextRequest) {
  try {
    const { storeId, macAddresses } = await request.json();

    if (!storeId || !macAddresses || !Array.isArray(macAddresses)) {
      return NextResponse.json(
        { error: 'storeId and macAddresses array are required' },
        { status: 400 }
      );
    }

    const cleanMacs = macAddresses.map((m: string) => 
      m.replace(/[:-]/g, '').toLowerCase()
    );

    const success = await deleteESLTags(storeId, cleanMacs);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete ESL tags' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ESL tags:', error);
    return NextResponse.json(
      { error: 'Failed to delete ESL tags' },
      { status: 500 }
    );
  }
}
