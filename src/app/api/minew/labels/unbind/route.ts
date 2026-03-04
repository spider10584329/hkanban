import { NextRequest, NextResponse } from 'next/server';
import { minewApiCall } from '@/lib/minew';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/minew/labels/unbind
 * Unbind an ESL tag from a product
 * 
 * Request body:
 * - storeId: Store ID
 * - mac: ESL tag MAC address
 * 
 * Note: Minew API uses query parameters for this endpoint, not body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, mac } = body;

    console.log('[Minew Unbind API] Received request:', { storeId, mac });

    if (!storeId || !mac) {
      console.error('[Minew Unbind API] Missing required parameters');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: storeId, mac' 
        },
        { status: 400 }
      );
    }

    // Call Minew API to unbind the ESL tag
    // Note: This endpoint uses query parameters (params), not body
    // Also uses 'mac' directly (not 'labelMac') in params
    const result = await minewApiCall(
      '/apis/esl/label/deleteBind',
      {
        method: 'POST',
        params: {
          mac: mac,  // Query parameter
          storeId: storeId,  // Query parameter
        },
      }
    );

    console.log('[Minew Unbind API] Response from Minew:', result);

    if (result.code === 200) {
      // Update local database to remove ALL binding-related fields.
      // Use $executeRaw so that minewBoundLabel / minewBoundAt are always
      // written regardless of Prisma client cache state.
      // Also clears einkDeviceId / hasEinkDevice / qrCodeUrl so the
      // unique_manager_eink and unique_manager_qrcode constraints won't
      // block a future re-binding to a different product.
      try {
        const affected = await prisma.$executeRaw`
          UPDATE products
          SET einkDeviceId    = NULL,
              hasEinkDevice   = 0,
              qrCodeUrl       = NULL,
              minewBoundLabel = NULL,
              minewBoundAt    = NULL,
              updatedAt       = ${new Date()}
          WHERE minewBoundLabel = ${mac}
             OR einkDeviceId   = ${mac}
        `;
        console.log('[Minew Unbind API] Local database updated, rows affected:', affected);
      } catch (dbError) {
        console.error('[Minew Unbind API] Failed to update local database:', dbError);
      }

      return NextResponse.json({
        success: true,
        message: 'ESL tag unbound successfully',
        data: result.data,
      });
    } else {
      console.error('[Minew Unbind API] Unbinding failed:', result);
      return NextResponse.json(
        {
          success: false,
          error: result.msg || 'Failed to unbind ESL tag',
          code: result.code,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Minew Unbind API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
