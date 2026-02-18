import { NextRequest, NextResponse } from 'next/server';
import { minewApiCall } from '@/lib/minew';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/minew/labels/bind
 * Bind an ESL tag to a product
 * 
 * Request body:
 * - storeId: Store ID
 * - mac: ESL tag MAC address
 * - goodsId: Product SKU/ID
 * - demoId: Template ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, mac, goodsId, demoId } = body;

    console.log('[Minew Bind API] Received request:', { storeId, mac, goodsId, demoId });

    if (!storeId || !mac || !goodsId || !demoId) {
      console.error('[Minew Bind API] Missing required parameters');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: storeId, mac, goodsId, demoId' 
        },
        { status: 400 }
      );
    }

    // Call Minew API to bind the ESL tag
    // Note: Minew API uses labelMac (not mac) and demoIdMap (not demoId)
    const result = await minewApiCall(
      '/apis/esl/label/update',
      {
        method: 'POST',
        body: {
          storeId,
          labelMac: mac,  // Changed from 'mac' to 'labelMac'
          goodsId,
          demoIdMap: { A: demoId },  // Changed from 'demoId' to 'demoIdMap' with side A
        },
      }
    );

    console.log('[Minew Bind API] Response from Minew:', result);

    if (result.code === 200) {
      try {
        await prisma.product.update({
          where: { id: parseInt(goodsId) },
          data: {
            minewBoundLabel: mac,
            minewBoundAt: new Date(),
            einkDeviceId: mac,
            hasEinkDevice: 1,
          } as any,
        });
        console.log('[Minew Bind API] Local database updated successfully');
      } catch (dbError) {
        console.error('[Minew Bind API] Failed to update local database:', dbError);
      }

      return NextResponse.json({
        success: true,
        message: 'ESL tag bound successfully',
        data: result.data,
      });
    } else {
      console.error('[Minew Bind API] Binding failed:', result);
      return NextResponse.json(
        {
          success: false,
          error: result.msg || 'Failed to bind ESL tag',
          code: result.code,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Minew Bind API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
