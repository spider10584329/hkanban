import { NextRequest, NextResponse } from 'next/server';
import {
  listGateways,
  addGateway,
  updateGateway,
  deleteGateway,
  getGatewayStats,
} from '@/lib/minew';

/**
 * GET - List gateways for a store or get gateway stats
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const stats = searchParams.get('stats');

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    if (stats === 'true') {
      const gatewayStats = await getGatewayStats(storeId);
      return NextResponse.json({ stats: gatewayStats });
    }

    const gateways = await listGateways(storeId);
    return NextResponse.json({ gateways });
  } catch (error) {
    console.error('Error fetching gateways:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gateways' },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a new gateway
 */
export async function POST(request: NextRequest) {
  try {
    const { mac, name, storeId } = await request.json();

    if (!mac || !name || !storeId) {
      return NextResponse.json(
        { error: 'MAC address, name, and storeId are required' },
        { status: 400 }
      );
    }

    // Validate MAC address format (12 hex characters)
    const macClean = mac.replace(/[:-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{12}$/.test(macClean)) {
      return NextResponse.json(
        { error: 'Invalid MAC address format. Expected 12 hexadecimal characters.' },
        { status: 400 }
      );
    }

    const result = await addGateway({ mac: macClean, name, storeId });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add gateway' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, mac: macClean });
  } catch (error) {
    console.error('Error adding gateway:', error);
    return NextResponse.json(
      { error: 'Failed to add gateway' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update gateway information
 */
export async function PUT(request: NextRequest) {
  try {
    const { id, mac, name, storeId } = await request.json();

    if (!id || !mac || !name || !storeId) {
      return NextResponse.json(
        { error: 'Gateway ID, MAC, name, and storeId are required' },
        { status: 400 }
      );
    }

    const success = await updateGateway({ id, mac, name, storeId });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update gateway' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating gateway:', error);
    return NextResponse.json(
      { error: 'Failed to update gateway' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a gateway
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gatewayId = searchParams.get('id');
    const storeId = searchParams.get('storeId');

    if (!gatewayId) {
      return NextResponse.json(
        { error: 'Gateway ID is required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    const success = await deleteGateway(gatewayId, storeId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete gateway' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gateway:', error);
    return NextResponse.json(
      { error: 'Failed to delete gateway' },
      { status: 500 }
    );
  }
}
