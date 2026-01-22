import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch categories by manager_id with product counts
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

    const categories = await prisma.category.findMany({
      where: {
        manager_id: parseInt(managerId),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate stats
    const totalCategories = categories.length;
    const totalActiveProducts = categories.reduce(
      (sum, cat) => sum + cat._count.products,
      0
    );
    const mostUsedCategory = categories.reduce(
      (max, cat) => (cat._count.products > (max?._count.products || 0) ? cat : max),
      null as (typeof categories)[0] | null
    );

    return NextResponse.json({
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        productCount: cat._count.products,
      })),
      stats: {
        totalCategories,
        totalActiveProducts,
        mostUsed: mostUsedCategory?.name || null,
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const { manager_id, name, description, icon } = await request.json();

    if (!manager_id || !name) {
      return NextResponse.json(
        { error: 'manager_id and name are required' },
        { status: 400 }
      );
    }

    // Check if category with same name already exists for this manager
    const existingCategory = await prisma.category.findFirst({
      where: {
        manager_id: parseInt(manager_id),
        name: name.trim(),
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        manager_id: parseInt(manager_id),
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        productCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// PUT - Update a category
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description, icon } = await request.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: 'id and name are required' },
        { status: 400 }
      );
    }

    // Check if another category with same name exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        NOT: { id: parseInt(id) },
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      );
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        icon: updatedCategory.icon,
        createdAt: updatedCategory.createdAt,
        updatedAt: updatedCategory.updatedAt,
        productCount: updatedCategory._count.products,
      },
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a category
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category id is required' },
        { status: 400 }
      );
    }

    // Check if category has products
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing products. Please reassign or delete products first.' },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: parseInt(categoryId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
