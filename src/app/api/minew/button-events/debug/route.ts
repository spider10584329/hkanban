import { NextRequest, NextResponse } from 'next/server';
import { getButtonEvents, getActionLogs, minewApiCall } from '@/lib/minew';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const hoursAgo = parseInt(searchParams.get('hours') || '168');
    const tagMac = searchParams.get('mac');
    const fullDiag = searchParams.get('fullDiag') === 'true';

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId is required' },
        { status: 400 }
      );
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      apiBase: process.env.MINEW_API_BASE || 'https://cloud.minewesl.com',
      storeId,
    };

    if (fullDiag) {
      diagnostics.step1_allLogs = await (async () => {
        try {
          const result = await getActionLogs(storeId, { 
            page: 1, 
            size: 50 
          });
          
          const actionTypeCounts: Record<string, number> = {};
          result.items.forEach(item => {
            const type = item.actionType || 'unknown';
            actionTypeCounts[type] = (actionTypeCounts[type] || 0) + 1;
          });

          return {
            totalLogs: result.totalNum,
            retrievedLogs: result.items.length,
            actionTypeDistribution: actionTypeCounts,
            actionTypeLabels: {
              '1': 'Screen refresh',
              '2': 'Firmware upgrade',
              '3': 'Tag added',
              '4': 'Tag deleted',
              '5': 'Binding',
              '6': 'Button click (RESTOCK REQUEST)',
              '7': 'Warning light',
            },
            recentLogs: result.items.slice(0, 10).map(log => ({
              id: log.id,
              time: log.createTime,
              mac: log.labelMac,
              type: log.actionType,
              hasGoods: !!log.goods,
              goodsId: log.goods?.id,
              goodsName: log.goods?.name,
            })),
          };
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Failed to fetch all logs' };
        }
      })();

      if (tagMac) {
        diagnostics.step2_tagStatus = await (async () => {
          try {
            const response = await minewApiCall<{
              items?: Array<{
                mac: string;
                isOnline: string;
                battery: number;
                bind: string;
                storeId: string;
              }>;
            }>('/apis/esl/label/cascadQuery', {
              params: {
                page: '1',
                size: '10',
                storeId,
                fuzzy: tagMac.slice(-6),
                eqstatus: '1,2,5,8,9',
                type: '1',
              },
            });

            if (response.code === 200 && response.data?.items?.[0]) {
              const tag = response.data.items[0];
              return {
                mac: tag.mac,
                isOnline: tag.isOnline === '2' ? 'ONLINE ✅' : 'OFFLINE ❌',
                battery: `${tag.battery}%`,
                isBound: tag.bind === '1' ? 'BOUND ✅' : 'UNBOUND ❌',
                status: tag.isOnline === '2' && tag.bind === '1' ? 'READY' : 'NOT_READY',
              };
            }
            return { error: 'Tag not found' };
          } catch (err) {
            return { error: err instanceof Error ? err.message : 'Failed to check tag status' };
          }
        })();
      }
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    console.log('[DEBUG] Fetching button events:');
    console.log('  storeId:', storeId);
    console.log('  startTime:', startTime);
    console.log('  endTime:', endTime);
    console.log('  hours:', hoursAgo);

    const events = await getButtonEvents(storeId, startTime, endTime);

    console.log('[DEBUG] Found events:', events.length);
    console.log('[DEBUG] Events:', JSON.stringify(events, null, 2));

    diagnostics.step3_buttonEvents = {
      queryParams: { storeId, startTime, endTime, hoursAgo },
      totalEvents: events.length,
      eventsWithProducts: events.filter(e => e.goods?.id).length,
    };

    return NextResponse.json({
      success: true,
      diagnostics,
      events: events.map(e => ({
        id: e.id,
        time: e.createTime,
        mac: e.labelMac,
        actionType: e.actionType,
        product: e.goods ? {
          id: e.goods.id,
          name: e.goods.name,
          price: e.goods.price,
        } : null,
      })),
      recommendations: generateRecommendations(diagnostics, events),
    });
  } catch (error) {
    console.error('[DEBUG] Error in diagnostics:', error);
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

function generateRecommendations(diag: any, events: any[]): string[] {
  const recs: string[] = [];

  if (diag.step1_allLogs) {
    const { totalLogs, actionTypeDistribution } = diag.step1_allLogs;
    
    if (totalLogs === 0) {
      recs.push('❌ NO LOGS AT ALL - Check gateway power and network connection');
      recs.push('❌ Verify tags are within gateway range (typically 30m)');
    } else if (!actionTypeDistribution['6']) {
      recs.push('⚠️  Logs exist but NO button click events (actionType=6)');
      recs.push('→ Press the button on the ESL tag again');
      recs.push('→ Verify tag is online and bound to a product');
    } else {
      recs.push(`✅ Found ${actionTypeDistribution['6']} button click events in system`);
    }
  }

  if (diag.step2_tagStatus) {
    const { status, isOnline, battery, isBound } = diag.step2_tagStatus;
    
    if (status !== 'READY') {
      if (isOnline?.includes('OFFLINE')) {
        recs.push('❌ TAG IS OFFLINE - Check gateway or reduce distance');
      }
      if (isBound?.includes('UNBOUND')) {
        recs.push('❌ TAG IS NOT BOUND - Bind tag to a product first');
      }
      if (battery && parseInt(battery) < 10) {
        recs.push('⚠️  LOW BATTERY - Replace tag battery');
      }
    } else {
      recs.push('✅ Tag hardware status is READY');
    }
  }

  if (events.length === 0 && diag.step1_allLogs?.actionTypeDistribution?.['6']) {
    recs.push('⚠️  Button events exist but filtered out - Check time range or product matching');
  }

  return recs;
}
