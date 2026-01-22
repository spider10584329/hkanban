import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const managerIdNum = parseInt(managerId);

    // Fetch all data in parallel for better performance
    const [
      products,
      orders,
      requests,
      suppliers,
      users,
      categories,
      recentRequests,
      recentOrders,
    ] = await Promise.all([
      // Products stats
      prisma.product.findMany({
        where: { manager_id: managerIdNum },
        select: {
          id: true,
          isActive: true,
          qrCodeUrl: true,
          hasEinkDevice: true,
          reorderThreshold: true,
        },
      }),
      // Orders
      prisma.order.findMany({
        where: { manager_id: managerIdNum },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          expectedDelivery: true,
        },
      }),
      // Replenishment requests
      prisma.replenishmentRequest.findMany({
        where: { manager_id: managerIdNum },
        select: {
          id: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),
      // Suppliers
      prisma.supplier.findMany({
        where: { manager_id: managerIdNum },
        select: {
          id: true,
          isActive: true,
        },
      }),
      // Users
      prisma.user.findMany({
        where: { manager_id: managerIdNum },
        select: {
          id: true,
          isActive: true,
        },
      }),
      // Categories
      prisma.category.count({
        where: { manager_id: managerIdNum },
      }),
      // Recent requests with details
      prisma.replenishmentRequest.findMany({
        where: { manager_id: managerIdNum },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          product: {
            select: {
              name: true,
            },
          },
          requestedBy: {
            select: {
              username: true,
            },
          },
        },
      }),
      // Recent orders with details
      prisma.order.findMany({
        where: { manager_id: managerIdNum },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          supplier: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              orderItems: true,
            },
          },
        },
      }),
    ]);

    // Calculate product stats
    const productStats = {
      total: products.length,
      active: products.filter(p => p.isActive === 1).length,
      withQrCode: products.filter(p => p.qrCodeUrl).length,
      withEink: products.filter(p => p.hasEinkDevice === 1).length,
      lowStock: products.filter(p => p.reorderThreshold && p.reorderThreshold > 0).length,
    };

    // Calculate order stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthOrders = orders.filter(o => new Date(o.createdAt) >= firstDayOfMonth);
    const thisMonthSpending = thisMonthOrders.reduce((sum, o) => {
      return sum + (o.totalAmount ? Number(o.totalAmount) : 0);
    }, 0);

    const orderStats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      sent: orders.filter(o => o.status === 'SENT').length,
      inTransit: orders.filter(o => o.status === 'IN_TRANSIT').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length,
      thisMonthSpending,
    };

    // Calculate overdue orders
    const overdueOrders = orders.filter(o => {
      if (!o.expectedDelivery) return false;
      if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return false;
      return new Date(o.expectedDelivery) < now;
    }).length;

    // Calculate request stats
    const requestStats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      ordered: requests.filter(r => r.status === 'ORDERED').length,
      completed: requests.filter(r => r.status === 'COMPLETED').length,
    };

    // Calculate urgent requests
    const urgentPending = requests.filter(
      r => r.status === 'PENDING' && (r.priority === 'URGENT' || r.priority === 'HIGH')
    ).length;

    // Calculate supplier stats
    const supplierStats = {
      total: suppliers.length,
      active: suppliers.filter(s => s.isActive === 1).length,
    };

    // Calculate user stats
    const userStats = {
      total: users.length,
      active: users.filter(u => u.isActive === 1).length,
    };

    // Calculate weekly trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyRequests = requests.filter(r => new Date(r.createdAt) >= sevenDaysAgo).length;
    const weeklyOrders = orders.filter(o => new Date(o.createdAt) >= sevenDaysAgo).length;

    // Format recent activity
    const recentActivity = {
      requests: recentRequests.map(r => ({
        id: r.id,
        productName: r.product.name,
        requestedBy: r.requestedBy.username,
        status: r.status,
        priority: r.priority,
        createdAt: r.createdAt,
      })),
      orders: recentOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        supplierName: o.supplier.name,
        status: o.status,
        totalAmount: o.totalAmount,
        itemCount: o._count.orderItems,
        createdAt: o.createdAt,
      })),
    };

    // Alerts
    const alerts = {
      urgentPending,
      overdueOrders,
      lowStockProducts: productStats.lowStock,
      pendingApprovals: requestStats.pending,
    };

    return NextResponse.json({
      overview: {
        totalProducts: productStats.total,
        totalOrders: orderStats.total,
        totalRequests: requestStats.total,
        totalSuppliers: supplierStats.total,
        totalUsers: userStats.total,
        totalCategories: categories,
        thisMonthSpending,
      },
      productStats,
      orderStats,
      requestStats,
      supplierStats,
      userStats,
      alerts,
      trends: {
        weeklyRequests,
        weeklyOrders,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
