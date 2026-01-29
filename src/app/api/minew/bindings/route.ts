import { NextRequest, NextResponse } from 'next/server';
import {
  bindESLTagAutomatic,
  bindESLTagManual,
  batchBindESLTags,
  unbindESLTag,
  checkBinding,
  refreshESLTags,
  updateAndRefreshESLTag,
} from '@/lib/minew';

/**
 * GET - Check binding status for an ESL tag
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const mac = searchParams.get('mac');

    if (!storeId || !mac) {
      return NextResponse.json(
        { error: 'storeId and mac are required' },
        { status: 400 }
      );
    }

    const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
    const binding = await checkBinding(storeId, cleanMac);

    return NextResponse.json({
      bound: binding !== null,
      binding,
    });
  } catch (error) {
    console.error('Error checking binding:', error);
    return NextResponse.json(
      { error: 'Failed to check binding' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create bindings or perform binding-related actions
 */
export async function POST(request: NextRequest) {
  try {
    const { action, storeId, mac, macAddresses, goodsId, templateId, bindings, updates } = await request.json();

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'bind-auto': {
        // Automatic binding using template strategy
        if (!mac || !goodsId) {
          return NextResponse.json(
            { error: 'mac and goodsId are required for automatic binding' },
            { status: 400 }
          );
        }

        const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
        const result = await bindESLTagAutomatic(storeId, [
          { labelMac: cleanMac, goodsId },
        ]);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to bind tag' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case 'bind-manual': {
        // Manual binding with specific template
        if (!mac || !goodsId || !templateId) {
          return NextResponse.json(
            { error: 'mac, goodsId, and templateId are required for manual binding' },
            { status: 400 }
          );
        }

        const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
        const result = await bindESLTagManual(storeId, cleanMac, goodsId, templateId);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to bind tag' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case 'bind-batch': {
        // Batch binding
        if (!bindings || !Array.isArray(bindings) || bindings.length === 0) {
          return NextResponse.json(
            { error: 'bindings array is required for batch binding' },
            { status: 400 }
          );
        }

        const cleanBindings = bindings.map((b: { labelMac: string; goodsId: string; demoId?: string }) => ({
          ...b,
          labelMac: b.labelMac.replace(/[:-]/g, '').toLowerCase(),
        }));

        const result = await batchBindESLTags(storeId, cleanBindings);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to batch bind tags' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case 'unbind': {
        // Unbind a tag
        if (!mac) {
          return NextResponse.json(
            { error: 'mac is required for unbinding' },
            { status: 400 }
          );
        }

        const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
        const success = await unbindESLTag(storeId, cleanMac);

        return NextResponse.json({ success });
      }

      case 'refresh': {
        // Refresh tag displays
        if (!macAddresses || !Array.isArray(macAddresses) || macAddresses.length === 0) {
          return NextResponse.json(
            { error: 'macAddresses array is required for refresh' },
            { status: 400 }
          );
        }

        const cleanMacs = macAddresses.map((m: string) => 
          m.replace(/[:-]/g, '').toLowerCase()
        );
        const success = await refreshESLTags(storeId, cleanMacs);

        return NextResponse.json({ success });
      }

      case 'update-refresh': {
        // Update data and refresh display
        if (!mac || !goodsId || !updates) {
          return NextResponse.json(
            { error: 'mac, goodsId, and updates are required for update-refresh' },
            { status: 400 }
          );
        }

        const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
        const result = await updateAndRefreshESLTag(storeId, cleanMac, goodsId, updates);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to update and refresh tag' },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: bind-auto, bind-manual, bind-batch, unbind, refresh, or update-refresh' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing binding action:', error);
    return NextResponse.json(
      { error: 'Failed to process binding action' },
      { status: 500 }
    );
  }
}
