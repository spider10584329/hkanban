import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const lowStock = products.filter(p =>
      p.reorderThreshold && p.reorderThreshold > 0
    ).length; // Simplified - in a real app you'd check actual stock levels

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
        storageRequirements: product.storageRequirements,
        reorderThreshold: product.reorderThreshold,
        standardOrderQty: product.standardOrderQty,
        unitPrice: product.unitPrice,
        qrCodeUrl: product.qrCodeUrl,
        einkDeviceId: product.einkDeviceId,
        hasEinkDevice: product.hasEinkDevice,
        isActive: product.isActive,
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
      storageRequirements,
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

    const product = await prisma.product.create({
      data: {
        manager_id: parseInt(manager_id),
        name: name.trim(),
        description: description?.trim() || null,
        sku: sku?.trim() || null,
        qrCodeUrl: qrCodeUrl?.trim() || null,
        einkDeviceId: einkDeviceId?.trim() || null,
        categoryId: parseInt(categoryId),
        supplierId: supplierId ? parseInt(supplierId) : null,
        location: location.trim(),
        storageRequirements: storageRequirements?.trim() || null,
        reorderThreshold: reorderThreshold ? parseInt(reorderThreshold) : null,
        standardOrderQty: standardOrderQty ? parseInt(standardOrderQty) : null,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        createdById: createdById ? parseInt(createdById) : 1, // Default to 1 if not provided
        isActive: 1,
        hasEinkDevice: einkDeviceId?.trim() ? 1 : 0,
        updatedAt: new Date(),
      },
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
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        supplierId: product.supplierId,
        supplierName: product.supplier?.name || null,
        location: product.location,
        storageRequirements: product.storageRequirements,
        reorderThreshold: product.reorderThreshold,
        standardOrderQty: product.standardOrderQty,
        unitPrice: product.unitPrice,
        qrCodeUrl: product.qrCodeUrl,
        einkDeviceId: product.einkDeviceId,
        hasEinkDevice: product.hasEinkDevice,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
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
    if (updateFields.storageRequirements !== undefined) updateData.storageRequirements = updateFields.storageRequirements?.trim() || null;
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
        storageRequirements: updatedProduct.storageRequirements,
        reorderThreshold: updatedProduct.reorderThreshold,
        standardOrderQty: updatedProduct.standardOrderQty,
        unitPrice: updatedProduct.unitPrice,
        qrCodeUrl: updatedProduct.qrCodeUrl,
        einkDeviceId: updatedProduct.einkDeviceId,
        hasEinkDevice: updatedProduct.hasEinkDevice,
        isActive: updatedProduct.isActive,
        createdAt: updatedProduct.createdAt,
        updatedAt: updatedProduct.updatedAt,
      },
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

    await prisma.product.delete({
      where: { id: parseInt(productId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
