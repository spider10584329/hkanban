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
      // Update local database to remove binding information
      try {
        // Find product by minewBoundLabel (MAC address)
        const product = await prisma.product.findFirst({
          where: { minewBoundLabel: mac } as any,
        });

        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              minewBoundLabel: null,
              minewBoundAt: null,
            } as any,
          });
          console.log('[Minew Unbind API] Local database updated successfully');
        }
      } catch (dbError) {
        console.error('[Minew Unbind API] Failed to update local database:', dbError);
        // Don't fail the request if DB update fails, unbinding already succeeded in Minew
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
