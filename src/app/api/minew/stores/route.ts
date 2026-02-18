import { NextRequest, NextResponse } from 'next/server';
import { listStores, getStore, createStore, toggleStore, testMinewConnection } from '@/lib/minew';

/**
 * GET - List all Minew stores or get a specific store
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    console.log('[Stores API] Starting request...');
    console.log('[Stores API] Environment check:', {
      hasUsername: !!process.env.MINEW_USERNAME,
      hasPassword: !!process.env.MINEW_PASSWORD,
      hasApiBase: !!process.env.MINEW_API_BASE,
      username: process.env.MINEW_USERNAME,
      apiBase: process.env.MINEW_API_BASE,
    });

    // Test connection first to ensure we have a valid token
    console.log('[Stores API] Testing Minew connection...');
    const connectionStatus = await testMinewConnection();
    console.log('[Stores API] Connection status:', connectionStatus);
    
    if (!connectionStatus.connected) {
      console.error('[Stores API] Minew connection failed:', connectionStatus.message);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Minew cloud',
          details: connectionStatus.message,
          stores: [] // Return empty array to prevent frontend errors
        },
        { status: 503 }
      );
    }

    if (storeId) {
      // Get specific store
      console.log('[Stores API] Fetching specific store:', storeId);
      const store = await getStore(storeId);
      if (!store) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ store });
    }

    // List all stores
    console.log('[Stores API] Calling listStores()...');
    const stores = await listStores();
    console.log('[Stores API] Fetched stores from Minew API:');
    console.log('[Stores API] - Count:', stores.length);
    console.log('[Stores API] - Full data:', JSON.stringify(stores, null, 2));
    if (stores.length > 0) {
      console.log('- First store structure:', {
        id: stores[0].id,
        storeId: stores[0].storeId,
        name: stores[0].name,
        number: stores[0].number,
        hasStoreId: !!stores[0].storeId,
        hasNumber: !!stores[0].number,
      });
    }
    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores', stores: [] },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new store
 */
export async function POST(request: NextRequest) {
  try {
    const { number, name, address } = await request.json();

    if (!number || !name) {
      return NextResponse.json(
        { error: 'Store number and name are required' },
        { status: 400 }
      );
    }

    const result = await createStore({ number, name, address });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create store' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      storeId: result.storeId,
    });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Toggle store active status
 */
export async function PUT(request: NextRequest) {
  try {
    const { storeId, active } = await request.json();

    if (!storeId || active === undefined) {
      return NextResponse.json(
        { error: 'Store ID and active status are required' },
        { status: 400 }
      );
    }

    const success = await toggleStore(storeId, active);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update store status' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}
