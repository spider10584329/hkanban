import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  wakeupESLTags,
  refreshESLTags,
  deleteESLTags,
  locateESLTag,
  batchBindESLTags,
  unbindESLTag,
} from '@/lib/minew';

/**
 * POST - Batch operations on ESL tags
 * Supports: wakeup, refresh, delete, locate, bind, unbind
 */
export async function POST(request: NextRequest) {
  try {
    const { manager_id, storeId, operation, macAddresses, bindingData } = await request.json();

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    if (!operation) {
      return NextResponse.json(
        { error: 'operation is required (wakeup, refresh, delete, locate, bind, unbind)' },
        { status: 400 }
      );
    }

    if (!macAddresses || !Array.isArray(macAddresses) || macAddresses.length === 0) {
      return NextResponse.json(
        { error: 'macAddresses array is required and must not be empty' },
        { status: 400 }
      );
    }

    const results: Record<string, { success: boolean; error?: string }> = {};

    switch (operation) {
      case 'wakeup': {
        // Wake up devices to receive updates
        const success = await wakeupESLTags(storeId, macAddresses);
        if (success) {
          macAddresses.forEach(mac => {
            results[mac] = { success: true };
          });
        } else {
          macAddresses.forEach(mac => {
            results[mac] = { success: false, error: 'Wakeup failed' };
          });
        }
        break;
      }

      case 'refresh': {
        // Refresh displays on devices
        const success = await refreshESLTags(storeId, macAddresses);
        if (success) {
          macAddresses.forEach(mac => {
            results[mac] = { success: true };
          });
        } else {
          macAddresses.forEach(mac => {
            results[mac] = { success: false, error: 'Refresh failed' };
          });
        }
        break;
      }

      case 'locate': {
        // Flash RGB light on each device (one at a time)
        for (const mac of macAddresses) {
          try {
            const success = await locateESLTag(storeId, mac);
            results[mac] = { success };
            if (!success) {
              results[mac].error = 'Locate failed';
            }
          } catch (error) {
            results[mac] = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }
        break;
      }

      case 'delete': {
        // Delete devices from Minew cloud and local database
        const minewSuccess = await deleteESLTags(storeId, macAddresses);

        if (minewSuccess) {
          // Also delete from local database
          for (const mac of macAddresses) {
            try {
              await prisma.deviceStatus.deleteMany({
                where: {
                  manager_id: parseInt(manager_id),
                  deviceId: mac.toLowerCase(),
                },
              });
              results[mac] = { success: true };
            } catch (error) {
              results[mac] = {
                success: false,
                error: 'Deleted from Minew but failed to delete from local database',
              };
            }
          }
        } else {
          macAddresses.forEach(mac => {
            results[mac] = { success: false, error: 'Delete failed' };
          });
        }
        break;
      }

      case 'bind': {
        // Bind devices to products
        if (!bindingData || !Array.isArray(bindingData)) {
          return NextResponse.json(
            { error: 'bindingData array is required for bind operation' },
            { status: 400 }
          );
        }

        const bindResult = await batchBindESLTags(storeId, bindingData);
        if (bindResult.success) {
          // Update local database
          for (const binding of bindingData) {
            try {
              await prisma.deviceStatus.updateMany({
                where: {
                  manager_id: parseInt(manager_id),
                  deviceId: binding.labelMac.toLowerCase(),
                },
                data: {
                  minewBound: 1,
                  minewGoodsId: binding.goodsId,
                  updatedAt: new Date(),
                },
              });
              results[binding.labelMac] = { success: true };
            } catch (error) {
              results[binding.labelMac] = {
                success: false,
                error: 'Bound in Minew but failed to update local database',
              };
            }
          }
        } else {
          bindingData.forEach(binding => {
            results[binding.labelMac] = {
              success: false,
              error: bindResult.error || 'Bind failed',
            };
          });
        }
        break;
      }

      case 'unbind': {
        // Unbind devices from products
        for (const mac of macAddresses) {
          try {
            const success = await unbindESLTag(storeId, mac);
            if (success) {
              // Update local database
              await prisma.deviceStatus.updateMany({
                where: {
                  manager_id: parseInt(manager_id),
                  deviceId: mac.toLowerCase(),
                },
                data: {
                  minewBound: 0,
                  minewGoodsId: null,
                  currentDisplay: null,
                  updatedAt: new Date(),
                },
              });
              results[mac] = { success: true };
            } else {
              results[mac] = { success: false, error: 'Unbind failed' };
            }
          } catch (error) {
            results[mac] = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    const successCount = Object.values(results).filter(r => r.success).length;
    const failCount = Object.values(results).filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Batch ${operation}: ${successCount} succeeded, ${failCount} failed`,
      results,
      stats: {
        total: macAddresses.length,
        succeeded: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json(
      {
        error: 'Batch operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
