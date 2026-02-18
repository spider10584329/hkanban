import crypto from 'crypto';
import { 
  getMinewToken as getTokenFromManager, 
  invalidateMinewToken,
  getDefaultStoreId, 
  minewApiCall as tokenManagedApiCall 
} from './minewTokenManager';

// Minew ESL Cloud API Configuration
const MINEW_API_BASE = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
const MINEW_USERNAME = process.env.MINEW_USERNAME || '';
const MINEW_PASSWORD = process.env.MINEW_PASSWORD || '';

// DEPRECATED: Old token cache (kept for backward compatibility)
// Use getTokenFromManager() from minewTokenManager instead
let cachedToken: string | null = null;
let tokenExpiry: Date | null = null;

// Re-export the new token manager functions
export { getDefaultStoreId } from './minewTokenManager';

/**
 * Get Minew storeId from localStorage (client) or database (server)
 * This is a convenience function for use throughout the application
 */
export function getStoreIdFromSession(): string | null {
  // Client-side: check localStorage first
  if (typeof window !== 'undefined') {
    return localStorage.getItem('minewStoreId');
  }
  
  // Server-side: will need to fetch from database using getDefaultStoreId()
  return null;
}

/**
 * Get Minew storeId with fallback to database
 * This function works on both client and server
 */
export async function getStoreId(): Promise<string | null> {
  // Try localStorage first (client-side only)
  const sessionStoreId = getStoreIdFromSession();
  if (sessionStoreId) {
    return sessionStoreId;
  }
  
  // Fallback to database
  return await getDefaultStoreId();
}

// ==========================================
// Types and Interfaces
// ==========================================

export interface MinewApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

export interface MinewStore {
  id: string;
  storeId?: string; // For backward compatibility, we'll map id to storeId
  number?: string; // Store number/code (optional, may not be in API response)
  name: string;
  uuid?: string;
  address?: string;
  active?: number; // 0 = inactive, 1 = active
  country?: string;
  province?: string;
  city?: string;
  createTime?: string;
  updateTime?: string;
  merchantCode?: string;
}

export interface MinewGateway {
  id: string;
  mac: string;
  name: string;
  storeId: string;
  mode: number; // 1 = online, 0 = offline
  version?: string;
  updateTime?: string;
  // Additional fields from Minew cloud
  model?: string;
  wifiVersion?: string;
  bleVersion?: string;
  ip?: string;
}

export interface MinewESLTag {
  id: string;
  mac: string;
  storeId: string;
  screenSize: string;
  screenInfo: {
    inch: number;
    width: number;
    height: number;
    color: string; // 'bw' or 'bwr'
  };
  isOnline: string; // '1' = offline, '2' = online
  battery: number;
  bind: string; // '0' = unbound, '1' = bound
  goodsId?: string;
  demoId?: string;
  updateTime?: string;
}

export interface MinewInventoryData {
  id: string;
  storeId: string;
  product?: string;
  price1?: string;
  price2?: string;
  quantity?: string;
  location?: string;
  barcode13?: string;
  barcode128?: string;
  qrcode?: string;
  date?: string;
  image1?: string;
  [key: string]: string | undefined;
}

export interface MinewTemplate {
  demoId: string;
  demoName: string;
  storeId: string;
  screenSize: {
    inch: number;
    width: number;
    height: number;
  };
  color: string;
  type?: number;
  version?: string;
  orientation?: number;
}

export interface MinewBinding {
  labelMac: string;
  goodsId: string;
  demoId?: string;
  demoIdMap?: { A?: string; B?: string };
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  lowBattery: number;
  bound: number;
  unbound: number;
}

export interface GatewayStats {
  total: number;
  online: number;
  offline: number;
}

/**
 * Hash password using MD5 in 32-bit lowercase format
 * as required by Minew API
 */
export function hashPassword(password: string): string {
  return crypto.createHash('md5').update(password).digest('hex').toLowerCase();
}

/**
 * Login to Minew ESL Cloud and get authorization token
 * Token is valid for 24 hours
 */
