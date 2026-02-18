import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMinewToken, getDefaultStoreId, addToSyncQueue } from '@/lib/minewTokenManager';

// GET - Fetch products by manager_id with category and supplier info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        manager_id: parseInt(managerId),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate stats
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive === 1).length;
    const withQrCode = products.filter(p => p.qrCodeUrl).length;
    const withEink = products.filter(p => p.hasEinkDevice === 1).length;
    // Low stock is determined by actual replenishment requests, not by reorderThreshold
    const lowStock = 0;

    // Get categories for filter dropdown
    const categories = await prisma.category.findMany({
      where: { manager_id: parseInt(managerId) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Get suppliers for filter/form dropdown (include all suppliers for admin)
    const suppliers = await prisma.supplier.findMany({
      where: { manager_id: parseInt(managerId) },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        supplierId: product.supplierId,
        supplierName: product.supplier?.name || null,
        location: product.location,
        reorderThreshold: product.reorderThreshold,
        standardOrderQty: product.standardOrderQty,
        unitPrice: product.unitPrice,
        qrCodeUrl: product.qrCodeUrl,
        einkDeviceId: product.einkDeviceId,
        hasEinkDevice: product.hasEinkDevice,
        isActive: product.isActive,
        minewSynced: (product as any).minewSynced || 0,
        minewSyncedAt: (product as any).minewSyncedAt || null,
        minewSyncError: (product as any).minewSyncError || null,
        minewBoundLabel: (product as any).minewBoundLabel || null,
        minewBoundAt: (product as any).minewBoundAt || null,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
      stats: {
        totalProducts,
        activeProducts,
        withQrCode,
        withEink,
        lowStock,
      },
      categories,
      suppliers,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      manager_id,
      name,
      description,
      sku,
      qrCodeUrl,
      einkDeviceId,
      categoryId,
      supplierId,
      location,
      reorderThreshold,
      standardOrderQty,
      unitPrice,
      createdById,
    } = body;

    if (!manager_id || !name || !categoryId || !location) {
      return NextResponse.json(
        { error: 'manager_id, name, categoryId, and location are required' },
        { status: 400 }
      );
    }

    // Check if SKU already exists for this manager (if provided)
    if (sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          manager_id: parseInt(manager_id),
          sku: sku.trim(),
        },
      });

      if (existingSku) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // createdById is optional - use if provided and valid, otherwise null
    let validCreatedById: number | null = createdById ? parseInt(createdById) : null;

    // If createdById provided, verify it exists
    if (validCreatedById) {
      const userExists = await prisma.user.findUnique({
        where: { id: validCreatedById },
        select: { id: true },
      });
      if (!userExists) {
        validCreatedById = null;
      }
    }

    // Use raw SQL to insert product to bypass Prisma client cache issues
    const now = new Date();
    const result = await prisma.$executeRaw`
      INSERT INTO products (
        manager_id, name, description, sku, qrCodeUrl, einkDeviceId,
        categoryId, supplierId, location,
        reorderThreshold, standardOrderQty, unitPrice, createdById,
        isActive, hasEinkDevice, createdAt, updatedAt
      ) VALUES (
        ${parseInt(manager_id)},
        ${name.trim()},
        ${description?.trim() || null},
        ${sku?.trim() || null},
        ${qrCodeUrl?.trim() || null},
        ${einkDeviceId?.trim() || null},
        ${parseInt(categoryId)},
        ${supplierId ? parseInt(supplierId) : null},
        ${location.trim()},
        ${reorderThreshold ? parseInt(reorderThreshold) : null},
        ${standardOrderQty ? parseInt(standardOrderQty) : null},
        ${unitPrice ? parseFloat(unitPrice) : null},
        ${validCreatedById},
        1,
        ${einkDeviceId?.trim() ? 1 : 0},
        ${now},
        ${now}
      )
    `;

    // Get the created product with relations
    const product = await prisma.product.findFirst({
      where: {
        manager_id: parseInt(manager_id),
        name: name.trim(),
        createdAt: {
          gte: new Date(now.getTime() - 5000), // Within last 5 seconds
        },
      },
      orderBy: { id: 'desc' },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product created but could not be retrieved' },
        { status: 500 }
      );
    }

    // ✨ Sync to Minew Cloud (Using improved token manager)
    let minewSyncSuccess = false;
    let minewSyncError: string | null = null;

    try {
      console.log('[Product Creation] Starting Minew sync...');
      
      // Get cached Minew credentials
      const token = await getMinewToken();
      const storeId = await getDefaultStoreId();

      console.log('[Product Creation] Token available:', !!token);
      console.log('[Product Creation] StoreId available:', !!storeId, storeId);

      if (token && storeId) {
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

        console.log('[Product Creation] Minew data prepared:', JSON.stringify(minewData, null, 2));

        // Sync to Minew using direct API call
        const minewApiBase = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
        const minewUrl = `${minewApiBase}/apis/esl/goods/addToStore`;
        console.log('[Product Creation] Calling Minew API:', minewUrl);
        
        const minewResponse = await fetch(minewUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json;charset=utf-8',
            'token': token,
          },
          body: JSON.stringify({ storeId, ...minewData }),
        });

        const minewResult = await minewResponse.json();
        console.log('[Product Creation] Minew API response:', JSON.stringify(minewResult, null, 2));

        if (minewResult.code === 200) {
          minewSyncSuccess = true;
          // Update sync status in database
          await prisma.$executeRaw`
            UPDATE products 
            SET minewSynced = 1, 
                minewSyncedAt = ${new Date()}, 
                minewGoodsId = ${product.id.toString()},
                minewSyncError = NULL,
                updatedAt = ${new Date()}
            WHERE id = ${product.id}
          `;
          console.log(`[Product ${product.id}] Successfully synced to Minew`);
        } else {
          minewSyncError = minewResult.msg || 'Minew sync failed';
          console.error(`[Product ${product.id}] Minew sync failed:`, minewSyncError);
          // Add to retry queue
          await addToSyncQueue('product', product.id, 'create', minewData);
          // Update sync error in database
          await prisma.$executeRaw`
            UPDATE products 
            SET minewSynced = 0, 
                minewSyncError = ${minewSyncError},
                updatedAt = ${new Date()}
            WHERE id = ${product.id}
          `;
          console.error(`[Product ${product.id}] Minew sync failed:`, minewSyncError);
        }
      } else {
        minewSyncError = token ? 'No Minew store found' : 'Cannot get Minew token';
        console.error(`[Product ${product.id}] Minew prerequisites missing - Token: ${!!token}, StoreId: ${!!storeId}`);
        // Add to retry queue
        await addToSyncQueue('product', product.id, 'create', {
          id: product.id.toString(),
          name: product.name,
          price: product.unitPrice?.toString() || "0.00",
        });
        await prisma.$executeRaw`
          UPDATE products 
          SET minewSynced = 0, 
              minewSyncError = ${minewSyncError},
              updatedAt = ${new Date()}
          WHERE id = ${product.id}
        `;
        console.error(`[Product ${product.id}] Minew prerequisites failed:`, minewSyncError);
      }
    } catch (error) {
      minewSyncError = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('[Product] Minew sync error:', error);
      // Add to retry queue
      await addToSyncQueue('product', product.id, 'create', {
        id: product.id.toString(),
        name: product.name,
      });
      // Update sync error in database
      await prisma.$executeRaw`
        UPDATE products 
        SET minewSynced = 0, 
            minewSyncError = ${minewSyncError},
            updatedAt = ${new Date()}
        WHERE id = ${product.id}
      `;
    }

    // Get updated product with sync status
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      product: {
        id: updatedProduct!.id,
        name: updatedProduct!.name,
        description: updatedProduct!.description,
        sku: updatedProduct!.sku,
        categoryId: updatedProduct!.categoryId,
        categoryName: updatedProduct!.category.name,
        supplierId: updatedProduct!.supplierId,
        supplierName: updatedProduct!.supplier?.name || null,
        location: updatedProduct!.location,
        reorderThreshold: updatedProduct!.reorderThreshold,
        standardOrderQty: updatedProduct!.standardOrderQty,
        unitPrice: updatedProduct!.unitPrice,
        qrCodeUrl: updatedProduct!.qrCodeUrl,
        einkDeviceId: updatedProduct!.einkDeviceId,
        hasEinkDevice: updatedProduct!.hasEinkDevice,
        isActive: updatedProduct!.isActive,
        minewSynced: (updatedProduct as any).minewSynced || 0,
        minewSyncedAt: (updatedProduct as any).minewSyncedAt || null,
        minewSyncError: (updatedProduct as any).minewSyncError || null,
        createdAt: updatedProduct!.createdAt,
        updatedAt: updatedProduct!.updatedAt,
      },
      minewSyncSuccess,
      minewSyncError,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT - Update a product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Check if SKU already exists for another product
    if (updateFields.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          sku: updateFields.sku.trim(),
          NOT: { id: parseInt(id) },
        },
      });

      if (existingSku) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updateFields.name !== undefined) updateData.name = updateFields.name.trim();
    if (updateFields.description !== undefined) updateData.description = updateFields.description?.trim() || null;
    if (updateFields.sku !== undefined) updateData.sku = updateFields.sku?.trim() || null;
    if (updateFields.qrCodeUrl !== undefined) updateData.qrCodeUrl = updateFields.qrCodeUrl?.trim() || null;
    if (updateFields.einkDeviceId !== undefined) {
      updateData.einkDeviceId = updateFields.einkDeviceId?.trim() || null;
      updateData.hasEinkDevice = updateFields.einkDeviceId?.trim() ? 1 : 0;
    }
    if (updateFields.categoryId !== undefined) updateData.categoryId = parseInt(updateFields.categoryId);
    if (updateFields.supplierId !== undefined) updateData.supplierId = updateFields.supplierId ? parseInt(updateFields.supplierId) : null;
    if (updateFields.location !== undefined) updateData.location = updateFields.location.trim();
    if (updateFields.reorderThreshold !== undefined) updateData.reorderThreshold = updateFields.reorderThreshold ? parseInt(updateFields.reorderThreshold) : null;
    if (updateFields.standardOrderQty !== undefined) updateData.standardOrderQty = updateFields.standardOrderQty ? parseInt(updateFields.standardOrderQty) : null;
    if (updateFields.unitPrice !== undefined) updateData.unitPrice = updateFields.unitPrice ? parseFloat(updateFields.unitPrice) : null;
    if (updateFields.isActive !== undefined) updateData.isActive = updateFields.isActive ? 1 : 0;

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    // ✨ Sync update to Minew Cloud (if product was previously synced)
    const productData: any = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    let minewSyncSuccess = false;
    let minewSyncError: string | null = null;

    if (productData && productData.minewSynced === 1) {
      try {
        // Get cached Minew credentials
        const token = await getMinewToken();
        const storeId = await getDefaultStoreId();

        if (token && storeId) {
          const goodsId = productData.minewGoodsId || updatedProduct.id.toString();
          const minewData = {
            name: updatedProduct.name,
            price: updatedProduct.unitPrice?.toString() || "0.00",
            coding: updatedProduct.sku || "",
            barcode: updatedProduct.qrCodeUrl || "",
            qrcode: updatedProduct.qrCodeUrl || "",
            PartNo: updatedProduct.sku || "",
            specification: updatedProduct.description || "",
            quantity: updatedProduct.standardOrderQty?.toString() || "0",
            supplier: updatedProduct.supplier?.name || "",
          };

          // Sync to Minew using direct API call
          const minewApiBase = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
          const minewResponse = await fetch(`${minewApiBase}/apis/esl/goods/update`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json;charset=utf-8',
              'token': token,
            },
            body: JSON.stringify({ 
              storeId, 
              id: goodsId,
              ...minewData 
            }),
          });

          const minewResult = await minewResponse.json();

          if (minewResult.code === 200) {
            minewSyncSuccess = true;
            await prisma.$executeRaw`
              UPDATE products 
              SET minewSyncedAt = ${new Date()}, minewSyncError = NULL
              WHERE id = ${updatedProduct.id}
            `;
            console.log(`[Product ${updatedProduct.id}] Successfully updated in Minew`);
          } else {
            minewSyncError = minewResult.msg || 'Minew update failed';
            // Add to retry queue
            await addToSyncQueue('product', updatedProduct.id, 'update', minewData);
            await prisma.$executeRaw`
              UPDATE products 
              SET minewSynced = 0, minewSyncError = ${minewSyncError}
              WHERE id = ${updatedProduct.id}
            `;
            console.error(`[Product ${updatedProduct.id}] Minew update failed:`, minewSyncError);
          }
        } else {
          minewSyncError = token ? 'No Minew store found' : 'Cannot get Minew token';
          await addToSyncQueue('product', updatedProduct.id, 'update', { id: updatedProduct.id.toString() });
        }
      } catch (error) {
        minewSyncError = error instanceof Error ? error.message : 'Unknown sync error';
        await addToSyncQueue('product', updatedProduct.id, 'update', { id: updatedProduct.id.toString() });
        await prisma.$executeRaw`
          UPDATE products 
          SET minewSynced = 0, minewSyncError = ${minewSyncError}
          WHERE id = ${updatedProduct.id}
        `;
        console.error('[Product] Minew update error:', error);
      }
    }

    return NextResponse.json({
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        sku: updatedProduct.sku,
        categoryId: updatedProduct.categoryId,
        categoryName: updatedProduct.category.name,
        supplierId: updatedProduct.supplierId,
        supplierName: updatedProduct.supplier?.name || null,
        location: updatedProduct.location,
        reorderThreshold: updatedProduct.reorderThreshold,
        standardOrderQty: updatedProduct.standardOrderQty,
        unitPrice: updatedProduct.unitPrice,
        qrCodeUrl: updatedProduct.qrCodeUrl,
        einkDeviceId: updatedProduct.einkDeviceId,
        hasEinkDevice: updatedProduct.hasEinkDevice,
        isActive: updatedProduct.isActive,
        minewSynced: productData?.minewSynced || 0,
        minewSyncedAt: productData?.minewSyncedAt || null,
        minewSyncError: productData?.minewSyncError || minewSyncError,
        createdAt: updatedProduct.createdAt,
        updatedAt: updatedProduct.updatedAt,
      },
      minewSyncSuccess,
      minewSyncError,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a product
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('id');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product id is required' },
        { status: 400 }
      );
    }

    // Check if product has order items or replenishment requests
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      include: {
        _count: {
          select: {
            orderItems: true,
            replenishmentRequests: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product._count.orderItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing order items.' },
        { status: 400 }
      );
    }

    if (product._count.replenishmentRequests > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing replenishment requests.' },
        { status: 400 }
      );
    }

    // ✨ Delete from Minew Cloud if synced
    let minewDeleteSuccess = false;
    let minewDeleteError: string | null = null;

    const productData: any = product;
    if (productData.minewSynced === 1 && productData.minewGoodsId) {
      try {
        console.log(`[Product Delete] Starting Minew deletion for product ${productId}`);
        
        // Get cached Minew credentials
        const token = await getMinewToken();
        const storeId = await getDefaultStoreId();

        console.log(`[Product Delete] Token available: ${!!token}`);
        console.log(`[Product Delete] StoreId available: ${!!storeId}, value: ${storeId}`);
        console.log(`[Product Delete] Minew goodsId: ${productData.minewGoodsId}`);

        if (token && storeId) {
          // Use batch delete endpoint as per API documentation (Section 3.5)
          // Endpoint: /apis/esl/goods/batchDelete
          // Parameters: storeId, idArray (array of product IDs to delete)
          const minewApiBase = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
          const minewUrl = `${minewApiBase}/apis/esl/goods/batchDelete`;
          
          const requestBody = { 
            storeId, 
            idArray: [productData.minewGoodsId] // Array of product IDs
          };
          
          console.log(`[Product Delete] Calling Minew API: ${minewUrl}`);
          console.log(`[Product Delete] Request body:`, JSON.stringify(requestBody, null, 2));
          
          const minewResponse = await fetch(minewUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json;charset=utf-8',
              'token': token,
            },
            body: JSON.stringify(requestBody),
          });

          const minewResult = await minewResponse.json();
          console.log(`[Product Delete] Minew API response:`, JSON.stringify(minewResult, null, 2));

          if (minewResult.code === 200) {
            minewDeleteSuccess = true;
            console.log(`[Product ${productId}] Successfully deleted from Minew cloud`);
          } else {
            minewDeleteError = minewResult.msg || 'Minew delete failed';
            console.error(`[Product ${productId}] Minew delete failed (code: ${minewResult.code}):`, minewDeleteError);
            // Add to retry queue
            await addToSyncQueue('product', parseInt(productId), 'delete', {
              goodsId: productData.minewGoodsId
            });
          }
        } else {
          minewDeleteError = token ? 'No Minew store found' : 'Cannot get Minew token';
          console.error(`[Product ${productId}] Minew delete prerequisites failed:`, minewDeleteError);
        }
      } catch (error) {
        minewDeleteError = error instanceof Error ? error.message : 'Unknown delete error';
        console.error('[Product Delete] Minew delete error:', error);
        // Don't block local deletion if Minew delete fails
      }
    } else {
      console.log(`[Product ${productId}] Skipping Minew deletion - synced: ${productData.minewSynced}, goodsId: ${productData.minewGoodsId}`);
    }

    // Delete from local database regardless of Minew sync status
    await prisma.product.delete({
      where: { id: parseInt(productId) },
    });

    return NextResponse.json({ 
      success: true,
      minewDeleteSuccess,
      minewDeleteError,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
