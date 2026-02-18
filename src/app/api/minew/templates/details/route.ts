import { NextRequest, NextResponse } from 'next/server';
import { minewApiCall } from '@/lib/minew';

/**
 * Get template details to check if button is enabled
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const templateId = searchParams.get('templateId');

    if (!storeId || !templateId) {
      return NextResponse.json(
        { success: false, error: 'storeId and templateId are required' },
        { status: 400 }
      );
    }

    // Call Minew API to get template details
    const response = await minewApiCall<any>('/apis/esl/template/findById', {
      params: { demoId: templateId, storeId }
    });

    if (response.code === 200 && response.data) {
      return NextResponse.json({
        success: true,
        storeId,
        templateId,
        template: response.data,
        hasButton: response.data.buttonEnabled || response.data.hasButton || false,
        recommendations: [
          `📋 Template ID: ${templateId}`,
          `📏 Screen: ${response.data.screenSize?.inch || 'N/A'}" (${response.data.screenSize?.width}x${response.data.screenSize?.height})`,
          `🎨 Color: ${response.data.color || 'N/A'}`,
          ``,
          `🔘 Button Status: ${response.data.buttonEnabled || response.data.hasButton ? '✅ Enabled' : '❌ Disabled'}`,
          ``,
          `💡 If button is disabled:`,
          `   1. Log in to Minew Cloud: https://cloud.minewesl.com`,
          `   2. Go to "模板管理" (Template Management)`,
          `   3. Edit this template and enable button feature`,
        ]
      });
    }

    return NextResponse.json({
      success: false,
      error: response.msg || 'Failed to get template details',
      code: response.code
    });
  } catch (error) {
    console.error('[Template Details Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
