import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getMinewToken,
  importESLTags,
  listESLTags,
  bindESLTagAutomatic,
  refreshESLTags,
  addInventoryData,
  MinewESLManager,
} from '@/lib/minew';

interface SyncResult {
  mac: string;
  imported: boolean;
  bound: boolean;
  refreshed: boolean;
  error?: string;
}

/**
 * POST - Sync local devices with Minew ESL Cloud
 * This integrates existing device registrations with the Minew platform
 */
export async function POST(request: NextRequest) {
  try {
    const { manager_id, storeId, action } = await request.json();

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required for Minew sync' },
        { status: 400 }
      );
    }

    // Test authentication first
    const token = await getMinewToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated with Minew ESL Cloud' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'import-devices': {
        // Import local devices to Minew
        return await importLocalDevicesToMinew(manager_id, storeId);
      }

      case 'sync-from-minew': {
        // Sync device status from Minew to local database
        return await syncFromMinew(manager_id, storeId);
      }

      case 'sync-products': {
        // Sync products to Minew inventory
        return await syncProductsToMinew(manager_id, storeId);
      }

      case 'bind-products': {
        // Bind devices to products
        return await bindDevicesToProducts(manager_id, storeId);
      }

      case 'full-sync': {
        // Full synchronization
        const importResult = await importLocalDevicesToMinew(manager_id, storeId);
        const syncResult = await syncFromMinew(manager_id, storeId);
        const productResult = await syncProductsToMinew(manager_id, storeId);

        return NextResponse.json({
          success: true,
          import: importResult,
          sync: syncResult,
          products: productResult,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: import-devices, sync-from-minew, sync-products, bind-products, or full-sync' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in Minew sync:', error);
    return NextResponse.json(
      { error: 'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

/**
 * Import locally registered devices to Minew ESL Cloud
 */
async function importLocalDevicesToMinew(managerId: number, storeId: string) {
  const results: SyncResult[] = [];

  // Get all local devices for this manager
  const localDevices = await prisma.deviceStatus.findMany({
    where: { manager_id: managerId },
  });

  if (localDevices.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No local devices to import',
      results: [],
    });
  }

  // Filter for E-ink/ESL devices
  const eslDevices = localDevices.filter(d => 
    d.deviceType.toLowerCase().includes('eink') ||
    d.deviceType.toLowerCase().includes('esl') ||
    d.deviceType.toLowerCase().includes('e-ink')
  );

  if (eslDevices.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No ESL devices to import',
      results: [],
    });
  }

  // Extract MAC addresses
  const macAddresses = eslDevices.map(d => 
    d.deviceId.replace(/[:-]/g, '').toLowerCase()
  );

  // Import to Minew
  const importResult = await importESLTags(storeId, macAddresses);

  // Process results
  for (const device of eslDevices) {
    const mac = device.deviceId.replace(/[:-]/g, '').toLowerCase();
    const result: SyncResult = {
      mac,
      imported: false,
      bound: false,
      refreshed: false,
    };

    if (importResult.success && importResult.results) {
      const status = importResult.results[mac];
      result.imported = status === 'success' || status?.includes('exist');
      if (status && status !== 'success' && !status.includes('exist')) {
        result.error = status;
      }
    } else {
      result.error = importResult.error;
    }

    results.push(result);
  }

  return NextResponse.json({
    success: true,
    message: `Imported ${results.filter(r => r.imported).length} of ${results.length} devices`,
    results,
  });
}

/**
 * Sync device status from Minew to local database
 */
async function syncFromMinew(managerId: number, storeId: string) {
  // Get all ESL tags from Minew
  const minewTags = await listESLTags(storeId, { size: 1000 });

  let updated = 0;
  let notFound = 0;

  for (const tag of minewTags.items) {
    const mac = tag.mac.toLowerCase();

    // Try to find matching local device
    const localDevice = await prisma.deviceStatus.findFirst({
      where: {
        manager_id: managerId,
        deviceId: {
          contains: mac.slice(-6), // Match last 6 chars of MAC
        },
      },
    });

    if (localDevice) {
      // Update local device with Minew status
      await prisma.deviceStatus.update({
        where: { id: localDevice.id },
        data: {
          isOnline: tag.isOnline === '2' ? 1 : 0,
          batteryLevel: tag.battery,
          lastSyncAt: new Date(),
          currentDisplay: tag.goodsId || null,
          updatedAt: new Date(),
        },
      });
      updated++;
    } else {
      notFound++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${updated} devices, ${notFound} not found locally`,
    minewDevices: minewTags.total,
    updated,
    notFound,
  });
}

/**
 * Sync products to Minew inventory data
 */
async function syncProductsToMinew(managerId: number, storeId: string) {
  const manager = new MinewESLManager(storeId);

  // Get all products for this manager
  const products = await prisma.product.findMany({
    where: { 
      manager_id: managerId,
      isActive: 1,
    },
    include: {
      category: true,
    },
  });

  let synced = 0;
  let failed = 0;
  const errors: { sku: string; error: string }[] = [];

  for (const product of products) {
    try {
      const result = await manager.syncProductToMinew({
        sku: product.sku || `PROD-${product.id}`,
        name: product.name,
        price: product.unitPrice ? Number(product.unitPrice) : 0,
        quantity: product.reorderThreshold || 0,
        location: product.location,
        barcode: undefined, // Add if you have barcode field
      });

      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push({
          sku: product.sku || `PROD-${product.id}`,
          error: result.error || 'Unknown error',
        });
      }
    } catch (err) {
      failed++;
      errors.push({
        sku: product.sku || `PROD-${product.id}`,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${synced} of ${products.length} products`,
    synced,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * Bind devices to products based on einkDeviceId field
 */
async function bindDevicesToProducts(managerId: number, storeId: string) {
  // Get products that have einkDeviceId set
  const productsWithDevices = await prisma.product.findMany({
    where: {
      manager_id: managerId,
      hasEinkDevice: 1,
      einkDeviceId: { not: null },
    },
  });

  let bound = 0;
  let failed = 0;
  const errors: { sku: string; mac: string; error: string }[] = [];

  for (const product of productsWithDevices) {
    if (!product.einkDeviceId) continue;

    const mac = product.einkDeviceId.replace(/[:-]/g, '').toLowerCase();
    const goodsId = product.sku || `PROD-${product.id}`;

    try {
      const result = await bindESLTagAutomatic(storeId, [
        { labelMac: mac, goodsId },
      ]);

      if (result.success) {
        bound++;
        
        // Refresh the tag
        await refreshESLTags(storeId, [mac]);
      } else {
        failed++;
        errors.push({
          sku: goodsId,
          mac,
          error: result.error || 'Binding failed',
        });
      }
    } catch (err) {
      failed++;
      errors.push({
        sku: goodsId,
        mac,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Bound ${bound} of ${productsWithDevices.length} devices`,
    bound,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