export async function minewLogin(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
  message?: string;
}> {
  try {
    if (!MINEW_USERNAME || !MINEW_PASSWORD) {
      return {
        success: false,
        error: 'Minew credentials not configured',
        message: 'Please set MINEW_USERNAME and MINEW_PASSWORD in environment variables',
      };
    }

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

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        error: 'Invalid JSON response',
        message: `Server returned invalid response: ${responseText.substring(0, 200)}`,
      };
    }

    if (response.ok && data.token) {
      // Cache the token (valid for 24 hours, we'll refresh after 23 hours)
      cachedToken = data.token;
      tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);
      
      return {
        success: true,
        token: data.token,
        message: 'Successfully connected to Minew ESL Cloud',
      };
    }

    // Check for nested token in data.data (Minew API structure)
    if (response.ok && data.code === 200 && data.data?.token) {
      cachedToken = data.data.token;
      tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);
      
      return {
        success: true,
        token: data.data.token,
        message: 'Successfully connected to Minew ESL Cloud',
      };
    }

    return {
      success: false,
      error: data.message || data.error || 'Login failed',
      message: `Failed to authenticate with Minew ESL Cloud: ${data.message || 'Unknown error'}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      message: `Connection error: ${errorMessage}`,
    };
  }
}

/**
 * Get cached token or login to get a new one
 * NOW USES DATABASE-BACKED TOKEN MANAGER
 */
export async function getMinewToken(): Promise<string | null> {
  return getTokenFromManager();
}

/**
 * Test connection to Minew ESL Cloud
 */
export async function testMinewConnection(): Promise<{
  connected: boolean;
  message: string;
  details?: {
    apiBase: string;
    username: string;
    tokenValid: boolean;
  };
}> {
  const result = await minewLogin();
  
  return {
    connected: result.success,
    message: result.message || (result.success ? 'Connected' : 'Not connected'),
    details: {
      apiBase: MINEW_API_BASE,
      username: MINEW_USERNAME,
      tokenValid: result.success,
    },
  };
}

// ==========================================
// Helper function for API calls
// ==========================================

export async function minewApiCall<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: object;
    params?: Record<string, string>;
  } = {}
): Promise<MinewApiResponse<T>> {
  console.log('[minewApiCall] Starting call to:', endpoint);
  let token = await getMinewToken();
  
  console.log('[minewApiCall] Token obtained:', token ? 'Yes (length: ' + token.length + ')' : 'No');
  
  if (!token) {
    console.log('[minewApiCall] No token available, returning error');
    return { code: -1, msg: 'Not authenticated' };
  }

  const { method = 'GET', body, params } = options;
  
  let url = `${MINEW_API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  console.log('[minewApiCall] Full URL:', url);
  console.log('[minewApiCall] Method:', method);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'token': token,
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    console.log('[minewApiCall] Sending request...');
    const response = await fetch(url, fetchOptions);
    console.log('[minewApiCall] Response status:', response.status);
    
    const data = await response.json();
    console.log('[minewApiCall] Response data:', JSON.stringify(data, null, 2));
    
    // If token is invalid, clear cache and retry once with fresh token
    // Check for various token error codes: -1, 14002, or message contains "token"
    const isTokenError = 
      data.code === -1 || 
      data.code === 14002 || 
      (data.msg && data.msg.toLowerCase().includes('token'));
      
    if (isTokenError) {
      console.log('[minewApiCall] Token invalid (code: ' + data.code + '), refreshing...');
      
      // Invalidate the cached token
      await invalidateMinewToken();
      
      // Get a fresh token with force refresh
      token = await getMinewToken();
      if (!token) {
        return { code: -1, msg: 'Failed to refresh token' };
      }
      
      console.log('[minewApiCall] Retrying with new token...');
      
      // Retry the request with the new token
      fetchOptions.headers = {
        'Content-Type': 'application/json;charset=utf-8',
        'token': token,
      };
      
      const retryResponse = await fetch(url, fetchOptions);
      const retryData = await retryResponse.json();
      console.log('[minewApiCall] Retry response:', JSON.stringify(retryData, null, 2));
      return retryData;
    }
    
    return data;
  } catch (error) {
    console.error('[Minew API Error]', error);
    return { code: -1, msg: error instanceof Error ? error.message : 'API call failed' };
  }
}

// ==========================================
// Store Management
// ==========================================

