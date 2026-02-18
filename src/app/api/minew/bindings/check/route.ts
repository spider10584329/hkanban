import { NextRequest, NextResponse } from 'next/server';
import { checkBinding } from '@/lib/minew';

/**
 * Check binding status using Minew's queryBinding API
 * This uses a different API endpoint that might give more accurate results
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const mac = searchParams.get('mac');

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId is required' },
        { status: 400 }
      );
    }

    if (!mac) {
      return NextResponse.json(
        { success: false, error: 'mac is required' },
        { status: 400 }
      );
    }

    // Use checkBinding API which calls /apis/esl/label/queryBinding
    const binding = await checkBinding(storeId, mac);

    return NextResponse.json({
      success: true,
      storeId,
      mac,
      binding: binding || null,
      status: binding ? 'BOUND' : 'UNBOUND',
      details: binding ? {
        goodsId: binding.goodsId,
        labelMac: binding.labelMac,
        templateInfo: binding.demoId || binding.demoIdMap
      } : null
    });
  } catch (error) {
    console.error('[Check Binding Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
