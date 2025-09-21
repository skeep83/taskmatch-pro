import { supabase } from "@/integrations/supabase/client";

class AdminAPI {
  public async makeRequest(functionName: string, options: any = {}) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: options.body || {},
      headers: options.headers || {}
    });

    if (error) {
      console.error(`AdminAPI Error (${functionName}):`, error);
      throw new Error(error.message || `Failed to call ${functionName}`);
    }

    return data;
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
    return this.makeRequest('admin-users', {
      body: { action: 'reset_kyc', userId, reason }
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
    const searchParams = new URLSearchParams({ metric, period });

    return this.makeRequest('admin-analytics', {
      body: { params: Object.fromEntries(searchParams) }
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
    return this.makeRequest('admin-logs', { action: 'list', ...params });
  }

  async markLogAsResolved(logId: string) {
    return this.makeRequest('admin-logs', { 
      action: 'resolve', 
      log_id: logId 
    });
  }

  async exportLogs(filters?: any) {
    return this.makeRequest('admin-logs', { action: 'export', ...filters });
  }

  async createLog(log: {
    level: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    message: string;
    user_id?: string;
    metadata?: any;
    stack_trace?: string;
  }) {
    return this.makeRequest('admin-logs', { action: 'create', ...log });
  }
}

export { AdminAPI };
export const adminApi = new AdminAPI();