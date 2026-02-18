/**
 * Minew Token Manager
 * 
 * Centralized token management system that:
 * 1. Stores tokens in database for persistence across server restarts
 * 2. Implements automatic token refresh
 * 3. Prevents concurrent login requests
 * 4. Provides retry logic for failed requests
 */

import { prisma } from './prisma';
import crypto from 'crypto';

const MINEW_API_BASE = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
const MINEW_USERNAME = process.env.MINEW_USERNAME || '';
const MINEW_PASSWORD = process.env.MINEW_PASSWORD || '';

// In-memory lock to prevent concurrent token refresh
let tokenRefreshLock = false;

/**
 * Hash password using MD5
 */
function hashPassword(password: string): string {
  return crypto.createHash('md5').update(password).digest('hex').toLowerCase();
}

/**
 * Invalidate the current token in the database
 * Call this when token is rejected by Minew API
 */
export async function invalidateMinewToken(): Promise<void> {
  try {
    console.log('[MinewToken] Invalidating cached token...');
    await prisma.minewTokenCache.deleteMany({
      where: { username: MINEW_USERNAME },
    });
    console.log('[MinewToken] Token invalidated successfully');
  } catch (error) {
    console.error('[MinewToken] Error invalidating token:', error);
  }
}

/**
 * Get valid Minew token from database or refresh if expired
 */
export async function getMinewToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    // If force refresh, skip cache and get new token
    if (forceRefresh) {
      console.log('[MinewToken] Force refresh requested, getting new token...');
      return await refreshMinewToken();
    }

    // Try to get existing valid token from database
    const tokenRecord = await prisma.minewTokenCache.findFirst({
      where: {
        username: MINEW_USERNAME,
        expiresAt: {
          gt: new Date(), // Token not expired
        },
      },
      orderBy: {
        lastRefreshedAt: 'desc',
      },
    });

    if (tokenRecord) {
      console.log('[MinewToken] Using cached token, expires at:', tokenRecord.expiresAt);
      return tokenRecord.token;
    }

    // No valid token, need to refresh
    return await refreshMinewToken();
  } catch (error) {
    console.error('[MinewToken] Error getting token:', error);
    return null;
  }
}

/**
 * Refresh Minew token (with locking to prevent concurrent requests)
 */
async function refreshMinewToken(): Promise<string | null> {
  // Check if another process is already refreshing
  if (tokenRefreshLock) {
    console.log('[MinewToken] Waiting for concurrent refresh to complete...');
    // Wait and retry getting from database
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getMinewToken();
  }

  try {
    tokenRefreshLock = true;
    console.log('[MinewToken] Refreshing token...');

    const hashedPassword = hashPassword(MINEW_PASSWORD);
    const loginUrl = `${MINEW_API_BASE}/apis/action/login`;

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      body: JSON.stringify({
        username: MINEW_USERNAME,
        password: hashedPassword,
      }),
    });

    const data = await response.json();
    
    let token: string | null = null;
    if (data.token) {
      token = data.token;
    } else if (data.code === 200 && data.data?.token) {
      token = data.data.token;
    }

    if (!token) {
      console.error('[MinewToken] Failed to refresh token:', data.msg || data.message);
      return null;
    }

    // Calculate expiry (23 hours from now)
    const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);

    // Store in database (delete old tokens first)
    await prisma.minewTokenCache.deleteMany({
      where: { username: MINEW_USERNAME },
    });

    await prisma.minewTokenCache.create({
      data: {
        token,
        expiresAt,
        lastRefreshedAt: new Date(),
        username: MINEW_USERNAME,
      },
    });

    console.log('[MinewToken] Token refreshed successfully, expires at:', expiresAt);
    return token;
  } catch (error) {
    console.error('[MinewToken] Error refreshing token:', error);
    return null;
  } finally {
    tokenRefreshLock = false;
  }
}

/**
 * Get or create default Minew store ID
 */