/**
 * List all stores
 * Based on Minew ESL Cloud Platform API - Section 2.5 Get store information
 */
export async function listStores(active: 0 | 1 = 1, condition?: string): Promise<MinewStore[]> {
  console.log('[listStores] Starting with params:', { active, condition });
  
  const params: Record<string, string> = {
    page: '1',
    size: '100',
    active: String(active),
  };

  if (condition) {
    params.condition = condition;
  }

  console.log('[listStores] Calling minewApiCall with params:', params);

  // Use listPage endpoint - response structure: { code, msg, data: { items: [...] } }
  const response = await minewApiCall<{ items?: MinewStore[] }>(
    '/apis/esl/store/listPage',
    { params }
  );

  console.log('[listStores] Raw response:', JSON.stringify(response, null, 2));
  console.log('[listStores] Response code:', response.code);
  console.log('[listStores] Response has data:', !!response.data);
  console.log('[listStores] Response data has items:', !!response.data?.items);

  if (response.code === 200 && response.data?.items) {
    const stores = response.data.items;
    console.log('[listStores] Found', stores.length, 'stores');
    // Map id to storeId for backward compatibility
    const mappedStores = stores.map((store: MinewStore) => ({
      ...store,
      storeId: store.id || store.storeId,
    }));
    console.log('[listStores] Returning mapped stores:', JSON.stringify(mappedStores, null, 2));
    return mappedStores;
  }

  console.log('[listStores] No stores found or response code not 200');
  return [];
}

/**
 * Get store by ID
 */
export async function getStore(storeId: string): Promise<MinewStore | null> {
  const response = await minewApiCall<MinewStore>('/apis/esl/store/findById', {
    params: { storeId },
  });
  
  return response.code === 200 && response.data ? response.data : null;
}

/**
 * Create a new store
 */
export async function createStore(store: {
  number: string;
  name: string;
  address?: string;
}): Promise<{ success: boolean; storeId?: string; error?: string }> {
  const response = await minewApiCall<{ storeId: string }>('/apis/esl/store/add', {
    method: 'POST',
    body: store,
  });
  
  if (response.code === 200 && response.data) {
    return { success: true, storeId: response.data.storeId };
  }
  return { success: false, error: response.msg };
}

/**
 * Activate/deactivate a store
 */
export async function toggleStore(storeId: string, active: boolean): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/store/openOrClose', {
    params: { storeId, active: active ? '1' : '0' },
  });
  return response.code === 200;
}

// ==========================================
// Gateway Management
// ==========================================

/**
 * List gateways for a store
 */
export async function listGateways(storeId: string): Promise<MinewGateway[]> {
  console.log('[listGateways] Starting with storeId:', storeId);
  
  // Use listPage endpoint
  // NOTE: Gateway listPage returns items at ROOT level, not under data!
  // Response structure: { code, msg, items: [...], totalNum, ... }
  const response = await minewApiCall<{ items?: MinewGateway[] }>('/apis/esl/gateway/listPage', {
    params: { page: '1', size: '100', storeId },
  });

  console.log('[listGateways] Raw response:', JSON.stringify(response, null, 2));
  console.log('[listGateways] Response code:', response.code);
  
  // Check for items at ROOT level first (gateway listPage structure)
  const anyResponse = response as any;
  if (response.code === 200 && anyResponse.items) {
    console.log('[listGateways] Found', anyResponse.items.length, 'gateways at root level');
    return anyResponse.items;
  }
  
  // Fallback: check under data (store listPage structure)
  if (response.code === 200 && response.data?.items) {
    console.log('[listGateways] Found', response.data.items.length, 'gateways under data');
    return response.data.items;
  }

  console.log('[listGateways] No gateways found or response code not 200');
  return [];
}

/**
 * Add a gateway to a store
 */
export async function addGateway(gateway: {
  mac: string;
  name: string;
  storeId: string;
}): Promise<{ success: boolean; error?: string; code?: number; message?: string }> {
  const response = await minewApiCall('/apis/esl/gateway/add', {
    method: 'POST',
    body: gateway,
  });
  
  if (response.code === 200) {
    return { success: true };
  }
  
  // Return detailed error information including code
  return {
    success: false,
    error: response.msg,
    code: response.code,
    message: response.msg
  };
}

