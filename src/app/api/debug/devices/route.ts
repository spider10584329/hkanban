import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DEBUG ENDPOINT - Get device status from database
 * GET /api/debug/devices?manager_id={id}&deviceId={mac}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');
    const deviceId = searchParams.get('deviceId');

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const whereClause: any = {
      manager_id: parseInt(managerId),
    };

    if (deviceId) {
      // Try both exact match and cleaned MAC
      const cleanMac = deviceId.replace(/[:-]/g, '').toLowerCase();
      whereClause.OR = [
        { deviceId: deviceId },
        { deviceId: cleanMac },
        { deviceId: { contains: cleanMac.slice(-6) } },
      ];
    }

    const devices = await prisma.deviceStatus.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: deviceId ? 10 : 100, // Limit results
    });

    // Get database schema info
    const tableInfo = await prisma.$queryRaw`
      DESCRIBE device_status
    `;

    return NextResponse.json({
      success: true,
      query: whereClause,
      count: devices.length,
      devices,
      tableSchema: tableInfo,
    });
  } catch (error) {
    console.error('Debug devices error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch debug info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DEBUG ENDPOINT - Check database connection and last inserted device
 * POST /api/debug/devices - Get recent devices and connection status
 */
export async function POST(request: NextRequest) {
  try {
    const { manager_id } = await request.json();

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    // Get connection info
    const connectionTest = await prisma.$queryRaw`SELECT 1 as connected`;

    // Get total count
    const totalCount = await prisma.deviceStatus.count({
      where: { manager_id: Number(manager_id) },
    });

    // Get last 5 devices
    const recentDevices = await prisma.deviceStatus.findMany({
      where: { manager_id: Number(manager_id) },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get devices created in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentlyAdded = await prisma.deviceStatus.findMany({
      where: {
        manager_id: Number(manager_id),
        createdAt: { gte: fiveMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      databaseConnected: connectionTest ? true : false,
      manager_id: Number(manager_id),
      statistics: {
        totalDevices: totalCount,
        recentlyAdded: recentlyAdded.length,
      },
      recentDevices,
      recentlyAddedDevices: recentlyAdded,
    });
  } catch (error) {
    console.error('Debug POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get debug info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