export async function getDefaultStoreId(): Promise<string | null> {
  try {
    // Try to get from config
    const config = await prisma.minewConfig.findUnique({
      where: { configKey: 'default_store_id' },
    });

    if (config && config.configValue) {
      return config.configValue;
    }

    // Need to fetch from Minew API
    const token = await getMinewToken();
    if (!token) {
      console.error('[MinewToken] Cannot get store ID without token');
      return null;
    }

    const storesUrl = `${MINEW_API_BASE}/apis/esl/store/listPage?page=1&size=100&active=1`;
    const response = await fetch(storesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'token': token,
      },
    });

    const data = await response.json();
    console.log('[MinewToken] Store API response:', JSON.stringify(data, null, 2));
    
    // Check response structure: { code: 200, data: { items: [...] } }
    let storeId: string | null = null;
    
    if (data.code === 200) {
      // Check for items under data
      if (data.data?.items && data.data.items.length > 0) {
        storeId = data.data.items[0].id || data.data.items[0].storeId;
        console.log('[MinewToken] Found store in data.items:', storeId);
      }
      // Fallback: check for items at root level
      else if (data.items && data.items.length > 0) {
        storeId = data.items[0].id || data.items[0].storeId;
        console.log('[MinewToken] Found store in root items:', storeId);
      }
    }
    
    if (storeId) {
      // Save to config
      await prisma.minewConfig.upsert({
        where: { configKey: 'default_store_id' },
        update: { configValue: storeId },
        create: {
          configKey: 'default_store_id',
          configValue: storeId,
          description: 'Default Minew store ID for all products',
        },
      });

      console.log('[MinewToken] Saved default store ID:', storeId);
      return storeId;
    }

    console.error('[MinewToken] No stores found in Minew account');
    return null;
  } catch (error) {
    console.error('[MinewToken] Error getting default store ID:', error);
    return null;
  }
}

/**
 * Make API call to Minew with automatic token refresh on 401
 */
