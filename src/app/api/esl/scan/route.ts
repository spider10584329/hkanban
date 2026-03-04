import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateGoodsToStore } from '@/lib/minew';

/**
 * Public API for ESL tag QR-code scanning.
 * No authentication required – access is implicitly authorised by
 * physical proximity to the ESL tag in the warehouse.
 *
 * GET  /api/esl/scan?productId=42
 *   → returns basic product info for the confirmation page
 *
 * POST /api/esl/scan
 *   Body: { productId, mac, storeId }
 *   → creates a ReplenishmentRequest using the 'system' user
 *   → updates Minew Cloud: sets order_date on the product data so
 *     the ESL tag screen shows the request timestamp
 */

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    });

    if (!product || product.isActive !== 1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        categoryName: product.category.name,
        supplierName: product.supplier?.name || null,
        location: product.location,
        standardOrderQty: product.standardOrderQty,
        reorderThreshold: product.reorderThreshold,
        unitPrice: product.unitPrice,
      },
    });
  } catch (error) {
    console.error('[ESL Scan GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { productId, mac, storeId } = await request.json();

    if (!productId || !mac || !storeId) {
      return NextResponse.json(
        { error: 'productId, mac and storeId are required' },
        { status: 400 }
      );
    }

    // ── Find product ──────────────────────────────────────────────────────────
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
    });

    if (!product || product.isActive !== 1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // ── Resolve (or lazily create) the 'system' user for this manager ─────────
    let systemUser = await prisma.user.findFirst({
      where: { manager_id: product.manager_id, username: 'system' },
    });

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          manager_id: product.manager_id,
          username: 'system',
          password: 'system-nologin',
          isActive: 1,
        },
      });
    }

    // ── Duplicate check: ignore if same product requested within last 60 s ────
    const checkFrom = new Date(Date.now() - 60_000);
    const existingRequest = await prisma.replenishmentRequest.findFirst({
      where: {
        manager_id: product.manager_id,
        productId: product.id,
        requestMethod: 'QR_SCAN',
        createdAt: { gte: checkFrom },
      },
    });

    let replenishmentRequest;
    if (!existingRequest) {
      replenishmentRequest = await prisma.replenishmentRequest.create({
        data: {
          manager_id: product.manager_id,
          productId: product.id,
          requestedById: systemUser.id,
          requestMethod: 'QR_SCAN',
          deviceInfo: mac,
          requestedQty: product.standardOrderQty || null,
          location: product.location,
          notes: `ESL QR code scanned. Tag MAC: ${mac}. Store: ${storeId}`,
          status: 'PENDING',
          priority: 'NORMAL',
          updatedAt: new Date(),
        },
      });
    } else {
      replenishmentRequest = existingRequest;
    }

    // ── Update Minew Cloud: set order_date field + refresh tag display ──────────
    // updateGoodsToStore uses /apis/esl/goods/updateToStore (API 3.3):
    // permanently writes to the cloud goods record AND refreshes the ESL screen.
    const goodsId = (product as any).minewGoodsId || product.id.toString();
    const orderDate = new Date().toISOString();

    try {
      const updateResult = await updateGoodsToStore(storeId, goodsId, {
        order_date: orderDate,
      });
      if (!updateResult.success) {
        console.error('[ESL Scan POST] updateGoodsToStore failed:', updateResult.error);
      }
    } catch (minewErr) {
      // Non-fatal – request was already created
      console.error('[ESL Scan POST] Minew update threw:', minewErr);
    }

    // ── Also record order_date in local DB for reference ─────────────────────
    try {
      await prisma.$executeRaw`
        UPDATE products
        SET updatedAt = ${new Date()}
        WHERE id = ${product.id}
      `;
    } catch (dbErr) {
      console.error('[ESL Scan POST] DB touch failed:', dbErr);
    }

    return NextResponse.json({
      success: true,
      requestId: replenishmentRequest.id,
      orderDate,
      duplicate: !!existingRequest,
    });
  } catch (error) {
    console.error('[ESL Scan POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
