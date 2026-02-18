import { NextRequest, NextResponse } from 'next/server';
import { processSyncQueue } from '@/lib/minewTokenManager';

/**
 * GET - Process Minew sync queue
 * 
 * This endpoint should be called periodically (e.g., every 1-5 minutes)
 * to retry failed Minew synchronization operations.
 * 
 * You can set this up with:
 * 1. External cron service (like cron-job.org)
 * 2. Vercel Cron Jobs (@vercel/cron)
 * 3. Manual trigger from admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    // Skip auth check if CRON_SECRET is not set (development mode)
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[MinewCron] Starting sync queue processing...');
    const startTime = Date.now();

    const results = await processSyncQueue();

    const duration = Date.now() - startTime;
    console.log(`[MinewCron] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      ...results,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[MinewCron] Error processing sync queue:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process sync queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Manually trigger sync queue processing (same as GET)
 * Useful for admin dashboard with a "Retry Failed Syncs" button
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
