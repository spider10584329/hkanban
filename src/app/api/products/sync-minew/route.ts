import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMinewToken, getDefaultStoreId, addToSyncQueue } from '@/lib/minewTokenManager';

/**
 * POST - Sync unsynced products to Minew Cloud
 * Syncs products where minewSynced = 0
 */
export async function POST(request: NextRequest) {
  try {
    const { manager_id, productIds } = await request.json();

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    // Get unsynced products
    const where: any = {
      manager_id: parseInt(manager_id),
      minewSynced: 0,
    };

    // If specific productIds provided, filter by them
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      where.id = { in: productIds.map((id: number) => parseInt(id.toString())) };
    }

    const unsyncedProducts = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    if (unsyncedProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products to sync',
        synced: 0,
        failed: 0,
      });
    }

    // Get Minew credentials from token manager
    const token = await getMinewToken();
    const storeId = await getDefaultStoreId();

    if (!token || !storeId) {
      return NextResponse.json(
        { error: 'Cannot connect to Minew Cloud. Please check credentials.' },
        { status: 500 }
      );
    }

    console.log('[MinewSync] Starting batch sync for', unsyncedProducts.length, 'products');

    // Sync each product
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as Array<{ productId: number; productName: string; error: string }>,
    };

    const minewApiBase = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';

    for (const product of unsyncedProducts) {
      try {
        // Prepare Minew data
        const minewData = {
          id: product.id.toString(),
          name: product.name,
          price: product.unitPrice?.toString() || "0.00",
          coding: product.sku || "",
          barcode: product.qrCodeUrl || "",
          qrcode: product.qrCodeUrl || "",
          PartNo: product.sku || "",
          specification: product.description || "",
          quantity: product.standardOrderQty?.toString() || "0",
          supplier: product.supplier?.name || "",
        };

        // Sync to Minew
        const minewResponse = await fetch(`${minewApiBase}/apis/esl/goods/addToStore`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json;charset=utf-8',
            'token': token,
          },
          body: JSON.stringify({ storeId, ...minewData }),
        });

        const minewResult = await minewResponse.json();

        if (minewResult.code === 200) {
          // Update sync status
          await prisma.$executeRaw`
            UPDATE products 
            SET minewSynced = 1, 
                minewSyncedAt = ${new Date()}, 
                minewGoodsId = ${product.id.toString()},
                minewSyncError = NULL,
                updatedAt = ${new Date()}
            WHERE id = ${product.id}
          `;
          results.synced++;
          console.log(`[MinewSync] ✓ Product ${product.id} synced`);
        } else {
          const errorMessage = minewResult.msg || 'Sync failed';
          
          // Update sync error
          await prisma.$executeRaw`
            UPDATE products 
            SET minewSynced = 0, 
                minewSyncError = ${errorMessage},
                updatedAt = ${new Date()}
            WHERE id = ${product.id}
          `;
          
          results.failed++;
          results.errors.push({
            productId: product.id,
            productName: product.name,
            error: errorMessage,
          });
          console.error(`[MinewSync] ✗ Product ${product.id} failed:`, errorMessage);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Update sync error
        await prisma.$executeRaw`
          UPDATE products 
          SET minewSynced = 0, 
              minewSyncError = ${errorMessage},
              updatedAt = ${new Date()}
          WHERE id = ${product.id}
        `;
        
        results.failed++;
        results.errors.push({
          productId: product.id,
          productName: product.name,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced} products, ${results.failed} failed`,
      synced: results.synced,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Error syncing products to Minew:', error);
    return NextResponse.json(
      { error: 'Failed to sync products' },
      { status: 500 }
    );
  }
}
