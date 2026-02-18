import { NextRequest, NextResponse } from 'next/server';
import { minewApiCall } from '@/lib/minew';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const actionType = searchParams.get('actionType') || '';
    const hoursAgo = parseInt(searchParams.get('hours') || '24');

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId is required' },
        { status: 400 }
      );
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    console.log('\n===========================================');
    console.log('RAW MINEW API TEST');
    console.log('===========================================');
    console.log('StoreId:', storeId);
    console.log('ActionType:', actionType || '(all)');
    console.log('Time Range:', startTime, 'to', endTime);
    console.log('Hours:', hoursAgo);

    const body: Record<string, string | number> = {
      storeId,
      objectType: '1',
      currentPage: 1,
      pageSize: 50,
    };

    if (actionType) {
      body.actionType = actionType;
    }

    console.log('\nRequest Body:', JSON.stringify(body, null, 2));

    const response = await minewApiCall<{
      items?: Array<{
        id: string;
        labelMac: string;
        actionType: string;
        createTime: string;
        goods?: {
          id: string;
          name?: string;
          price?: string;
        };
        gatewayMac?: string;
      }>;
      totalNum?: number;
      currentPage?: number;
      pageSize?: number;
    }>('/apis/esl/logs/queryList', {
      method: 'POST',
      body,
    });

    console.log('\n===========================================');
    console.log('RAW API RESPONSE');
    console.log('===========================================');
    console.log('Response Code:', response.code);
    console.log('Response Msg:', response.msg);
    console.log('Full Response:', JSON.stringify(response, null, 2));
    console.log('===========================================\n');

    // Check if items are at root level (actual API response structure)
    const apiResponse = response as any;
    const items = apiResponse.items || (response.data as any)?.items || [];
    const totalNum = apiResponse.totalNum || (response.data as any)?.totalNum || 0;

    const analysis = {
      request: {
        endpoint: '/apis/esl/logs/queryList',
        method: 'POST',
        storeId,
        actionType: actionType || '(all)',
        timeRange: {
          start: startTime,
          end: endTime,
          hours: hoursAgo,
        },
        body,
      },
      response: {
        code: response.code,
        msg: response.msg,
        fullResponse: response,
      },
      analysis: {
        hasData: !!response.data || !!apiResponse.items,
        hasItems: items.length > 0,
        itemsCount: items.length,
        totalNum: totalNum,
        isSuccess: response.code === 200,
      },
    };

    let sampleItems: any[] = [];
    let actionTypeCounts: Record<string, number> = {};
    let actionTypeBreakdown: any[] = [];
    
    if (response.code === 200 && items.length > 0) {
      const actionTypeNames: Record<string, string> = {
        '1': 'Screen refresh',
        '2': 'Firmware upgrade',
        '3': 'Tag added',
        '4': 'Tag deleted',
        '5': 'Binding',
        '6': 'BUTTON CLICK',
        '7': 'Warning light',
      };
      
      // Count action types
      items.forEach((item: any) => {
        const type = item.actionType;
        actionTypeCounts[type] = (actionTypeCounts[type] || 0) + 1;
      });
      
      actionTypeBreakdown = Object.entries(actionTypeCounts).map(([type, count]) => ({
        actionType: type,
        actionTypeName: actionTypeNames[type] || 'Unknown',
        count,
      }));
      
      sampleItems = items.slice(0, 5).map((item: any) => ({
        id: item.id,
        labelMac: item.labelMac,
        actionType: item.actionType,
        actionTypeName: actionTypeNames[item.actionType] || 'Unknown',
        createTime: item.createTime,
        hasGoods: !!item.goods,
        goodsId: item.goods?.id,
        goodsName: item.goods?.name,
        gatewayMac: item.gatewayMac,
      }));
    }

    return NextResponse.json({
      success: true,
      ...analysis,
      actionTypeCounts,
      actionTypeBreakdown,
      sampleItems,
      recommendation: generateRecommendation(analysis, actionTypeCounts),
    });
  } catch (error) {
    console.error('[RAW API ERROR]', error);
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

function generateRecommendation(analysis: any, actionTypeCounts: Record<string, number>): string[] {
  const recs: string[] = [];

  if (!analysis.analysis.isSuccess) {
    recs.push(`❌ API returned error code: ${analysis.response.code}`);
    recs.push(`   Message: ${analysis.response.msg}`);
    return recs;
  }

  if (analysis.analysis.totalNum === 0) {
    recs.push('❌ NO LOGS AT ALL in the system');
    recs.push('   → Check if gateway is powered on and online');
    recs.push('   → Check if tags are within gateway range (30m)');
    recs.push('   → Verify store ID is correct');
    return recs;
  }

  recs.push(`✅ Found ${analysis.analysis.totalNum} total logs`);
  recs.push(`   Retrieved ${analysis.analysis.itemsCount} items in this page`);
  recs.push('');
  recs.push('📊 Action Type Distribution:');
  
  const actionTypeNames: Record<string, string> = {
    '1': 'Screen refresh',
    '2': 'Firmware upgrade',
    '3': 'Tag added',
    '4': 'Tag deleted',
    '5': 'Binding',
    '6': 'BUTTON CLICK ⭐',
    '7': 'Warning light',
  };
  
  Object.entries(actionTypeCounts).forEach(([type, count]) => {
    const name = actionTypeNames[type] || 'Unknown';
    recs.push(`   - Type ${type} (${name}): ${count}`);
  });

  if (analysis.request.actionType === '6' && analysis.analysis.itemsCount === 0) {
    recs.push('');
    recs.push('⚠️  NO BUTTON CLICK EVENTS (actionType=6)');
    recs.push('');
    recs.push('   🔍 Diagnosis:');
    recs.push('   The system HAS logs (communication is working),');
    recs.push('   but NO button events have been recorded.');
    recs.push('');
    recs.push('   Possible reasons:');
    recs.push('   1. Button was never pressed on any ESL tag');
    recs.push('   2. MIX firmware tags need wake-up before button press');
    recs.push('   3. Button functionality not enabled on tags');
    recs.push('   4. Tags are in sleep mode (wake-up timeout ~10 min)');
    recs.push('');
    recs.push('   🔧 Next steps:');
    recs.push('   → Call wake-up API: GET /api/minew/button-events?wake_tags=true');
    recs.push('   → Wait 5 seconds');
    recs.push('   → Press button FIRMLY for 2-3 seconds');
    recs.push('   → Wait 10 seconds');
    recs.push('   → Check logs again');
    recs.push('');
    recs.push('   💡 Or check Minew Cloud console directly:');
    recs.push('   → Login: https://cloud.minewesl.com');
    recs.push('   → Go to "操作日志" (Operation Log)');
    recs.push('   → Filter by actionType = 6');
  } else if (!actionTypeCounts['6']) {
    recs.push('');
    recs.push('⚠️  No button events found in recent logs');
    recs.push('   The tags are communicating (refresh & warning logs exist)');
    recs.push('   but buttons may not be pressed or enabled.');
  }

  return recs;
}