/**
 * Update gateway information
 */
export async function updateGateway(gateway: {
  id: string;
  mac: string;
  name: string;
  storeId: string;
}): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/gateway/update', {
    method: 'POST',
    body: gateway,
  });
  return response.code === 200;
}

/**
 * Delete a gateway
 */
export async function deleteGateway(gatewayId: string, storeId: string): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/gateway/delete', {
    params: { id: gatewayId, storeId },
  });
  return response.code === 200;
}

/**
 * Get gateway statistics for a store
 */
export async function getGatewayStats(storeId: string): Promise<GatewayStats> {
  const gateways = await listGateways(storeId);
  
  return {
    total: gateways.length,
    online: gateways.filter(g => g.mode === 1).length,
    offline: gateways.filter(g => g.mode !== 1).length,
  };
}

// ==========================================
// ESL Tag Management
// ==========================================

/**
 * Import ESL tags in batch
 */
export async function importESLTags(
  storeId: string,
  macAddresses: string[]
): Promise<{ 
  success: boolean; 
  results?: Record<string, string>; 
  error?: string;
  code?: number;
  message?: string;
}> {
  const response = await minewApiCall<Record<string, string>>('/apis/esl/label/batchAdd', {
    method: 'POST',
    body: {
      storeId,
      macArray: macAddresses,
      type: 1, // 1 = ESL tag
    },
  });
  
  // Check if the API call itself failed (non-200 code)
  if (response.code !== 200) {
    return { 
      success: false, 
      error: response.msg,
      code: response.code,
      message: response.msg
    };
  }
  
  // If code is 200, check the data for individual MAC results
  // Minew batchAdd returns a map of MAC -> result status
  // The data structure can be:
  // 1. { "mac": "0" } - success (0 means success)
  // 2. { "mac": "error message" } - failure with error message
  // 3. null/undefined - no data returned
  if (response.data) {
    const results = response.data;
    
    // Check each MAC result - "0" means success, anything else is an error
    const errorEntries = Object.entries(results).filter(([mac, status]) => {
      return String(status) !== '0';
    });
    
    if (errorEntries.length > 0) {
      const [failedMac, errorMessage] = errorEntries[0];
      
      // Return the actual error message from Minew
      return {
        success: false,
        error: String(errorMessage),
        code: response.code,
        message: String(errorMessage),
        results: results
      };
    }
    
    return { success: true, results: results };
  }
  
  // Return detailed error information including code
  return { 
    success: false, 
    error: response.msg || 'No data returned from Minew API',
    code: response.code,
    message: response.msg || 'No data returned from Minew API'
  };
}

/**
 * List ESL tags for a store
 * API Documentation: Minew ESL Cloud Platform API V5.0.24
 * Endpoint: /apis/esl/label/cascadQuery
 *
 * Response structure (items are at root level, not nested under data):
 * {
 *   "code": 200,
 *   "msg": "success",
 *   "currentPage": 1,
 *   "pageSize": 10,
 *   "totalNum": 4,
 *   "items": [...]
 * }
 */
export async function listESLTags(
  storeId: string,
  options?: {
    page?: number;
    size?: number;
    status?: 'online' | 'offline' | 'lowBattery' | 'bound' | 'unbound';
  }
): Promise<{ items: MinewESLTag[]; total: number }> {
  const statusMap: Record<string, string> = {
    offline: '1',
    online: '2',
    lowBattery: '5',
    bound: '8',
    unbound: '9',
  };

  const params: Record<string, string> = {
    page: String(options?.page || 1),
    size: String(options?.size || 50),
    storeId,
    type: '1', // 1 = ESL tag, 2 = warning light
  };

  // Add status filter if provided
  if (options?.status && statusMap[options.status]) {
    params.eqstatus = statusMap[options.status];
  }

  // Call Minew API
  const response = await minewApiCall<any>(
    '/apis/esl/label/cascadQuery',
    { params }
  );

  // According to API documentation, items are at root level, not nested under data
  if (response.code === 200) {
    // Cast to any to access root-level properties
    const responseData = response as any;

    // Check if items are directly in response (API doc structure)
    if (responseData.items !== undefined) {
      return {
        items: responseData.items || [],
        total: responseData.totalNum || 0
      };
    }
    // Fallback: check if items are nested under data
    if (response.data?.items !== undefined) {
      return {
        items: response.data.items || [],
        total: response.data.totalNum || 0
      };
    }
  }

  return { items: [], total: 0 };
}

