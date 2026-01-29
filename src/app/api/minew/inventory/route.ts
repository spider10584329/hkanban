import { NextRequest, NextResponse } from 'next/server';
import {
  getDynamicFields,
  addInventoryData,
  updateInventoryData,
  getInventoryData,
  deleteInventoryData,
} from '@/lib/minew';

/**
 * GET - Get inventory data or dynamic fields
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const goodsId = searchParams.get('goodsId');
    const fields = searchParams.get('fields');

    // Get single inventory item by ID
    if (goodsId) {
      const data = await getInventoryData(goodsId);
      if (!data) {
        return NextResponse.json(
          { error: 'Inventory data not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ data });
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    // Get dynamic fields configuration
    if (fields === 'true') {
      const dynamicFields = await getDynamicFields(storeId);
      return NextResponse.json({ fields: dynamicFields });
    }

    return NextResponse.json(
      { error: 'Specify goodsId for data lookup or fields=true for field configuration' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching inventory data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
}

/**
 * POST - Add new inventory data to Minew
 */
export async function POST(request: NextRequest) {
  try {
    const { storeId, data } = await request.json();

    if (!storeId || !data) {
      return NextResponse.json(
        { error: 'storeId and data object are required' },
        { status: 400 }
      );
    }

    if (!data.id) {
      return NextResponse.json(
        { error: 'data.id (product SKU/ID) is required' },
        { status: 400 }
      );
    }

    const result = await addInventoryData(storeId, data);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add inventory data' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error adding inventory data:', error);
    return NextResponse.json(
      { error: 'Failed to add inventory data' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update existing inventory data
 */
export async function PUT(request: NextRequest) {
  try {
    const { storeId, dataId, updates } = await request.json();

    if (!storeId || !dataId || !updates) {
      return NextResponse.json(
        { error: 'storeId, dataId, and updates are required' },
        { status: 400 }
      );
    }

    const result = await updateInventoryData(storeId, dataId, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update inventory data' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating inventory data:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory data' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete inventory data
 */
export async function DELETE(request: NextRequest) {
  try {
    const { storeId, dataIds } = await request.json();

    if (!storeId || !dataIds || !Array.isArray(dataIds)) {
      return NextResponse.json(
        { error: 'storeId and dataIds array are required' },
        { status: 400 }
      );
    }

    const success = await deleteInventoryData(storeId, dataIds);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete inventory data' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory data:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory data' },
      { status: 500 }
    );
  }
}
