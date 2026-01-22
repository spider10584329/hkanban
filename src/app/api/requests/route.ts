import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createRequestSchema = z.object({
  manager_id: z.number(),
  product_id: z.number(),
  requested_by_id: z.number(),
  request_method: z.enum(['QR_SCAN', 'MANUAL', 'EINK_BUTTON']),
  device_info: z.string().optional().nullable(),
  requested_qty: z.number().optional().nullable(),
  location: z.string(),
  notes: z.string().optional().nullable(),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

// GET - Fetch replenishment requests
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const whereClause: any = {
      manager_id: parseInt(managerId),
    };

    if (userId) {
      whereClause.requestedById = parseInt(userId);
    }

    if (status) {
      whereClause.status = status;
    }

    const requests = await prisma.replenishmentRequest.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            location: true,
            standardOrderQty: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate stats
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;
    const completedRequests = requests.filter(r => r.status === 'COMPLETED').length;

    return NextResponse.json({
      requests,
      stats: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        completedRequests,
      },
    });
  } catch (error) {
    console.error('Error fetching replenishment requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// POST - Create a new replenishment request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRequestSchema.parse(body);

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: {
        id: validatedData.product_id,
        manager_id: validatedData.manager_id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create replenishment request
    const replenishmentRequest = await prisma.replenishmentRequest.create({
      data: {
        manager_id: validatedData.manager_id,
        productId: validatedData.product_id,
        requestedById: validatedData.requested_by_id,
        requestMethod: validatedData.request_method,
        deviceInfo: validatedData.device_info || null,
        requestedQty: validatedData.requested_qty || product.standardOrderQty || null,
        location: validatedData.location,
        notes: validatedData.notes || null,
        status: 'PENDING',
        priority: validatedData.priority,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            standardOrderQty: true,
          },
        },
        requestedBy: {
          select: {
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      request: replenishmentRequest,
      message: 'Replenishment request created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating replenishment request:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}

// PUT - Update request status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const { id, status, approved_by_id, rejection_reason } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'APPROVED' && approved_by_id) {
      updateData.approvedById = approved_by_id;
      updateData.approvedAt = new Date();
    }

    if (status === 'REJECTED' && rejection_reason) {
      updateData.rejectionReason = rejection_reason;
    }

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedRequest = await prisma.replenishmentRequest.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a request
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request id is required' },
        { status: 400 }
      );
    }

    await prisma.replenishmentRequest.delete({
      where: { id: parseInt(requestId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}
