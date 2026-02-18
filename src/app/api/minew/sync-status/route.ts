import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET - Get Minew sync queue status
 */
export async function GET(request: NextRequest) {
  try {
    // Get queue statistics
    const [pending, processing, success, failed, total] = await Promise.all([
      prisma.minewSyncQueue.count({ where: { status: 'pending' } }),
      prisma.minewSyncQueue.count({ where: { status: 'processing' } }),
      prisma.minewSyncQueue.count({ where: { status: 'success' } }),
      prisma.minewSyncQueue.count({ where: { status: 'failed' } }),
      prisma.minewSyncQueue.count(),
    ]);

    // Get recent failed items
    const recentFailed = await prisma.minewSyncQueue.findMany({
      where: { status: 'failed' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    // Get pending items
    const pendingItems = await prisma.minewSyncQueue.findMany({
      where: { status: 'pending' },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });

    // Get token status
    const tokenCache = await prisma.minewTokenCache.findFirst({
      orderBy: { lastRefreshedAt: 'desc' },
    });

    // Get config
    const config = await prisma.minewConfig.findMany();

    return NextResponse.json({
      queue: {
        pending,
        processing,
        success,
        failed,
        total,
      },
      recentFailed: recentFailed.map(item => ({
        id: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        retryCount: item.retryCount,
        maxRetries: item.maxRetries,
        lastError: item.lastError,
        scheduledAt: item.scheduledAt,
        updatedAt: item.updatedAt,
      })),
      pendingItems: pendingItems.map(item => ({
        id: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        retryCount: item.retryCount,
        scheduledAt: item.scheduledAt,
      })),
      token: tokenCache ? {
        expiresAt: tokenCache.expiresAt,
        lastRefreshedAt: tokenCache.lastRefreshedAt,
        isValid: tokenCache.expiresAt > new Date(),
      } : null,
      config: config.reduce((acc, item) => {
        acc[item.configKey] = item.configValue;
        return acc;
      }, {} as Record<string, string>),
    });
  } catch (error) {
    console.error('[MinewSyncStatus] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Retry specific failed items
 */
export async function POST(request: NextRequest) {
  try {
    const { queueIds } = await request.json();

    if (!queueIds || !Array.isArray(queueIds)) {
      return NextResponse.json(
        { error: 'queueIds array is required' },
        { status: 400 }
      );
    }

    // Reset items to pending status
    await prisma.minewSyncQueue.updateMany({
      where: {
        id: { in: queueIds },
        status: 'failed',
      },
      data: {
        status: 'pending',
        retryCount: 0,
        scheduledAt: new Date(),
        lastError: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Reset ${queueIds.length} items to retry`,
    });
  } catch (error) {
    console.error('[MinewSyncStatus] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retry items' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clean up old queue items
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysOld = parseInt(searchParams.get('daysOld') || '30');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deleted = await prisma.minewSyncQueue.deleteMany({
      where: {
        status: { in: ['success', 'failed'] },
        updatedAt: { lt: cutoffDate },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: deleted.count,
      message: `Cleaned up ${deleted.count} old queue items`,
    });
  } catch (error) {
    console.error('[MinewSyncStatus] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clean up queue' },
      { status: 500 }
    );
  }
}
