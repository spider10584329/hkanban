import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getButtonEvents, wakeUpTags, getAllTagsForWakeup } from '@/lib/minew';
import { getDefaultStoreId } from '@/lib/minewTokenManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storeId = await getDefaultStoreId();
    if (!storeId) {
      return NextResponse.json({ error: 'Minew store not configured' }, { status: 500 });
    }

    console.log('[Cron ESL] Waking up MIX firmware tags...');
    const mixTags = await getAllTagsForWakeup(storeId);
    
    if (mixTags.length > 0) {
      const wakeResult = await wakeUpTags(storeId, mixTags);
      console.log(`[Cron ESL] Wake-up result:`, wakeResult);
    }

    const managers = await prisma.user.findMany({
      where: { isActive: 1 },
      distinct: ['manager_id'],
      select: { manager_id: true },
    });

    const endTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const startTime = new Date(Date.now() - 3600000).toISOString().slice(0, 19).replace('T', ' ');

    const events = await getButtonEvents(storeId, startTime, endTime);

    let totalProcessed = 0;
    const results = [];

    for (const manager of managers) {
      const processedRequests = [];
      const errors = [];

      for (const event of events) {
        try {
          if (!event.goods?.id) continue;

          const product = await prisma.product.findFirst({
            where: {
              manager_id: manager.manager_id,
              minewGoodsId: event.goods.id,
            } as any,
          });

          if (!product) continue;

          const eventTime = new Date(event.createTime);
          const checkFrom = new Date(eventTime.getTime() - 60000);

          const existingRequest = await prisma.replenishmentRequest.findFirst({
            where: {
              manager_id: manager.manager_id,
              productId: product.id,
              requestMethod: 'EINK_BUTTON',
              deviceInfo: event.labelMac,
              createdAt: { gte: checkFrom },
            },
          });

          if (existingRequest) continue;

          let systemUser = await prisma.user.findFirst({
            where: {
              manager_id: manager.manager_id,
              username: 'system',
            },
          });

          if (!systemUser) {
            systemUser = await prisma.user.create({
              data: {
                manager_id: manager.manager_id,
                username: 'system',
                password: '$pbkdf2-sha256$29000$x9j7v/f+/9/7/3/v/f+/9w$H5c8KxQ1LxQ1LxQ1LxQ1LxQ1LxQ1LxQ1LxQ1LxQ',
                isActive: 1,
              },
            });
          }

          await prisma.replenishmentRequest.create({
            data: {
              manager_id: manager.manager_id,
              productId: product.id,
              requestedById: systemUser.id,
              requestMethod: 'EINK_BUTTON',
              deviceInfo: event.labelMac,
              requestedQty: product.standardOrderQty || null,
              location: product.location,
              notes: `ESL button auto-synced at ${event.createTime}. Gateway: ${event.gatewayMac}`,
              status: 'PENDING',
              priority: 'NORMAL',
              updatedAt: new Date(),
            },
          });

          processedRequests.push({
            productName: product.name,
            labelMac: event.labelMac,
          });
          totalProcessed++;
        } catch (error) {
          errors.push({
            labelMac: event.labelMac,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      if (processedRequests.length > 0) {
        results.push({
          managerId: manager.manager_id,
          processed: processedRequests.length,
          errors: errors.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalEvents: events.length,
      totalProcessed,
      results,
    });
  } catch (error) {
    console.error('Cron ESL button sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync ESL button events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