/**
 * Get ESL tag by MAC address
 */
export async function getESLTag(mac: string): Promise<MinewESLTag | null> {
  const response = await minewApiCall<MinewESLTag>('/apis/esl/label/findByMac', {
    params: { mac },
  });
  
  return response.code === 200 && response.data ? response.data : null;
}

/**
 * Wake up ESL tags
 */
export async function wakeupESLTags(storeId: string, macAddresses: string[]): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/label/batchWake', {
    method: 'POST',
    body: { storeId, macs: macAddresses },
  });
  return response.code === 200;
}

/**
 * Delete ESL tags from Minew Cloud
 * API: POST /apis/esl/label/batchDeleteLabels
 * Body: { storeId: string, macs: string[] }
 * Note: MAC addresses must be lowercase
 */
export async function deleteESLTags(
  storeId: string,
  macAddresses: string[]
): Promise<{ success: boolean; error?: string }> {
  // Normalize MAC addresses to lowercase (API requirement)
  const normalizedMacs = macAddresses.map(mac =>
    mac.replace(/[:-]/g, '').toLowerCase()
  );

  const response = await minewApiCall<any>('/apis/esl/label/batchDeleteLabels', {
    method: 'POST',
    body: {
      storeId,
      macs: normalizedMacs,
    },
  });

  if (response.code === 200) {
    return { success: true };
  }

  return {
    success: false,
    error: response.msg || 'Failed to delete tags from Minew cloud',
  };
}

/**
 * Locate ESL tag (flash RGB light)
 */
export async function locateESLTag(storeId: string, mac: string): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/label/located', {
    method: 'POST',
    body: { storeId, mac },
  });
  return response.code === 200;
}

/**
 * Get ESL tag statistics for a store
 */
export async function getESLTagStats(storeId: string): Promise<DeviceStats> {
  // Get all tags to calculate stats
  const allTags = await listESLTags(storeId, { size: 1000 });
  
  const stats: DeviceStats = {
    total: allTags.total,
    online: 0,
    offline: 0,
    lowBattery: 0,
    bound: 0,
    unbound: 0,
  };
  
  for (const tag of allTags.items) {
    if (tag.isOnline === '2') stats.online++;
    else stats.offline++;
    
    if (tag.battery < 20) stats.lowBattery++;
    
    if (tag.bind === '1') stats.bound++;
    else stats.unbound++;
  }
  
  return stats;
}

// ==========================================
// Inventory Data / Products Management
// ==========================================

/**
 * Get dynamic fields configuration for a store
 */
export async function getDynamicFields(storeId: string): Promise<{ fieldName: string; fieldType: string }[]> {
  const response = await minewApiCall<{ dynamicFields: { fieldName: string; fieldType: string }[] }>(
    '/apis/esl/goods/queryDynamicFields',
    { params: { storeId } }
  );
  
  return response.code === 200 && response.data ? response.data.dynamicFields || [] : [];
}

/**
 * Add inventory data
 */
export async function addInventoryData(
  storeId: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  console.log('=== Minew addInventoryData Request ===');
  console.log('Endpoint: /apis/esl/goods/addToStore');
  console.log('StoreId:', storeId);
  console.log('Data:', JSON.stringify(data, null, 2));
  
  const response = await minewApiCall('/apis/esl/goods/addToStore', {
    method: 'POST',
    body: { storeId, ...data },
  });
  
  console.log('=== Minew addInventoryData Response ===');
  console.log('Response code:', response.code);
  console.log('Response msg:', response.msg);
  console.log('Full response:', JSON.stringify(response, null, 2));
  
  return {
    success: response.code === 200,
    error: response.code !== 200 ? response.msg : undefined,
  };
}

/**
 * Update inventory data
 */
