import { NextRequest, NextResponse } from 'next/server';
import { listStores, getStore, createStore, toggleStore } from '@/lib/minew';

/**
 * GET - List all Minew stores or get a specific store
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (storeId) {
      // Get specific store
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
    const stores = await listStores();
    console.log('Fetched stores from Minew API:');
    console.log('- Count:', stores.length);
    console.log('- Full data:', JSON.stringify(stores, null, 2));
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
      { error: 'Failed to fetch stores' },
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
