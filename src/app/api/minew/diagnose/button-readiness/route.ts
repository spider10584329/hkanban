import { NextRequest, NextResponse } from 'next/server';
import { 
  listGateways, 
  listESLTags, 
  checkBinding,
  getActionLogs,
  minewApiCall 
} from '@/lib/minew';

/**
 * Comprehensive button readiness diagnostic
 * Checks ALL requirements for button events to work
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId is required' },
        { status: 400 }
      );
    }

    // Step 1: Check gateways
    const gateways = await listGateways(storeId);
    const onlineGateways = gateways.filter(g => g.mode === 1);

    // Step 2: Check tags
    const allTags = await listESLTags(storeId, { size: 100 });
    const onlineTags = allTags.items.filter(t => t.isOnline === '2');

    // Step 3: Check bindings for online tags
    const bindingChecks = await Promise.all(
      onlineTags.map(async (tag) => {
        const binding = await checkBinding(storeId, tag.mac);
        return {
          mac: tag.mac,
          isOnline: true,
          isBound: !!binding,
          goodsId: binding?.goodsId || null,
          battery: tag.battery,
          firmwareType: tag.screenInfo?.color || 'unknown'
        };
      })
    );

    // Step 4: Check recent logs with gatewayMac
    const recentLogs = await getActionLogs(storeId, {
      page: 1,
      size: 50
    });

    const logsWithGateway = recentLogs.items.filter(log => log.gatewayMac && log.gatewayMac !== '');
    const buttonLogs = recentLogs.items.filter(log => log.actionType === '6');

    // Step 5: Check if gateway can communicate with tags
    // Query tag details to see if they show gateway info
    const tagDetails = await Promise.all(
      onlineTags.slice(0, 2).map(async (tag) => {
        const response = await minewApiCall<any>('/apis/esl/label/findByMac', {
          params: { mac: tag.mac, storeId }
        });
        return {
          mac: tag.mac,
          gatewayMac: response.data?.gatewayMac || null,
          rssi: response.data?.rssi || null,
          lastGatewayContact: response.data?.lastGatewayContact || null
        };
      })
    );

    // Analysis
    const issues: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    // Gateway checks
    if (gateways.length === 0) {
      issues.push('❌ No gateways found in store');
    } else if (onlineGateways.length === 0) {
      issues.push('❌ No online gateways (all offline)');
    } else {
      passed.push(`✅ ${onlineGateways.length} gateway(s) online`);
    }

    // Tag checks
    if (onlineTags.length === 0) {
      issues.push('❌ No online tags');
    } else {
      passed.push(`✅ ${onlineTags.length} tag(s) online`);
    }

    // Binding checks
    const boundTags = bindingChecks.filter(t => t.isBound);
    if (boundTags.length === 0) {
      issues.push('❌ No tags are bound to products');
    } else {
      passed.push(`✅ ${boundTags.length} tag(s) bound to products`);
    }

    // Gateway communication check
    if (logsWithGateway.length === 0) {
      issues.push('❌ CRITICAL: No logs show gatewayMac (no gateway communication)');
      issues.push('   → All commands are from cloud console, not from gateway');
      issues.push('   → Button events REQUIRE gateway communication');
    } else {
      passed.push(`✅ Found ${logsWithGateway.length} logs with gateway communication`);
    }

    // Button event check
    if (buttonLogs.length === 0) {
      warnings.push('⚠️  No button events (actionType: 6) in recent logs');
    } else {
      passed.push(`✅ Found ${buttonLogs.length} button event(s) in logs`);
    }

    // Tag-Gateway link check
    const tagsWithGatewayLink = tagDetails.filter(t => t.gatewayMac);
    if (tagsWithGatewayLink.length === 0) {
      issues.push('❌ Tags do not show gatewayMac in their details');
      issues.push('   → Tags may not be in range of gateway');
      issues.push('   → Gateway may not be properly configured');
    }

    return NextResponse.json({
      success: true,
      storeId,
      diagnosis: {
        gateways: {
          total: gateways.length,
          online: onlineGateways.length,
          list: onlineGateways.map(g => ({
            mac: g.mac,
            name: g.name,
            ip: g.ip,
            mode: g.mode
          }))
        },
        tags: {
          total: allTags.total,
          online: onlineTags.length,
          bound: boundTags.length,
          details: bindingChecks
        },
        communication: {
          totalLogs: recentLogs.totalNum,
          logsWithGateway: logsWithGateway.length,
          buttonEvents: buttonLogs.length,
          tagGatewayLinks: tagDetails
        }
      },
      analysis: {
        passed,
        warnings,
        issues,
        isReady: issues.length === 0,
        criticalIssues: issues.filter(i => i.includes('CRITICAL')).length
      },
      recommendations: [
        '🔍 Button Event Requirements:',
        '',
        '1. ✅ Gateway ONLINE (check: gateway status)',
        '2. ✅ Tag ONLINE (check: tag within gateway range)',
        '3. ✅ Tag BOUND to product (check: binding exists)',
        '4. ❌ Gateway-Tag COMMUNICATION (check: gatewayMac in logs)',
        '5. ⚠️  Button PRESSED correctly (2-3 seconds)',
        '6. ⚠️  Button ENABLED in hardware/firmware',
        '',
        '🔴 Main Issue:',
        issues.length > 0 ? issues : ['None - all checks passed!'],
        '',
        '💡 Next Steps:',
        issues.length === 0 
          ? ['System ready! Press button and wait 10 seconds']
          : [
              '1. Check gateway network connection (can it reach Minew Cloud?)',
              '2. Verify tag is within gateway Bluetooth range (<10m)',
              '3. Check gateway logs for communication errors',
              '4. Restart gateway if needed',
              '5. Contact Minew support if issue persists'
            ]
      ]
    });
  } catch (error) {
    console.error('[Button Readiness Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
