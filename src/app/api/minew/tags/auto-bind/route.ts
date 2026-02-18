import { NextRequest, NextResponse } from 'next/server';
import { bindESLTagAutomatic, listESLTags } from '@/lib/minew';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId is required' },
        { status: 400 }
      );
    }

    console.log('\n===========================================');
    console.log('AUTO-BIND UNBOUND TAGS');
    console.log('===========================================');

    // Get all unbound tags
    const allTags = await listESLTags(storeId, { size: 100 });
    const unboundTags = allTags.items.filter(tag => tag.bind === '0');

    if (unboundTags.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unbound tags found. All tags are already bound!',
        tagsBound: 0,
      });
    }

    console.log(`Found ${unboundTags.length} unbound tags`);

    // Get products from database that have Minew sync enabled
    const products = await prisma.product.findMany({
      where: {
        einkDeviceId: { not: null },
        sku: { not: null },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        einkDeviceId: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No products found with Minew sync. Please sync products first.',
        unboundTags: unboundTags.map(t => t.mac),
      });
    }

    console.log(`Found ${products.length} products in database`);

    // Try to bind each unbound tag to a product
    const bindings: { labelMac: string; goodsId: string; productName: string }[] = [];

    for (const tag of unboundTags) {
      // Try to find a product that doesn't already have this tag bound
      const availableProduct = products.find(p => 
        p.sku && !bindings.some(b => b.goodsId === p.sku)
      );

      if (availableProduct && availableProduct.sku) {
        bindings.push({
          labelMac: tag.mac,
          goodsId: availableProduct.sku,
          productName: availableProduct.name,
        });
        
        console.log(`Planning to bind ${tag.mac} to ${availableProduct.sku} (${availableProduct.name})`);
      } else {
        console.log(`No available product for tag ${tag.mac}`);
      }
    }

    if (bindings.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Not enough products to bind all tags',
        unboundTags: unboundTags.map(t => t.mac),
        productsAvailable: products.length,
      });
    }

    // Perform the binding
    console.log(`\nBinding ${bindings.length} tags...`);
    
    const bindResult = await bindESLTagAutomatic(
      storeId,
      bindings.map(b => ({ labelMac: b.labelMac, goodsId: b.goodsId }))
    );

    if (!bindResult.success) {
      return NextResponse.json({
        success: false,
        error: bindResult.error,
      }, { status: 500 });
    }

    console.log('Binding successful!');
    console.log('===========================================\n');

    return NextResponse.json({
      success: true,
      message: `Successfully bound ${bindings.length} tag(s)`,
      tagsBound: bindings.length,
      bindings: bindings.map(b => ({
        tagMac: b.labelMac,
        productId: b.goodsId,
        productName: b.productName,
      })),
      nextSteps: [
        '✅ Tags are now bound to products',
        '🔔 Button press events will now be recorded',
        '',
        '📋 Next steps:',
        '1. Press button on ESL tag firmly for 2-3 seconds',
        '2. Wait 10 seconds',
        '3. Check logs: /api/minew/logs/raw?storeId=' + storeId,
        '4. gatewayMac should now be populated in logs!',
      ],
    });
  } catch (error) {
    console.error('[AUTO-BIND ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
