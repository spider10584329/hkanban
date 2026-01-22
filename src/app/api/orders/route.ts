import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createOrderSchema = z.object({
  manager_id: z.number(),
  supplierId: z.number(),
  requestIds: z.array(z.number()).min(1),
  expectedDelivery: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET - Fetch orders
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplier_id');

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const whereClause: any = {
      manager_id: parseInt(managerId),
    };

    if (status) {
      whereClause.status = status;
    }

    if (supplierId) {
      whereClause.supplierId = parseInt(supplierId);
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactName: true,
            phone: true,
            email: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unitPrice: true,
              },
            },
            replenishmentRequest: {
              select: {
                id: true,
                priority: true,
                requestedBy: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        },
        receivedBy: {
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

    // Get suppliers for dropdown
    const suppliers = await prisma.supplier.findMany({
      where: {
        manager_id: parseInt(managerId),
        isActive: 1,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const sentOrders = orders.filter(o => o.status === 'SENT').length;
    const inTransitOrders = orders.filter(o => o.status === 'IN_TRANSIT').length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;

    // Calculate this month's spending
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthOrders = orders.filter(o => new Date(o.createdAt) >= firstDayOfMonth);
    const thisMonthSpending = thisMonthOrders.reduce((sum, o) => {
      return sum + (o.totalAmount ? Number(o.totalAmount) : 0);
    }, 0);

    return NextResponse.json({
      orders,
      suppliers,
      stats: {
        totalOrders,
        pendingOrders,
        sentOrders,
        inTransitOrders,
        deliveredOrders,
        thisMonthSpending,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST - Create a new order from approved requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // Get approved requests with their products
    const requests = await prisma.replenishmentRequest.findMany({
      where: {
        id: { in: validatedData.requestIds },
        manager_id: validatedData.manager_id,
        status: 'APPROVED',
      },
      include: {
        product: {
          select: {
            id: true,
            supplierId: true,
            unitPrice: true,
            standardOrderQty: true,
          },
        },
      },
    });

    if (requests.length === 0) {
      return NextResponse.json(
        { error: 'No approved requests found' },
        { status: 400 }
      );
    }

    // Verify all products belong to the specified supplier
    const invalidProducts = requests.filter(
      r => r.product.supplierId !== validatedData.supplierId
    );
    if (invalidProducts.length > 0) {
      return NextResponse.json(
        { error: 'Some products do not belong to the specified supplier' },
        { status: 400 }
      );
    }

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { manager_id: validatedData.manager_id },
    });
    const orderNumber = `ORD-${String(orderCount + 1).padStart(5, '0')}`;

    // Calculate total amount
    let totalAmount = 0;
    const orderItemsData = requests.map(req => {
      const quantity = req.requestedQty || req.product.standardOrderQty || 1;
      const unitPrice = req.product.unitPrice ? Number(req.product.unitPrice) : 0;
      const itemTotal = quantity * unitPrice;
      totalAmount += itemTotal;

      return {
        manager_id: validatedData.manager_id,
        productId: req.product.id,
        replenishmentRequestId: req.id,
        quantity,
        unitPrice: unitPrice,
        totalPrice: itemTotal,
        updatedAt: new Date(),
      };
    });

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          manager_id: validatedData.manager_id,
          orderNumber,
          supplierId: validatedData.supplierId,
          status: 'PENDING',
          expectedDelivery: validatedData.expectedDelivery
            ? new Date(validatedData.expectedDelivery)
            : null,
          totalAmount,
          updatedAt: new Date(),
        },
      });

      // Create order items
      for (const item of orderItemsData) {
        await tx.orderItem.create({
          data: {
            ...item,
            orderId: newOrder.id,
          },
        });
      }

      // Update request statuses to ORDERED
      await tx.replenishmentRequest.updateMany({
        where: {
          id: { in: validatedData.requestIds },
        },
        data: {
          status: 'ORDERED',
          updatedAt: new Date(),
        },
      });

      return newOrder;
    });

    // Fetch the complete order with relations
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        supplier: {
          select: {
            name: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      order: completeOrder,
      message: 'Order created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// PUT - Update order status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, trackingNumber, trackingUrl, receivedById, receiptNotes, actualDelivery } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Order id is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
    }

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber;
    }

    if (trackingUrl !== undefined) {
      updateData.trackingUrl = trackingUrl;
    }

    if (status === 'DELIVERED') {
      updateData.actualDelivery = actualDelivery ? new Date(actualDelivery) : new Date();
      if (receivedById) {
        updateData.receivedById = receivedById;
        updateData.receivedAt = new Date();
      }
      if (receiptNotes) {
        updateData.receiptNotes = receiptNotes;
      }
    }

    // Update order and linked requests in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          orderItems: true,
          supplier: {
            select: {
              name: true,
            },
          },
        },
      });

      // If order is DELIVERED, update linked replenishment requests to COMPLETED
      if (status === 'DELIVERED') {
        const requestIds = order.orderItems
          .filter(item => item.replenishmentRequestId)
          .map(item => item.replenishmentRequestId as number);

        if (requestIds.length > 0) {
          await tx.replenishmentRequest.updateMany({
            where: {
              id: { in: requestIds },
            },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }

      return order;
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an order
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order id is required' },
        { status: 400 }
      );
    }

    // Get order items to restore request statuses
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Delete order and restore request statuses in transaction
    await prisma.$transaction(async (tx) => {
      // Get request IDs that were linked to this order
      const requestIds = order.orderItems
        .filter(item => item.replenishmentRequestId)
        .map(item => item.replenishmentRequestId as number);

      // Restore requests back to APPROVED status
      if (requestIds.length > 0) {
        await tx.replenishmentRequest.updateMany({
          where: {
            id: { in: requestIds },
          },
          data: {
            status: 'APPROVED',
            updatedAt: new Date(),
          },
        });
      }

      // Delete the order (cascade will delete order items)
      await tx.order.delete({
        where: { id: parseInt(orderId) },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
