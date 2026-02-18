import { NextRequest, NextResponse } from 'next/server';
import {
  listGateways,
  addGateway,
  updateGateway,
  deleteGateway,
  getGatewayStats,
  testMinewConnection,
} from '@/lib/minew';

/**
 * GET - List gateways for a store or get gateway stats
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const stats = searchParams.get('stats');

    console.log('[Gateways API] Request received with storeId:', storeId);

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    // Test connection first to ensure we have a valid token
    console.log('[Gateways API] Testing Minew connection...');
    const connectionStatus = await testMinewConnection();
    console.log('[Gateways API] Connection status:', connectionStatus.connected);
    
    if (!connectionStatus.connected) {
      console.error('[Gateways API] Minew connection failed:', connectionStatus.message);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Minew cloud',
          details: connectionStatus.message,
          gateways: [] // Return empty array to prevent frontend errors
        },
        { status: 503 }
      );
    }

    if (stats === 'true') {
      console.log('[Gateways API] Fetching gateway stats...');
      const gatewayStats = await getGatewayStats(storeId);
      return NextResponse.json({ stats: gatewayStats });
    }

    console.log('[Gateways API] Calling listGateways for storeId:', storeId);
    const gateways = await listGateways(storeId);
    console.log('[Gateways API] Gateways returned:', gateways.length);
    console.log('[Gateways API] Full gateway data:', JSON.stringify(gateways, null, 2));
    return NextResponse.json({ gateways });
  } catch (error) {
    console.error('[Gateways API] Error fetching gateways:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gateways', gateways: [] },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a new gateway
 */
export async function POST(request: NextRequest) {
  try {
    // Test connection first to ensure we have a valid token
    const connectionStatus = await testMinewConnection();
    
    if (!connectionStatus.connected) {
      console.error('Minew connection failed:', connectionStatus.message);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Minew cloud',
          details: connectionStatus.message
        },
        { status: 503 }
      );
    }

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
      // Handle specific error codes from Minew API
      const errorCode = result.code;
      let errorMessage = result.error || 'Failed to add gateway';
      let statusCode = 400;

      switch (errorCode) {
        case 10059:
          errorMessage = 'No permission to add gateway to this store';
          statusCode = 403;
          break;
        case 12067:
          errorMessage = 'The store ID does not exist';
          statusCode = 404;
          break;
        case 12099:
          errorMessage = 'Gateway already registered or invalid MAC address. Please check if the gateway is already in the system.';
          statusCode = 409;
          break;
        case -1:
          errorMessage = 'Token invalid or wrong. Please refresh the page and try again.';
          statusCode = 401;
          break;
        default:
          errorMessage = result.message || result.error || 'Failed to add gateway';
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          code: errorCode,
          details: result.message,
        },
        { status: statusCode }
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
    // Test connection first to ensure we have a valid token
    const connectionStatus = await testMinewConnection();
    
    if (!connectionStatus.connected) {
      console.error('Minew connection failed:', connectionStatus.message);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Minew cloud',
          details: connectionStatus.message
        },
        { status: 503 }
      );
    }

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
    // Test connection first to ensure we have a valid token
    const connectionStatus = await testMinewConnection();
    
    if (!connectionStatus.connected) {
      console.error('Minew connection failed:', connectionStatus.message);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Minew cloud',
          details: connectionStatus.message
        },
        { status: 503 }
      );
    }

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
