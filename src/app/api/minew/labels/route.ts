import { NextRequest, NextResponse } from 'next/server';
import { minewApiCall } from '@/lib/minew';

/**
 * GET /api/minew/labels
 * Get all ESL tags/labels for a store
 * 
 * Query params:
 * - storeId: Store ID (required)
 * - pageNo: Page number (optional, default: 1)
 * - pageSize: Page size (optional, default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const pageNo = searchParams.get('pageNo') || '1';
    const pageSize = searchParams.get('pageSize') || '100';

    console.log('[Minew Labels API] Fetching labels for store:', storeId);

    if (!storeId) {
      console.error('[Minew Labels API] Missing storeId parameter');
      return NextResponse.json(
        { success: false, error: 'Store ID is required' },
        { status: 400 }
      );
    }

    const result = await minewApiCall('/apis/esl/label/list', {
      method: 'GET',
      params: {
        storeId,
        pageNo,
        pageSize,
      },
    });

    console.log('[Minew Labels API] Response from Minew:', result);

    if (result.code === 200) {
      // Extract labels from the response
      // Based on Minew API, labels are in data.items or items
      const resultData = result.data as any;
      const labels = resultData?.items || (result as any).items || [];
      
      console.log('[Minew Labels API] Found', labels.length, 'labels');

      return NextResponse.json({
        success: true,
        labels,
        total: resultData?.total || (result as any).total || labels.length,
      });
    } else {
      console.error('[Minew Labels API] Failed to fetch labels:', result);
      return NextResponse.json(
        {
          success: false,
          error: result.msg || 'Failed to fetch ESL labels',
          code: result.code,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Minew Labels API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
