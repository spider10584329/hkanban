import { NextRequest, NextResponse } from 'next/server';
import { listGateways } from '@/lib/minew';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId is required' },
        { status: 400 }
      );
    }

    console.log('\n===========================================');
    console.log('GATEWAY STATUS CHECK');
    console.log('===========================================');
    console.log('StoreId:', storeId);

    const gateways = await listGateways(storeId);

    console.log('Found', gateways.length, 'gateways');
    console.log('Gateway details:', JSON.stringify(gateways, null, 2));

    const analysis = {
      storeId,
      gatewayCount: gateways.length,
      gateways: gateways.map(gw => ({
        id: gw.id,
        mac: gw.mac,
        name: gw.name,
        mode: gw.mode,
        status: gw.mode === 1 ? '🟢 ONLINE' : '🔴 OFFLINE',
        version: gw.version,
        model: gw.model,
        ip: gw.ip,
      })),
      summary: {
        total: gateways.length,
        online: gateways.filter(g => g.mode === 1).length,
        offline: gateways.filter(g => g.mode !== 1).length,
      },
    };

    const recommendations: string[] = [];

    if (gateways.length === 0) {
      recommendations.push('❌ NO GATEWAYS found in this store!');
      recommendations.push('');
      recommendations.push('   ESL tags REQUIRE a gateway to:');
      recommendations.push('   - Send button press events');
      recommendations.push('   - Communicate with Minew Cloud');
      recommendations.push('   - Receive commands from cloud');
      recommendations.push('');
      recommendations.push('   🔧 Solution:');
      recommendations.push('   1. Add a gateway to this store');
      recommendations.push('   2. Power on the gateway');
      recommendations.push('   3. Connect gateway to network');
      recommendations.push('   4. Wait for gateway to come online');
    } else {
      const onlineGateways = gateways.filter(g => g.mode === 1);
      const offlineGateways = gateways.filter(g => g.mode !== 1);

      if (onlineGateways.length === 0) {
        recommendations.push('❌ ALL GATEWAYS ARE OFFLINE!');
        recommendations.push('');
        recommendations.push(`   Found ${gateways.length} gateway(s), but none are online.`);
        recommendations.push('');
        recommendations.push('   Gateway Details:');
        offlineGateways.forEach(gw => {
          recommendations.push(`   - ${gw.name} (${gw.mac}): OFFLINE`);
        });
        recommendations.push('');
        recommendations.push('   🔧 Troubleshooting:');
        recommendations.push('   1. Check if gateway is powered on (LED lights)');
        recommendations.push('   2. Check network connection (WiFi/Ethernet)');
        recommendations.push('   3. Check if gateway can reach internet');
        recommendations.push('   4. Try rebooting the gateway');
        recommendations.push('   5. Check firewall settings (allow cloud.minewesl.com)');
        recommendations.push('');
        recommendations.push('   ⚠️  THIS IS WHY BUTTON EVENTS ARE NOT RECORDED!');
        recommendations.push('   Without an online gateway, tags cannot send button events.');
      } else {
        recommendations.push(`✅ Found ${onlineGateways.length} ONLINE gateway(s)`);
        recommendations.push('');
        onlineGateways.forEach(gw => {
          recommendations.push(`   - ${gw.name} (${gw.mac})`);
          if (gw.ip) recommendations.push(`     IP: ${gw.ip}`);
          if (gw.version) recommendations.push(`     Version: ${gw.version}`);
        });

        if (offlineGateways.length > 0) {
          recommendations.push('');
          recommendations.push(`⚠️  ${offlineGateways.length} gateway(s) offline:`);
          offlineGateways.forEach(gw => {
            recommendations.push(`   - ${gw.name} (${gw.mac}): OFFLINE`);
          });
        }

        recommendations.push('');
        recommendations.push('🔍 Next steps to test button events:');
        recommendations.push('   1. Ensure ESL tags are within 30m of online gateway');
        recommendations.push('   2. Wake up MIX firmware tags first');
        recommendations.push('   3. Press button firmly for 2-3 seconds');
        recommendations.push('   4. Wait 10 seconds');
        recommendations.push('   5. Check logs - should now show gatewayMac field populated');
        recommendations.push('');
        recommendations.push('   💡 If gatewayMac still empty in logs:');
        recommendations.push('   → Tags may be out of range');
        recommendations.push('   → Gateway may have connectivity issues');
        recommendations.push('   → Check gateway logs in Minew Cloud console');
      }
    }

    console.log('===========================================\n');

    return NextResponse.json({
      success: true,
      ...analysis,
      recommendations,
    });
  } catch (error) {
    console.error('[GATEWAY STATUS ERROR]', error);
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
