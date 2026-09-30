import { apiClient } from './apiClient';

export interface ActivityEntry {
  _id: string;
  action: string;
  userName: string;
  userRole: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  userId?: { _id: string; userName: string; email: string; role: string; lastLoginAt: string };
}

export interface ActiveSession {
  _id: string;
  userName: string;
  email: string;
  role: string;
  lastLoginAt: string;
  lastLoginIp: string;
  lastSeenAt: string;
  loginCount: number;
}

export interface AdminStats {
  loginsToday: number;
  failedLoginsToday: number;
  activeUsersLast7d: number;
  totalReports: number;
  totalUsers: number;
}

export interface ActivityLogResponse {
  status: string;
  data: {
    logs: ActivityEntry[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface ActivityFilter {
  page?: number;
  limit?: number;
  action?: string;
  userName?: string;
  userId?: string;
  role?: string;
  ipAddress?: string;
  resourceType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const adminService = {
  async getActivityLog(filters?: ActivityFilter): Promise<ActivityLogResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value));
      });
    }
    const qs = params.toString();
    const url = qs ? `/admin/activity?${qs}` : '/admin/activity';
    const response = await apiClient.get<ActivityLogResponse>(url);
    return response;
  },

  async getUserActivity(userId: string): Promise<{ status: string; data: ActivityEntry[] }> {
    return apiClient.get<{ status: string; data: ActivityEntry[] }>(`/admin/activity/user/${userId}`);
  },

  async getSessions(): Promise<{ status: string; data: ActiveSession[] }> {
    return apiClient.get<{ status: string; data: ActiveSession[] }>('/admin/sessions');
  },

  async forceLogout(userId: string): Promise<{ status: string; message: string; data: { userId: string } }> {
    return apiClient.post<{ status: string; message: string; data: { userId: string } }>(`/admin/sessions/${userId}/force-logout`, {});
  },

  async getStats(): Promise<{ status: string; data: { stats: AdminStats; recentActivity: ActivityEntry[] } }> {
    return apiClient.get<{ status: string; data: { stats: AdminStats; recentActivity: ActivityEntry[] } }>('/admin/stats');
  },

  async getSettings(): Promise<{ status: string; data: Record<string, unknown> }> {
    return apiClient.get<{ status: string; data: Record<string, unknown> }>('/admin/settings');
  },

  async updateSettings(settings: Record<string, unknown>): Promise<{ status: string; message: string; data: { changedFields: string[] } }> {
    return apiClient.post<{ status: string; message: string; data: { changedFields: string[] } }>('/admin/settings', settings);
  },
};
