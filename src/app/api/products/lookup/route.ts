import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Lookup product by SKU or QR code URL
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');
    const code = searchParams.get('code'); // Can be SKU or QR code URL

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'code (SKU or QR code) is required' },
        { status: 400 }
      );
    }

    // Try to find product by SKU, QR code URL, or E-ink device ID
    const product = await prisma.product.findFirst({
      where: {
        manager_id: parseInt(managerId),
        isActive: 1,
        OR: [
          { sku: code.trim() },
          { qrCodeUrl: code.trim() },
          { einkDeviceId: code.trim() },
        ],
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
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

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
        hasEinkDevice: product.hasEinkDevice,
        isActive: product.isActive,
      },
    });
  } catch (error) {
    console.error('Error looking up product:', error);
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    );
  }
}
