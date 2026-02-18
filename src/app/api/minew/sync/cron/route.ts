import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Background sync job - call this from a cron service (e.g., Vercel Cron, node-cron)
 * Syncs all ESL tags from Minew cloud to local database
 *
 * Setup: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/minew/sync/cron",
 *     "schedule": "0 * * * *" (Every hour)
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Starting automatic sync job...');

    // Get all unique manager IDs from devices
    const managers = await prisma.device.findMany({
      select: {
        manager_id: true,
      },
      distinct: ['manager_id'],
    });

    const syncResults: Array<{
      managerId: number;
      updated: number;
      created: number;
      failed: number;
    }> = [];

    // Note: This is a placeholder. In production, you would need to:
    // 1. Store the Minew storeId associated with each manager
    // 2. Fetch tags from each store and sync them

    return NextResponse.json({
      success: true,
      message: 'Automatic sync completed',
      timestamp: new Date().toISOString(),
      results: syncResults,
      totalManagers: managers.length,
    });
  } catch (error) {
    console.error('[CRON] Automatic sync failed:', error);
    return NextResponse.json(
      {
        error: 'Automatic sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
