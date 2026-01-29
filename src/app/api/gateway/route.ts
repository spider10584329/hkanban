import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addGateway, deleteGateway, listGateways } from '@/lib/minew';

/**
 * POST - Add a new gateway
 * First registers with Minew API, then saves to local database
 */
export async function POST(request: NextRequest) {
  try {
    const { name, mac, manager_id, storeId } = await request.json();

    if (!name || !mac || !manager_id || !storeId) {
      return NextResponse.json(
        { error: 'Name, MAC address, manager_id, and storeId are required' },
        { status: 400 }
      );
    }

    // Validate MAC address format (12 hex characters, with or without separators)
    const macClean = mac.replace(/[:-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{12}$/.test(macClean)) {
      return NextResponse.json(
        { error: 'Invalid MAC address format. Expected 12 hexadecimal characters.' },
        { status: 400 }
      );
    }

    // Step 1: Register gateway with Minew API
    const minewResult = await addGateway({ mac: macClean, name, storeId });

    if (!minewResult.success) {
      return NextResponse.json(
        { error: `Failed to register gateway with Minew: ${minewResult.error}` },
        { status: 400 }
      );
    }

    // Step 2: Save to local database
    try {
      const gateway = await prisma.gateway.create({
        data: {
          name,
          mac_address: macClean,
          manager_id: parseInt(manager_id),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Gateway registered successfully',
        gateway,
      });
    } catch (dbError: any) {
      // If database save fails, we've already registered with Minew
      // Log this but return success with warning
      console.error('Database save error:', dbError);
      
      if (dbError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Gateway with this MAC address already exists in database' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { 
          success: true,
          warning: 'Gateway registered with Minew but failed to save locally',
          error: dbError.message 
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error adding gateway:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add gateway' },
      { status: 500 }
    );
  }
}

/**
 * GET - List all gateways for a manager
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const manager_id = searchParams.get('manager_id');

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const gateways = await prisma.gateway.findMany({
      where: {
        manager_id: parseInt(manager_id),
      },
      orderBy: {
        created_at: 'desc',
      },
    });

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
 * DELETE - Delete a gateway
 * First deletes from Minew cloud, then from local database
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const storeId = searchParams.get('storeId');

    if (!id) {
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

    // Step 1: Get gateway from local database
    const localGateway = await prisma.gateway.findUnique({
      where: { id: parseInt(id) },
    });

    if (!localGateway) {
      return NextResponse.json(
        { error: 'Gateway not found in local database' },
        { status: 404 }
      );
    }

    // Step 2: Find gateway in Minew cloud by MAC address
    try {
      const minewGateways = await listGateways(storeId);
      console.log(`Found ${minewGateways.length} gateways in Minew cloud for store ${storeId}`);
      console.log(`Looking for gateway with MAC: ${localGateway.mac_address}`);
      
      // Try different MAC address formats for matching
      const normalizedLocalMac = localGateway.mac_address.replace(/[:-]/g, '').toUpperCase();
      
      const minewGateway = minewGateways.find((gw) => {
        const normalizedMinewMac = gw.mac.replace(/[:-]/g, '').toUpperCase();
        console.log(`Comparing: ${normalizedMinewMac} with ${normalizedLocalMac}`);
        return normalizedMinewMac === normalizedLocalMac;
      });

      // Step 3: Delete from Minew cloud if found
      if (minewGateway) {
        console.log(`Found matching gateway in Minew cloud: ${minewGateway.id}, MAC: ${minewGateway.mac}`);
        const minewDeleted = await deleteGateway(minewGateway.id, storeId);
        if (!minewDeleted) {
          console.error(`Failed to delete gateway from Minew cloud: ${minewGateway.id}`);
          return NextResponse.json(
            { error: 'Failed to delete gateway from Minew cloud' },
            { status: 500 }
          );
        }
        console.log(`Successfully deleted gateway from Minew cloud: ${minewGateway.id}`);
      } else {
        console.warn(`Gateway with MAC ${localGateway.mac_address} not found in Minew cloud`);
        console.log('Available gateways:', minewGateways.map(gw => ({ id: gw.id, mac: gw.mac, name: gw.name })));
        // Continue with local deletion even if not found in Minew
      }
    } catch (minewError) {
      console.error('Error deleting from Minew cloud:', minewError);
      return NextResponse.json(
        { error: `Failed to delete from Minew cloud: ${minewError instanceof Error ? minewError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Step 4: Delete from local database
    await prisma.gateway.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Gateway deleted successfully from both local database and Minew cloud',
    });
  } catch (error) {
    console.error('Error deleting gateway:', error);
    return NextResponse.json(
      { error: 'Failed to delete gateway' },
      { status: 500 }
    );
  }
}
