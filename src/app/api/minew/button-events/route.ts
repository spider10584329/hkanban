import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getButtonEvents, wakeUpTags, getAllTagsForWakeup } from '@/lib/minew';
import { getDefaultStoreId } from '@/lib/minewTokenManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { manager_id, start_time, end_time, wake_tags } = body;

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const storeId = await getDefaultStoreId();
    if (!storeId) {
      return NextResponse.json(
        { error: 'Minew store not configured' },
        { status: 500 }
      );
    }

    if (wake_tags) {
      console.log('[Button Events] Waking up MIX firmware tags...');
      const mixTags = await getAllTagsForWakeup(storeId);
      
      if (mixTags.length > 0) {
        const wakeResult = await wakeUpTags(storeId, mixTags);
        console.log(`[Button Events] Wake-up result:`, wakeResult);
        
        if (wakeResult.code === 54041) {
          console.log('[Button Events] BLE firmware tags - wake-up not needed');
        } else if (!wakeResult.success) {
          console.warn('[Button Events] Wake-up failed:', wakeResult.error);
        } else {
          console.log(`[Button Events] Successfully woke up ${mixTags.length} MIX tags`);
        }
      } else {
        console.log('[Button Events] No MIX firmware tags to wake up');
      }
    }

    const events = await getButtonEvents(storeId, start_time, end_time);

    const processedRequests = [];
    const errors = [];

    for (const event of events) {
      try {
        if (!event.goods?.id) {
          errors.push({
            labelMac: event.labelMac,
            error: 'No product bound to label',
            time: event.createTime,
          });
          continue;
        }

        const product = await prisma.product.findFirst({
          where: {
            manager_id: parseInt(manager_id),
            minewGoodsId: event.goods.id,
          } as any,
        });

        if (!product) {
          errors.push({
            labelMac: event.labelMac,
            goodsId: event.goods.id,
            goodsName: event.goods.name,
            error: 'Product not synced to local database',
            time: event.createTime,
          });
          continue;
        }

        const eventTime = new Date(event.createTime);
        const checkFrom = new Date(eventTime.getTime() - 60000);

        const existingRequest = await prisma.replenishmentRequest.findFirst({
          where: {
            manager_id: parseInt(manager_id),
            productId: product.id,
            requestMethod: 'EINK_BUTTON',
            deviceInfo: event.labelMac,
            createdAt: {
              gte: checkFrom,
            },
          },
        });

        if (existingRequest) {
          continue;
        }

        let systemUser = await prisma.user.findFirst({
          where: {
            manager_id: parseInt(manager_id),
            username: 'system',
          },
        });

        if (!systemUser) {
          systemUser = await prisma.user.create({
            data: {
              manager_id: parseInt(manager_id),
              username: 'system',
              password: '$pbkdf2-sha256$29000$x9j7v/f+/9/7/3/v/f+/9w$H5c8KxQ1LxQ1LxQ1LxQ1LxQ1LxQ1LxQ1LxQ1LxQ',
              isActive: 1,
            },
          });
        }

        const replenishmentRequest = await prisma.replenishmentRequest.create({
          data: {
            manager_id: parseInt(manager_id),
            productId: product.id,
            requestedById: systemUser.id,
            requestMethod: 'EINK_BUTTON',
            deviceInfo: event.labelMac,
            requestedQty: product.standardOrderQty || null,
            location: product.location,
            notes: `ESL button pressed at ${event.createTime}. Gateway: ${event.gatewayMac}`,
            status: 'PENDING',
            priority: 'NORMAL',
            updatedAt: new Date(),
          },
        });

        processedRequests.push({
          requestId: replenishmentRequest.id,
          productName: product.name,
          labelMac: event.labelMac,
          createTime: event.createTime,
        });
      } catch (error) {
        errors.push({
          labelMac: event.labelMac,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalEvents: events.length,
      processedRequests: processedRequests.length,
      processed: processedRequests,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error processing button events:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process button events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