export async function updateInventoryData(
  storeId: string,
  dataId: string,
  updates: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const response = await minewApiCall('/apis/esl/goods/update', {
    method: 'POST',
    body: { storeId, id: dataId, ...updates },
  });
  
  return {
    success: response.code === 200,
    error: response.code !== 200 ? response.msg : undefined,
  };
}

/**
 * Get inventory data by ID
 */
export async function getInventoryData(goodsId: string): Promise<MinewInventoryData | null> {
  const response = await minewApiCall<MinewInventoryData>('/apis/esl/goods/findByGoodsId', {
    params: { goodsId },
  });
  
  return response.code === 200 && response.data ? response.data : null;
}

/**
 * Delete inventory data
 */
export async function deleteInventoryData(storeId: string, dataIds: string[]): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/goods/delete', {
    method: 'POST',
    body: { storeId, ids: dataIds },
  });
  return response.code === 200;
}

// ==========================================
// Template Management
// ==========================================

/**
 * List templates for a store using the findAll endpoint
 * Based on Minew ESL Cloud Platform API v5.0.24
 */
export async function listTemplates(
  storeId: string,
  options?: {
    page?: number;
    size?: number;
    fuzzy?: string; // Fuzzy query the template name/color/store id/screen info
    color?: string; // Template color
    inch?: number; // Template size
    screening?: number; // 0: all templates, 1: system template, other: store template
  }
): Promise<MinewTemplate[]> {
  // Build query params for GET request
  const params: Record<string, string> = {
    page: String(options?.page || 1),
    size: String(options?.size || 100),
    storeId,
  };

  // Add optional parameters
  if (options?.fuzzy) params.fuzzy = options.fuzzy;
  if (options?.color) params.color = options.color;
  if (options?.inch) params.inch = String(options.inch);
  if (options?.screening !== undefined) params.screening = String(options.screening);

  const response = await minewApiCall<{
    items?: MinewTemplate[];
    rows?: MinewTemplate[];
    totalNum?: number;
    totalCount?: number;
  }>(
    '/apis/esl/template/findAll',
    { params }
  );

  if (response.code === 200 && response.data) {
    // The API returns templates in data.rows
    return response.data.rows || response.data.items || [];
  }

  return [];
}

// ==========================================
// Binding Operations
// ==========================================

/**
 * Bind ESL tag using template strategy (automatic template selection)
 */
export async function bindESLTagAutomatic(
  storeId: string,
  bindings: { labelMac: string; goodsId: string }[]
): Promise<{ success: boolean; error?: string }> {
  const response = await minewApiCall('/apis/esl/label/bind/generateBindingByTemplateStrategy', {
    method: 'POST',
    body: {
      storeId,
      labelTemplateDataVOList: bindings,
    },
  });
  
  return {
    success: response.code === 200,
    error: response.code !== 200 ? response.msg : undefined,
  };
}

/**
 * Bind ESL tag with specific template
 */
export async function bindESLTagManual(
  storeId: string,
  labelMac: string,
  goodsId: string,
  templateId: string,
  side: 'A' | 'B' = 'A'
): Promise<{ success: boolean; error?: string }> {
  const response = await minewApiCall('/apis/esl/label/update', {
    method: 'POST',
    body: {
      storeId,
      labelMac,
      goodsId,
      demoIdMap: { [side]: templateId },
    },
  });
  
  return {
    success: response.code === 200,
    error: response.code !== 200 ? response.msg : undefined,
  };
}

/**
 * Batch bind ESL tags
 */
export async function batchBindESLTags(
  storeId: string,
  bindings: MinewBinding[]
): Promise<{ success: boolean; error?: string }> {
  const response = await minewApiCall('/apis/esl/label/batchBinding', {
    method: 'POST',
    body: {
      storeId,
      labelTemplateDataVOList: bindings.map(b => ({
        labelMac: b.labelMac,
        goodsId: b.goodsId,
        demoIdMap: b.demoIdMap || { A: b.demoId },
      })),
    },
  });
  
  return {
    success: response.code === 200,
    error: response.code !== 200 ? response.msg : undefined,
  };
}

/**
 * Unbind ESL tag
 */
export async function unbindESLTag(storeId: string, labelMac: string): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/label/deleteBind', {
    method: 'POST',
    params: { mac: labelMac, storeId },
  });
  return response.code === 200;
}

