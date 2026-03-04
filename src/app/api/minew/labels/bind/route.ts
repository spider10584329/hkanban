import { NextRequest, NextResponse } from 'next/server';
import { bindESLTagManual, updateGoodsToStore } from '@/lib/minew';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/minew/labels/bind
 *
 * Binds an ESL tag to a product, auto-generates the QR URL,
 * pushes it to Minew Cloud, updates local DB, then refreshes the tag.
 *
 * Body: { storeId, mac, goodsId, demoId }
 *   - storeId : Minew store ID
 *   - mac     : ESL tag MAC address (raw, colons allowed)
 *   - goodsId : product.id as string (used as Minew goodsId)
 *   - demoId  : Minew template ID to use for side A
 */
export async function POST(request: NextRequest) {
  try {
    const { storeId, mac, goodsId, demoId } = await request.json();

    if (!storeId || !mac || !goodsId || !demoId) {
      return NextResponse.json(
        { success: false, error: 'storeId, mac, goodsId and demoId are required' },
        { status: 400 }
      );
    }

    const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();

    // ── Step 1: Bind ESL tag to product with the selected template ────────────
    const bindResult = await bindESLTagManual(storeId, cleanMac, goodsId, demoId);
    if (!bindResult.success) {
      return NextResponse.json(
        { success: false, error: bindResult.error || 'Binding failed' },
        { status: 400 }
      );
    }

    // ── Step 2: Generate the QR URL that will be encoded in the tag screen ────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const qrUrl = `${appUrl}/scan?productId=${goodsId}&mac=${cleanMac}&storeId=${encodeURIComponent(storeId)}`;

    // Look up product location for including in Minew update
    const productIdInt = parseInt(goodsId);
    const productRecord = await prisma.product.findUnique({
      where: { id: productIdInt },
      select: { location: true },
    });
    const productLocation = productRecord?.location || '';

    // ── Step 3: Push QR URL + location to Minew Cloud AND refresh tag display ──
    // updateGoodsToStore uses /apis/esl/goods/updateToStore (API 3.3):
    // single-item update + automatic screen refresh, no template ID required.
    try {
      const updateResult = await updateGoodsToStore(storeId, goodsId, {
        qrcode: qrUrl,
        barcode: qrUrl,
        ...(productLocation ? { location: productLocation } : {}),
      });
      if (!updateResult.success) {
        console.error('[bind] updateGoodsToStore failed:', updateResult.error);
      } else {
        console.log('[bind] Minew cloud updated (qrcode/barcode) for goodsId:', goodsId);
      }
    } catch (updateErr) {
      console.error('[bind] updateGoodsToStore threw:', updateErr);
    }

    // ── Step 4: Update local DB ────────────────────────────────────────────────
    // goodsId is product.id as string – use it directly as the PK.
    // $executeRaw bypasses Prisma type cache so fields like minewBoundLabel
    // and minewBoundAt (not yet in generated client) are written correctly.
    try {
      // 4a. Clear the same MAC from any OTHER product that previously held it.
      //     This prevents unique_manager_eink / unique_manager_qrcode violations
      //     when re-binding a tag that was unbound without a proper DB cleanup.
      await prisma.$executeRaw`
        UPDATE products
        SET einkDeviceId    = NULL,
            hasEinkDevice   = 0,
            qrCodeUrl       = NULL,
            minewBoundLabel = NULL,
            minewBoundAt    = NULL,
            updatedAt       = ${new Date()}
        WHERE (minewBoundLabel = ${cleanMac} OR einkDeviceId = ${cleanMac})
          AND id != ${productIdInt}
      `;

      // 4b. Set all binding fields on the target product.
      await prisma.$executeRaw`
        UPDATE products
        SET qrCodeUrl       = ${qrUrl},
            einkDeviceId    = ${cleanMac},
            hasEinkDevice   = 1,
            minewBoundLabel = ${cleanMac},
            minewBoundAt    = ${new Date()},
            updatedAt       = ${new Date()}
        WHERE id = ${productIdInt}
      `;
      console.log('[bind] DB updated for product id:', productIdInt);
    } catch (dbErr) {
      console.error('[bind] DB update failed:', dbErr);
    }

    // Step 5 removed: updateGoodsToStore already includes screen refresh.

    return NextResponse.json({
      success: true,
      qrUrl,
      mac: cleanMac,
    });
  } catch (error) {
    console.error('[bind] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
