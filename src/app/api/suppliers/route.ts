import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch suppliers by manager_id with product and order counts
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

    const suppliers = await prisma.supplier.findMany({
      where: {
        manager_id: parseInt(managerId),
      },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate stats
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.isActive === 1).length;
    const pendingOrders = suppliers.reduce(
      (sum, supplier) => sum + supplier._count.orders,
      0
    );
    const totalProducts = suppliers.reduce(
      (sum, supplier) => sum + supplier._count.products,
      0
    );

    return NextResponse.json({
      suppliers: suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        contactName: supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        isActive: supplier.isActive,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
        productCount: supplier._count.products,
        orderCount: supplier._count.orders,
      })),
      stats: {
        totalSuppliers,
        activeSuppliers,
        pendingOrders,
        totalProducts,
      },
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST - Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const { manager_id, name, contactName, phone, email, address } = await request.json();

    if (!manager_id || !name) {
      return NextResponse.json(
        { error: 'manager_id and name are required' },
        { status: 400 }
      );
    }

    // Check if supplier with same name already exists for this manager
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        manager_id: parseInt(manager_id),
        name: name.trim(),
      },
    });

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'A supplier with this name already exists' },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        manager_id: parseInt(manager_id),
        name: name.trim(),
        contactName: contactName?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        isActive: 1,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        contactName: supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        isActive: supplier.isActive,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
        productCount: 0,
        orderCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}

// PUT - Update a supplier
export async function PUT(request: NextRequest) {
  try {
    const { id, name, contactName, phone, email, address, isActive } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // If name is provided, check for duplicates
    if (name) {
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          name: name.trim(),
          NOT: { id: parseInt(id) },
        },
      });

      if (existingSupplier) {
        return NextResponse.json(
          { error: 'A supplier with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (contactName !== undefined) updateData.contactName = contactName?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0;

    const updatedSupplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    return NextResponse.json({
      supplier: {
        id: updatedSupplier.id,
        name: updatedSupplier.name,
        contactName: updatedSupplier.contactName,
        phone: updatedSupplier.phone,
        email: updatedSupplier.email,
        address: updatedSupplier.address,
        isActive: updatedSupplier.isActive,
        createdAt: updatedSupplier.createdAt,
        updatedAt: updatedSupplier.updatedAt,
        productCount: updatedSupplier._count.products,
        orderCount: updatedSupplier._count.orders,
      },
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a supplier
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('id');

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Supplier id is required' },
        { status: 400 }
      );
    }

    // Check if supplier has products or orders
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(supplierId) },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    if (supplier._count.products > 0) {
      return NextResponse.json(
        { error: 'Cannot delete supplier with existing products. Please reassign or delete products first.' },
        { status: 400 }
      );
    }

    if (supplier._count.orders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete supplier with existing orders. Please delete orders first.' },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({
      where: { id: parseInt(supplierId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