/**
 * Check binding status for ESL tag
 */
export async function checkBinding(storeId: string, labelMac: string): Promise<MinewBinding | null> {
  const response = await minewApiCall<MinewBinding[]>('/apis/esl/label/queryBinding', {
    params: { mac: labelMac, storeId },
  });
  
  if (response.code === 200 && response.data && response.data.length > 0) {
    return response.data[0];
  }
  return null;
}

// ==========================================
// Display Update Operations
// ==========================================

/**
 * Refresh ESL tag displays
 */
export async function refreshESLTags(storeId: string, macAddresses: string[]): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/label/batchRefresh', {
    method: 'POST',
    body: { storeId, macs: macAddresses },
  });
  return response.code === 200;
}

/**
 * Update data and refresh display
 */
export async function updateAndRefreshESLTag(
  storeId: string,
  labelMac: string,
  goodsId: string,
  updates: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const response = await minewApiCall('/apis/esl/label/updateBindBrush', {
    method: 'POST',
    body: {
      labelMac,
      storeId,
      goodsMap: { id: goodsId, ...updates },
      demoIdMap: {},
    },
  });
  
  return {
    success: response.code === 200,
    error: response.code !== 200 ? response.msg : undefined,
  };
}

// ==========================================
// Warning & Monitoring
// ==========================================

/**
 * Get all warnings for a store
 */
export async function getWarnings(storeId: string): Promise<unknown[]> {
  const response = await minewApiCall<unknown[]>('/apis/esl/warning/findAllWarnings', {
    params: { storeId },
  });
  
  return response.code === 200 && response.data ? response.data : [];
}

// ==========================================
// Action Logs (Button Events)
// ==========================================

export interface MinewActionLog {
  id: string;
  operator: string;
  commodity: string;
  labelMac: string;
  result: string;
  objectType: string;
  actionType: string;
  storeId: string;
  createTime: string;
  gatewayMac: string;
  opCode: string;
  goods?: {
    id: string;
    storeId: string;
    name?: string;
    price?: string;
    specification?: string;
    barcode?: string;
    memberPrice?: string;
    [key: string]: string | undefined;
  };
}

