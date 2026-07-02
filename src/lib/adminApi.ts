import { supabase } from "@/integrations/supabase/client";

class AdminAPI {
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds timeout

  private async fetchProxy(functionName: string, options: any = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const explicitMethod = String(options.method || '').toUpperCase();
    const hasBody = options.body !== undefined && options.body !== null;
    const method = explicitMethod || (hasBody ? 'POST' : 'GET');
    let url = `${window.location.origin}/marketplace-api/functions/${functionName}`;

    if (method === 'GET' && hasBody && typeof options.body === 'object') {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.body)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'object') {
          params.set(key, JSON.stringify(value));
        } else {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...(options.headers || {}),
      },
      body: method === 'GET' ? undefined : JSON.stringify(options.body || {}),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.error || data?.message || `Function ${functionName} failed with ${response.status}`;
      throw new Error(message);
    }

    return data;
  }

  public async makeRequest(functionName: string, options: any = {}) {
    const cacheKey = `${functionName}_${JSON.stringify(options.body || {})}`;

    if (!options.body?.action || ['list', 'detail', 'stats'].includes(options.body?.action)) {
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        if (import.meta.env.DEV) {
          console.log(`Cache hit for ${functionName}`);
        }
        return cached.data;
      }
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout: ${functionName}`)), this.REQUEST_TIMEOUT);
    });

    try {
      const data = await Promise.race([this.fetchProxy(functionName, options), timeoutPromise]) as any;

      if (!options.body?.action || ['list', 'detail', 'stats'].includes(options.body?.action)) {
        this.requestCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: this.CACHE_TTL
        });
        this.cleanCache();
      } else {
        this.invalidateCache(functionName);
      }

      return data;
    } catch (err) {
      if (err instanceof Error && err.message.includes('timeout')) {
        console.error(`Request timeout for ${functionName}`);
      }
      console.error(`AdminAPI Error (${functionName}):`, err);
      throw err;
    }
  }

  private cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.requestCache.delete(key);
      }
    }
  }

  private invalidateCache(functionName?: string) {
    if (!functionName) {
      this.requestCache.clear();
      return;
    }

    for (const key of this.requestCache.keys()) {
      if (key.startsWith(`${functionName}_`)) {
        this.requestCache.delete(key);
      }
    }
  }

  // Users management
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  } = {}) {
    return this.makeRequest('admin-users', {
      body: {
        action: 'list',
        page: params.page || 1,
        limit: params.limit || 50,
        ...(params.search && { search: params.search }),
        ...(params.role && { role: params.role })
      }
    });
  }

  async getUserDetail(userId: string) {
    return this.makeRequest('admin-users', {
      body: { action: 'detail', userId }
    });
  }

  async blockUser(userId: string, reason: string) {
    return this.makeRequest('admin-users', {
      body: { action: 'block_user', userId, reason }
    });
  }

  async unblockUser(userId: string, reason: string) {
    return this.makeRequest('admin-users', {
      body: { action: 'unblock_user', userId, reason }
    });
  }

  async changeUserRole(userId: string, newRole: string, removeRole?: string, reason?: string) {
    return this.makeRequest('admin-users', {
      body: { action: 'change_role', userId, newRole, removeRole, reason }
    });
  }

  async resetKYC(userId: string, reason: string) {
    return this.makeRequest('admin-kyc', {
      body: { action: 'reset', userId, notes: reason }
    });
  }

  async moderateKyc(userId: string, status: 'approved' | 'rejected', notes?: string) {
    return this.makeRequest('admin-kyc', {
      body: { action: 'moderate', userId, status, notes }
    });
  }

  // Jobs management
  async getJobs(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams({
      action: 'list',
      page: String(params.page || 1),
      limit: String(params.limit || 50),
      ...(params.status && { status: params.status }),
      ...(params.search && { search: params.search })
    });

    return this.makeRequest('admin-jobs', {
      body: { params: Object.fromEntries(searchParams) }
    });
  }

  async getJobDetail(jobId: string) {
    return this.makeRequest('admin-jobs', {
      body: { action: 'detail', jobId }
    });
  }

  async reassignJob(jobId: string, newProId: string, reason: string) {
    return this.makeRequest('admin-jobs', {
      body: { action: 'reassign_job', jobId, newProId, reason }
    });
  }

  async cancelJob(jobId: string, reason: string, refundAmount?: number) {
    return this.makeRequest('admin-jobs', {
      body: { action: 'cancel_job', jobId, reason, refundAmount }
    });
  }

  async forceCompleteJob(jobId: string, reason: string) {
    return this.makeRequest('admin-jobs', {
      body: { action: 'force_complete', jobId, reason }
    });
  }

  // Finance management
  async getWallets(params: { page?: number; limit?: number } = {}) {
    const searchParams = new URLSearchParams({
      action: 'wallets',
      page: String(params.page || 1),
      limit: String(params.limit || 50)
    });

    return this.makeRequest('admin-finance', {
      body: { params: Object.fromEntries(searchParams) }
    });
  }

  async getEscrows(params: { page?: number; limit?: number } = {}) {
    const searchParams = new URLSearchParams({
      action: 'escrows',
      page: String(params.page || 1),
      limit: String(params.limit || 50)
    });

    return this.makeRequest('admin-finance', {
      body: { params: Object.fromEntries(searchParams) }
    });
  }

  async getPayouts(params: { page?: number; limit?: number } = {}) {
    const searchParams = new URLSearchParams({
      action: 'payouts',
      page: String(params.page || 1),
      limit: String(params.limit || 50)
    });

    return this.makeRequest('admin-finance', {
      body: { params: Object.fromEntries(searchParams) }
    });
  }

  async releaseEscrow(escrowId: string, reason: string) {
    return this.makeRequest('admin-finance', {
      body: { action: 'release_escrow', escrowId, reason }
    });
  }

  async refundEscrow(escrowId: string, reason: string, refundAmount?: number) {
    return this.makeRequest('admin-finance', {
      body: { action: 'refund_escrow', escrowId, reason, refundAmount }
    });
  }

  async approvePayout(payoutId: string, notes?: string) {
    return this.makeRequest('admin-finance', {
      body: { action: 'approve_payout', payoutId, notes }
    });
  }

  // Analytics
  async getAnalytics(metric: string = 'dashboard', period: string = '7d') {
    return this.makeRequest('admin-analytics', {
      body: {
        metric,
        period,
        timeRange: period
      }
    });
  }

  // Audit logs
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    resourceType?: string;
    adminUser?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams({
      action: 'list',
      page: String(params.page || 1),
      limit: String(params.limit || 100),
      ...(params.resourceType && { resource_type: params.resourceType }),
      ...(params.adminUser && { admin_user: params.adminUser }),
      ...(params.startDate && { start_date: params.startDate }),
      ...(params.endDate && { end_date: params.endDate })
    });

    return this.makeRequest('admin-audit', {
      body: { params: Object.fromEntries(searchParams) }
    });
  }

  async getAuditStats(startDate?: string, endDate?: string) {
    const searchParams = new URLSearchParams({
      action: 'stats',
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate })
    });

    return this.makeRequest('admin-audit', {
      body: { params: Object.fromEntries(searchParams) }
    });
  }

  async exportAuditLogs() {
    const searchParams = new URLSearchParams({ action: 'export' });

    // This will return CSV data
    return this.makeRequest('admin-audit', {
      body: { params: Object.fromEntries(searchParams) }
    });
  }

  // Error Logs Management
  async getLogs(params?: {
    page?: number;
    limit?: number;
    level?: string;
    source?: string;
    search?: string;
    resolved?: string;
    timeRange?: string;
  }) {
    const query = new URLSearchParams({
      action: 'list',
      ...(params?.page && { page: String(params.page) }),
      ...(params?.limit && { limit: String(params.limit) }),
      ...(params?.level && params.level !== 'all' && { level: params.level }),
      ...(params?.source && params.source !== 'all' && { source: params.source }),
      ...(params?.search && { search: params.search }),
      ...(params?.resolved && params.resolved !== 'all' && { resolved: params.resolved }),
      ...(params?.timeRange && { timeRange: params.timeRange })
    });

    const session = await supabase.auth.getSession();
    const response = await fetch(`${window.location.origin}/marketplace-api/functions/admin-logs?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.data.session?.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AdminAPI Error (admin-logs list):', response.status, errorText);
      throw new Error(errorText || `Failed to fetch admin logs (${response.status})`);
    }

    return response.json();
  }

  async getLogTrends(timeRange: string = '7d') {
    const query = new URLSearchParams({
      action: 'trends',
      timeRange
    });

    const session = await supabase.auth.getSession();
    const response = await fetch(`${window.location.origin}/marketplace-api/functions/admin-logs?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.data.session?.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AdminAPI Error (admin-logs trends):', response.status, errorText);
      throw new Error(errorText || `Failed to fetch admin log trends (${response.status})`);
    }

    return response.json();
  }

  async markLogAsResolved(logId: string) {
    return this.makeRequest('admin-logs', {
      method: 'POST',
      body: {
        action: 'resolve',
        log_id: logId
      }
    });
  }

  async exportLogs(filters?: any) {
    const query = new URLSearchParams({
      action: 'export',
      ...(filters?.level && filters.level !== 'all' && { level: filters.level }),
      ...(filters?.source && filters.source !== 'all' && { source: filters.source }),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.resolved && filters.resolved !== 'all' && { resolved: filters.resolved }),
      ...(filters?.timeRange && { timeRange: filters.timeRange })
    });

    const session = await supabase.auth.getSession();
    const response = await fetch(`${window.location.origin}/marketplace-api/functions/admin-logs?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.data.session?.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AdminAPI Error (admin-logs export):', response.status, errorText);
      throw new Error(errorText || `Failed to export logs (${response.status})`);
    }

    return await response.text();
  }


  async createLog(log: {
    level: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    message: string;
    user_id?: string;
    metadata?: any;
    stack_trace?: string;
  }) {
    return this.makeRequest('admin-logs', {
      method: 'POST',
      body: { action: 'create', ...log }
    });
  }

  async clearAllLogs() {
    return this.makeRequest('admin-logs', {
      body: {
        action: 'clear_all'
      }
    });
  }
}

export { AdminAPI };
export const adminApi = new AdminAPI();