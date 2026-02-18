import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { minewApiCall, getDefaultStoreId } from '@/lib/minew';

/**
 * POST /api/esl/button-event
 *
 * Webhook endpoint that receives ESL button press events from Minew Cloud.
 *
 * Register this URL in Minew Cloud:
 *   System settings → Param setting → Receiving address
 *   Input: https://yourdomain.com/api/esl/button-event
 *
 * Payload from Minew Cloud:
 * {
 *   "mac": "e10000031c76",
 *   "buttonId": "1",
 *   "buttonEvent": "01" | "02",   // "01" = short press, "02" = long press
 *   "buttonTime": "2026-02-18 10:30:00",
 *   "opcode": "12345678"
 * }
 */
export async function POST(request: NextRequest) {
  console.log('=================================================');
  console.log('[ESL Webhook] Incoming button event request');
  console.log('=================================================');

  try {
    // Parse the incoming webhook payload
    let body: any;
    try {
      body = await request.json();
    } catch {
      console.error('[ESL Webhook] Failed to parse request body');
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    console.log('[ESL Webhook] Payload received:', JSON.stringify(body, null, 2));

    const { mac, buttonId, buttonEvent, buttonTime, opcode } = body;

    // Validate required fields — return 200 always to prevent Minew retry loops
    if (!mac) {
      console.error('[ESL Webhook] Missing required field: mac');
      return NextResponse.json({ status: 'error', message: 'Missing required field: mac' });
    }

    const tagMac = mac.toLowerCase().replace(/[:-]/g, '');
    const isLongPress = buttonEvent === '02';
    const pressType = isLongPress ? 'LONG PRESS (urgent)' : 'SHORT PRESS (normal)';

    console.log(`[ESL Webhook] Tag MAC     : ${tagMac}`);
    console.log(`[ESL Webhook] Button ID   : ${buttonId || 'N/A'}`);
    console.log(`[ESL Webhook] Press Type  : ${pressType}`);
    console.log(`[ESL Webhook] Button Time : ${buttonTime || new Date().toISOString()}`);
    console.log(`[ESL Webhook] OpCode      : ${opcode || 'N/A'}`);

    // Step 1: Find the product bound to this ESL tag in local database
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { einkDeviceId: tagMac },
          { einkDeviceId: mac },
          { minewBoundLabel: tagMac },
          { minewBoundLabel: mac },
        ],
      },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    if (!product) {
      // Try to find product via Minew Cloud API
      console.log(`[ESL Webhook] Product not found locally for tag ${tagMac}, querying Minew Cloud...`);

      const storeId = await getDefaultStoreId();
      let goodsId: string | null = null;

      if (storeId) {
        try {
          const tagResponse = await minewApiCall<any>('/apis/esl/label/findByMac', {
            params: { mac: tagMac, storeId },
          });
          if (tagResponse.code === 200 && tagResponse.data?.goodsId) {
            goodsId = tagResponse.data.goodsId;
            console.log(`[ESL Webhook] Found goodsId from Minew Cloud: ${goodsId}`);
          }
        } catch (err) {
          console.warn('[ESL Webhook] Failed to query Minew Cloud for tag info:', err);
        }
      }

      if (!goodsId) {
        console.warn(`[ESL Webhook] No product bound to tag ${tagMac} - skipping request creation`);
        // Return 200 to prevent Minew from retrying
        return NextResponse.json({
          status: 'skipped',
          message: `No product bound to ESL tag ${tagMac}`,
          mac: tagMac,
        });
      }

      // Product not in local DB - log and skip
      console.warn(`[ESL Webhook] Tag has goodsId ${goodsId} in Minew but no matching local product`);
      return NextResponse.json({
        status: 'skipped',
        message: `Tag goodsId ${goodsId} not found in local database`,
        mac: tagMac,
        goodsId,
      });
    }

    console.log(`[ESL Webhook] Product found: [${product.id}] ${product.name} (${product.sku || 'no SKU'})`);
    console.log(`[ESL Webhook] Location: ${product.location}`);

    // Step 2: Determine priority and quantity based on button press type
    // Short press (01) = normal priority, standard order qty or 10
    // Long press (02)  = urgent priority, 2x standard order qty or 50
    const priority = isLongPress ? 'URGENT' : 'NORMAL';
    const requestedQty = isLongPress
      ? (product.standardOrderQty ? product.standardOrderQty * 2 : 50)
      : (product.standardOrderQty || 10);

    // Step 3: Check for duplicate requests (same product + same tag within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingRequest = await prisma.replenishmentRequest.findFirst({
      where: {
        manager_id: product.manager_id,
        productId: product.id,
        requestMethod: 'EINK_BUTTON',
        deviceInfo: tagMac,
        createdAt: { gte: fiveMinutesAgo },
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      console.log(`[ESL Webhook] Duplicate request detected - request ${existingRequest.id} already exists within 5 minutes`);
      return NextResponse.json({
        status: 'duplicate',
        message: 'Request already created within the last 5 minutes',
        existingRequestId: existingRequest.id,
        mac: tagMac,
      });
    }

    // Step 4: Find or create system user for ESL webhook requests
    // Use the manager's first available user as the requester
    let requestedById: number;
    const systemUser = await prisma.user.findFirst({
      where: { manager_id: product.manager_id },
      orderBy: { id: 'asc' },
    });

    if (!systemUser) {
      console.error(`[ESL Webhook] No user found for manager_id ${product.manager_id}`);
      // Return 200 to prevent Minew from retrying
      return NextResponse.json({ status: 'error', message: 'No user found for this manager' });
    }
    requestedById = systemUser.id;

    // Step 5: Create the replenishment request in the local database
    const newRequest = await prisma.replenishmentRequest.create({
      data: {
        manager_id: product.manager_id,
        productId: product.id,
        requestedById,
        requestMethod: 'EINK_BUTTON',
        deviceInfo: tagMac,
        requestedQty,
        location: product.location,
        notes: `ESL button pressed (${isLongPress ? 'long press - urgent' : 'short press - normal'}). Tag MAC: ${tagMac}. Button time: ${buttonTime || 'N/A'}`,
        status: 'PENDING',
        priority,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: { name: true, sku: true, location: true },
        },
      },
    });

    

    return NextResponse.json({
      status: 'success',
      message: 'Replenishment request created successfully',
      data: {
        requestId: newRequest.id,
        productId: product.id,
        productName: newRequest.product.name,
        quantity: requestedQty,
        priority,
        pressType: isLongPress ? 'long' : 'short',
        location: product.location,
        tagMac,
      },
    });
  } catch (error) {
    console.error('[ESL Webhook] Error processing button event:', error);
    console.log('=================================================');

    // Return 200 to prevent Minew from endlessly retrying on server errors
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 200 }
    );
  }
}

/**
 * GET /api/esl/button-event
 * Health check endpoint - confirms the webhook is active
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/esl/button-event',
    description: 'ESL button event webhook endpoint for Minew Cloud',
    usage: 'Register this URL in Minew Cloud: System settings → Param setting → Receiving address',
    timestamp: new Date().toISOString(),
  });
}
