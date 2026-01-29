import crypto from 'crypto';

// Minew ESL Cloud API Configuration
const MINEW_API_BASE = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
const MINEW_USERNAME = process.env.MINEW_USERNAME || '';
const MINEW_PASSWORD = process.env.MINEW_PASSWORD || '';

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: Date | null = null;

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
    
    console.log('[Minew] Attempting login to:', loginUrl);
    console.log('[Minew] Username:', MINEW_USERNAME);
    console.log('[Minew] Password hash:', hashedPassword);
    
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
    console.log('[Minew] Response status:', response.status);
    console.log('[Minew] Response body:', responseText);
    
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
 */
export async function getMinewToken(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }

  // Login to get a new token
  const result = await minewLogin();
  return result.success ? result.token || null : null;
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

async function minewApiCall<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: object;
    params?: Record<string, string>;
  } = {}
): Promise<MinewApiResponse<T>> {
  const token = await getMinewToken();
  
  if (!token) {
    return { code: -1, msg: 'Not authenticated' };
  }

  const { method = 'GET', body, params } = options;
  
  let url = `${MINEW_API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

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
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
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
  const params: Record<string, string> = {
    active: String(active),
  };

  if (condition) {
    params.condition = condition;
  }

  const response = await minewApiCall<MinewStore[] | { items: MinewStore[] }>(
    '/apis/esl/store/list',
    { params }
  );

  if (response.code === 200 && response.data) {
    // Handle both array response and object with items
    const stores = Array.isArray(response.data) ? response.data : response.data.items || [];

    // Map id to storeId for backward compatibility
    const mappedStores = stores.map(store => ({
      ...store,
      storeId: store.id || store.storeId, // Use id as storeId
    }));

    return mappedStores;
  }

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
  // The listPage endpoint returns items at root level, not under data
  const response = await minewApiCall<{ items?: MinewGateway[] }>('/apis/esl/gateway/listPage', {
    params: { page: '1', size: '100', storeId },
  });

  // Handle response where items may be at root level or under data
  if (response.code === 200) {
    // Check for items at root level first (listPage response format)
    const anyResponse = response as any;
    if (anyResponse.items) {
      return anyResponse.items;
    }
    // Fallback to data.items
    if (response.data?.items) {
      return response.data.items;
    }
  }

  return [];
}

/**
 * Add a gateway to a store
 */
export async function addGateway(gateway: {
  mac: string;
  name: string;
  storeId: string;
}): Promise<{ success: boolean; error?: string }> {
  const response = await minewApiCall('/apis/esl/gateway/add', {
    method: 'POST',
    body: gateway,
  });
  
  return {
    success: response.code === 200,
    error: response.code !== 200 ? response.msg : undefined,
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
): Promise<{ success: boolean; results?: Record<string, string>; error?: string }> {
  const response = await minewApiCall<Record<string, string>>('/apis/esl/label/batchAdd', {
    method: 'POST',
    body: {
      storeId,
      macArray: macAddresses,
      type: 1, // 1 = ESL tag
    },
  });
  
  if (response.code === 200 && response.data) {
    return { success: true, results: response.data };
  }
  return { success: false, error: response.msg };
}

/**
 * List ESL tags for a store
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
    type: '1',
  };
  
  if (options?.status && statusMap[options.status]) {
    params.eqstatus = statusMap[options.status];
  }
  
  const response = await minewApiCall<{ items: MinewESLTag[]; totalNum: number }>(
    '/apis/esl/label/cascadQuery',
    { params }
  );
  
  if (response.code === 200 && response.data) {
    return { items: response.data.items || [], total: response.data.totalNum || 0 };
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
 * Delete ESL tags
 */
export async function deleteESLTags(storeId: string, macAddresses: string[]): Promise<boolean> {
  const response = await minewApiCall('/apis/esl/label/batchDeleteLabels', {
    method: 'POST',
    body: { storeId, macArray: macAddresses },
  });
  return response.code === 200;
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
  const response = await minewApiCall('/apis/esl/goods/add', {
    method: 'POST',
    body: { storeId, ...data },
  });
  
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