export async function getActionLogs(
  storeId: string,
  options?: {
    page?: number;
    size?: number;
    actionType?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<{ items: MinewActionLog[]; totalNum: number }> {
  const body: Record<string, string | number> = {
    storeId,
    objectType: '1',
    currentPage: options?.page || 1,
    pageSize: options?.size || 100,
  };

  if (options?.actionType) body.actionType = options.actionType;
  if (options?.startTime) body.startTime = options.startTime;
  if (options?.endTime) body.endTime = options.endTime;

  const response = await minewApiCall<{
    items?: MinewActionLog[];
    totalNum?: number;
  }>('/apis/esl/logs/queryList', { 
    method: 'POST',
    body 
  });

  if (response.code === 200 && response.data) {
    return {
      items: response.data.items || [],
      totalNum: response.data.totalNum || 0,
    };
  }

  return { items: [], totalNum: 0 };
}

export async function getButtonEvents(
  storeId: string,
  startTime?: string,
  endTime?: string
): Promise<MinewActionLog[]> {
  const result = await getActionLogs(storeId, {
    actionType: '6',
    startTime,
    endTime,
    size: 1000,
  });
  
  return result.items.filter(log => log.goods && log.goods.id);
}

// ==========================================
// Wake-up API (for MIX firmware tags)
// ==========================================

export async function wakeUpTags(
  storeId: string,
  macAddresses: string[]
): Promise<{ success: boolean; error?: string; code?: number }> {
  const response = await minewApiCall('/apis/esl/label/batchWake', {
    method: 'POST',
    params: { storeId },
    body: macAddresses,
  });

  if (response.code === 200) {
    return { success: true };
  } else if (response.code === 54041) {
    return { success: true, code: 54041 };
  } else if (response.code === 54015) {
    return { success: false, error: 'Gateway offline', code: 54015 };
  } else if (response.code === 54031) {
    return { success: false, error: 'Tag offline', code: 54031 };
  }

  return {
    success: false,
    error: response.msg || 'Wake-up failed',
    code: response.code,
  };
}

export async function getAllTagsForWakeup(storeId: string): Promise<string[]> {
  const response = await minewApiCall<{
    items?: Array<{
      mac: string;
      firmwareType?: string;
      isOnline?: string;
    }>;
  }>('/apis/esl/label/cascadQuery', {
    params: {
      page: '1',
      size: '100',
      storeId,
      eqstatus: '1,2,5,8,9',
      type: '1',
    },
  });

  if (response.code === 200 && response.data?.items) {
    return response.data.items
      .filter(tag => tag.firmwareType === '0' && tag.isOnline === '2')
      .map(tag => tag.mac);
  }

  return [];
}

// ==========================================
// MinewESLManager Class
// ==========================================

/**
 * High-level manager class for Minew ESL operations
 */
export class MinewESLManager {
  private storeId: string;

  constructor(storeId: string) {
    this.storeId = storeId;
  }

  /**
   * Update product price and refresh all bound ESL tags
   */
  async updateProductPrice(
    productId: string,
    newPrice: string
  ): Promise<{ success: boolean; tagsUpdated: number; error?: string }> {
    try {
      // Step 1: Update data in Minew
      const updateResult = await updateInventoryData(this.storeId, productId, {
        price1: newPrice,
      });

      if (!updateResult.success) {
        return { success: false, tagsUpdated: 0, error: updateResult.error };
      }

      // Step 2: Find all tags bound to this product
      const allTags = await listESLTags(this.storeId, { size: 1000, status: 'bound' });
      const boundTags = allTags.items.filter(tag => tag.goodsId === productId);

      if (boundTags.length === 0) {
        return { success: true, tagsUpdated: 0 };
      }

      // Step 3: Refresh all bound tags
      const macAddresses = boundTags.map(tag => tag.mac);
      await refreshESLTags(this.storeId, macAddresses);

      return { success: true, tagsUpdated: boundTags.length };
    } catch (error) {
      return {
        success: false,
        tagsUpdated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get comprehensive store status
   */
  async getStoreStatus(): Promise<{
    store: MinewStore | null;
    gateways: GatewayStats;
    eslTags: DeviceStats;
    warnings: number;
  }> {
    const [store, gateways, eslTags, warnings] = await Promise.all([
      getStore(this.storeId),
      getGatewayStats(this.storeId),
      getESLTagStats(this.storeId),
      getWarnings(this.storeId),
    ]);

    return {
      store,
      gateways,
      eslTags,
      warnings: Array.isArray(warnings) ? warnings.length : 0,
    };
  }

  /**
   * Complete device onboarding flow
   */
  async onboardDevice(
    mac: string,
    productId: string,
    templateId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Import the device
      const importResult = await importESLTags(this.storeId, [mac]);
      if (!importResult.success) {
        return { success: false, error: importResult.error };
      }

      // Check import result for this MAC
      if (importResult.results && importResult.results[mac] !== 'success') {
        // Device might already exist, which is fine
        if (!importResult.results[mac]?.includes('exist')) {
          return { success: false, error: importResult.results[mac] };
        }
      }

      // Step 2: Bind to product
      let bindResult;
      if (templateId) {
        bindResult = await bindESLTagManual(this.storeId, mac, productId, templateId);
      } else {
        bindResult = await bindESLTagAutomatic(this.storeId, [{ labelMac: mac, goodsId: productId }]);
      }

      if (!bindResult.success) {
        return { success: false, error: bindResult.error };
      }

      // Step 3: Refresh the tag
      await refreshESLTags(this.storeId, [mac]);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync product data from local database to Minew
   */
  async syncProductToMinew(product: {
    sku: string;
    name: string;
    price: number;
    quantity: number;
    location?: string;
    barcode?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const data: Record<string, string> = {
      id: product.sku,
      product: product.name,
      price1: product.price.toString(),
      quantity: product.quantity.toString(),
    };

    if (product.location) data.location = product.location;
    if (product.barcode) data.barcode13 = product.barcode;

    // Try to update first, if fails, add new
    const updateResult = await updateInventoryData(this.storeId, product.sku, data);
    
    if (!updateResult.success) {
      // Product might not exist, try adding
      return await addInventoryData(this.storeId, data);
    }

    return updateResult;
  }
}
