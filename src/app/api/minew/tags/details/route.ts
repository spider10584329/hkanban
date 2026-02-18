import { NextRequest, NextResponse } from 'next/server';
import { listESLTags } from '@/lib/minew';

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
    console.log('ESL TAGS DETAILED STATUS');
    console.log('===========================================');
    console.log('StoreId:', storeId);

    const result = await listESLTags(storeId, { size: 100 });

    console.log('Found', result.total, 'tags');

    const tags = result.items.map(tag => ({
      mac: tag.mac,
      screenSize: tag.screenSize,
      isOnline: tag.isOnline,
      onlineStatus: tag.isOnline === '2' ? '🟢 ONLINE' : '🔴 OFFLINE',
      battery: tag.battery,
      batteryStatus: tag.battery >= 50 ? '🔋 Good' : tag.battery >= 20 ? '🔋 Low' : '🔋 Critical',
      bind: tag.bind,
      bindStatus: tag.bind === '1' ? '🔗 Bound' : '⚪ Unbound',
      goodsId: tag.goodsId || 'N/A',
      firmwareType: (tag as any).firmwareType || 'unknown',
      firmwareInfo: (tag as any).firmwareType === '0' ? 'MIX (needs wake-up)' : 'BLE (always active)',
      lastUpdate: tag.updateTime,
    }));

    const analysis = {
      total: result.total,
      online: tags.filter(t => t.isOnline === '2').length,
      offline: tags.filter(t => t.isOnline === '1').length,
      bound: tags.filter(t => t.bind === '1').length,
      unbound: tags.filter(t => t.bind === '0').length,
      mixFirmware: tags.filter(t => t.firmwareType === '0').length,
      bleFirmware: tags.filter(t => t.firmwareType === '1').length,
    };

    const recommendations: string[] = [];

    if (result.total === 0) {
      recommendations.push('❌ NO ESL TAGS found in this store!');
      recommendations.push('   Add tags to the store first.');
    } else {
      recommendations.push(`✅ Found ${result.total} ESL tag(s)`);
      recommendations.push('');
      recommendations.push('📊 Status Summary:');
      recommendations.push(`   - Online: ${analysis.online} tags`);
      recommendations.push(`   - Offline: ${analysis.offline} tags`);
      recommendations.push(`   - Bound: ${analysis.bound} tags`);
      recommendations.push(`   - Unbound: ${analysis.unbound} tags`);
      
      if (analysis.mixFirmware > 0 || analysis.bleFirmware > 0) {
        recommendations.push('');
        recommendations.push('🔧 Firmware Types:');
        if (analysis.mixFirmware > 0) {
          recommendations.push(`   - MIX firmware: ${analysis.mixFirmware} tags (need wake-up)`);
        }
        if (analysis.bleFirmware > 0) {
          recommendations.push(`   - BLE firmware: ${analysis.bleFirmware} tags (always active)`);
        }
      }

      if (analysis.online === 0) {
        recommendations.push('');
        recommendations.push('⚠️  ALL TAGS ARE OFFLINE!');
        recommendations.push('');
        recommendations.push('   Possible reasons:');
        recommendations.push('   1. Tags are out of range from gateway (>30m)');
        recommendations.push('   2. Tags are in sleep mode (battery saving)');
        recommendations.push('   3. Gateway cannot communicate with tags');
        recommendations.push('   4. Tags are powered off or battery depleted');
        recommendations.push('');
        recommendations.push('   🔧 Solution:');
        recommendations.push('   1. Move tags closer to gateway (<10m for testing)');
        recommendations.push('   2. Press button on tag to wake it up');
        recommendations.push('   3. Check tag battery level');
        recommendations.push('   4. Use Minew Cloud console to locate tag (RGB flash)');
      } else if (analysis.offline > 0) {
        recommendations.push('');
        recommendations.push(`⚠️  ${analysis.offline} tag(s) are OFFLINE`);
        recommendations.push('   Move them closer to gateway or check battery.');
      }

      recommendations.push('');
      recommendations.push('🔍 For button press detection:');
      recommendations.push('   ✅ Tag must be ONLINE (within gateway range)');
      recommendations.push('   ✅ Tag must be BOUND to a product');
      recommendations.push('   ✅ MIX firmware tags need wake-up first');
      recommendations.push('   ✅ Press button firmly for 2-3 seconds');
      recommendations.push('   ✅ Wait 10 seconds for event to appear in logs');
      recommendations.push('');
      recommendations.push('   💡 Check if gatewayMac appears in logs after button press!');
    }

    console.log('===========================================\n');

    return NextResponse.json({
      success: true,
      storeId,
      tags,
      analysis,
      recommendations,
    });
  } catch (error) {
    console.error('[TAGS DETAILS ERROR]', error);
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