export async function minewApiCall<T = any>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    params?: Record<string, string>;
  }
): Promise<{ code: number; msg: string; data?: T }> {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const token = await getMinewToken();
      if (!token) {
        return {
          code: 500,
          msg: 'Failed to get Minew token',
        };
      }

      const url = new URL(`${MINEW_API_BASE}${endpoint}`);
      if (options?.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const response = await fetch(url.toString(), {
        method: options?.method || 'GET',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'token': token,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await response.json();

      // If token invalid (14002), refresh and retry
      if (data.code === 14002 && attempt < maxRetries - 1) {
        console.log('[MinewAPI] Token invalid, refreshing...');
        await refreshMinewToken();
        attempt++;
        continue;
      }

      return data;
    } catch (error) {
      console.error(`[MinewAPI] Error on attempt ${attempt + 1}:`, error);
      attempt++;
      
      if (attempt >= maxRetries) {
        return {
          code: 500,
          msg: error instanceof Error ? error.message : 'Unknown error',
        };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return {
    code: 500,
    msg: 'Max retries exceeded',
  };
}

/**
 * Add item to sync queue for retry logic
 */
export async function addToSyncQueue(
  entityType: 'product' | 'order' | 'device',
  entityId: number,
  operation: 'create' | 'update' | 'delete',
  payload: any
): Promise<void> {
  try {
    await prisma.minewSyncQueue.create({
      data: {
        entityType,
        entityId,
        operation,
        payload: JSON.stringify(payload),
        status: 'pending',
        scheduledAt: new Date(),
      },
    });
    console.log(`[MinewQueue] Added ${entityType} ${entityId} to sync queue`);
  } catch (error) {
    console.error('[MinewQueue] Error adding to queue:', error);
  }
}

/**
 * Process pending items in sync queue
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const results = { processed: 0, succeeded: 0, failed: 0 };

  try {
    // Get pending items
    const pendingItems = await prisma.minewSyncQueue.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          lte: new Date(),
        },
      },
      take: 50, // Process in batches
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    if (pendingItems.length === 0) {
      console.log('[MinewQueue] No pending items to process');
      return results;
    }

    console.log(`[MinewQueue] Processing ${pendingItems.length} pending items...`);

    // Get credentials once for all items
    const token = await getMinewToken();
    const storeId = await getDefaultStoreId();

    if (!token || !storeId) {
      console.error('[MinewQueue] Cannot process queue without valid token/storeId');
      return results;
    }

    const minewApiBase = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';

    for (const item of pendingItems) {
      // Skip items that exceeded max retries
      if (item.retryCount >= item.maxRetries) {
        await prisma.minewSyncQueue.update({
          where: { id: item.id },
          data: { 
            status: 'failed',
            lastError: 'Max retries exceeded',
          },
        });
        results.failed++;
        continue;
      }

      results.processed++;

      try {
        // Mark as processing
        await prisma.minewSyncQueue.update({
          where: { id: item.id },
          data: { status: 'processing' },
        });

        const payload = JSON.parse(item.payload);
        let success = false;
        let errorMessage = '';

        // Process based on entity type and operation
        if (item.entityType === 'product') {
          if (item.operation === 'create') {
            // Add product to Minew
            const response = await fetch(`${minewApiBase}/apis/esl/goods/addToStore`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'token': token,
              },
              body: JSON.stringify({ storeId, ...payload }),
            });
            const result = await response.json();
            success = result.code === 200;
            errorMessage = result.msg || 'Failed to add product';

            // Update product sync status
            if (success) {
              await prisma.$executeRaw`
                UPDATE products 
                SET minewSynced = 1, 
                    minewSyncedAt = ${new Date()}, 
                    minewGoodsId = ${payload.id},
                    minewSyncError = NULL
                WHERE id = ${item.entityId}
              `;
            }
          } else if (item.operation === 'update') {
            // Update product in Minew
            const response = await fetch(`${minewApiBase}/apis/esl/goods/update`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'token': token,
              },
              body: JSON.stringify({ storeId, ...payload }),
            });
            const result = await response.json();
            success = result.code === 200;
            errorMessage = result.msg || 'Failed to update product';

            if (success) {
              await prisma.$executeRaw`
                UPDATE products 
                SET minewSyncedAt = ${new Date()}, 
                    minewSyncError = NULL
                WHERE id = ${item.entityId}
              `;
            }
          } else if (item.operation === 'delete') {
            // Delete product from Minew
            const response = await fetch(`${minewApiBase}/apis/esl/goods/delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'token': token,
              },
              body: JSON.stringify({ 
                storeId, 
                ids: [payload.goodsId || item.entityId.toString()],
              }),
            });
            const result = await response.json();
            success = result.code === 200;
            errorMessage = result.msg || 'Failed to delete product';
          }
        }

        if (success) {
          await prisma.minewSyncQueue.update({
            where: { id: item.id },
            data: {
              status: 'success',
              processedAt: new Date(),
            },
          });
          results.succeeded++;
          console.log(`[MinewQueue] ✓ ${item.entityType} ${item.entityId} ${item.operation} succeeded`);
        } else {
          throw new Error(errorMessage);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        const newRetryCount = item.retryCount + 1;
        const isFinalFailure = newRetryCount >= item.maxRetries;

        await prisma.minewSyncQueue.update({
          where: { id: item.id },
          data: {
            status: isFinalFailure ? 'failed' : 'pending',
            retryCount: newRetryCount,
            lastError: errorMessage,
            // Exponential backoff: 1min, 2min, 4min...
            scheduledAt: new Date(Date.now() + Math.pow(2, newRetryCount) * 60 * 1000),
          },
        });

        results.failed++;
        console.error(`[MinewQueue] ✗ ${item.entityType} ${item.entityId} failed (attempt ${newRetryCount}/${item.maxRetries}):`, errorMessage);
      }
    }

    console.log(`[MinewQueue] Batch complete: ${results.succeeded} succeeded, ${results.failed} failed out of ${results.processed} processed`);
  } catch (error) {
    console.error('[MinewQueue] Error processing queue:', error);
  }

  return results;
}
