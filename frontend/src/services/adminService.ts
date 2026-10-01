import { apiClient } from './apiClient';
import { User } from './authService';

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

export interface PaymentDetails {
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  currency: string;
  isVerified: boolean;
  verifiedAt: string | null;
}

export interface RaterPayment {
  _id: string;
  userName: string;
  email: string;
  proxy: string;
  paymentDetails: PaymentDetails;
  totalEarned: number;
  totalPaid: number;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  lastPaymentDate: string | null;
  createdAt: string;
}

export interface PaymentsResponse {
  status: string;
  data: RaterPayment[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
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

  async getRaterPayments(filters?: { page?: number; limit?: number; paymentStatus?: string; search?: string }): Promise<PaymentsResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value));
      });
    }
    const qs = params.toString();
    const url = qs ? `/admin/payments/raters?${qs}` : '/admin/payments/raters';
    return apiClient.get<PaymentsResponse>(url);
  },

  async getRaterPaymentDetails(userId: string): Promise<{ status: string; data: RaterPayment }> {
    return apiClient.get<{ status: string; data: RaterPayment }>(`/admin/payments/raters/${userId}`);
  },

  async processPayment(userId: string, payload: { paymentStatus: string; amount?: number; notes?: string }): Promise<{ status: string; message: string; data: Record<string, unknown> }> {
    return apiClient.patch<{ status: string; message: string; data: Record<string, unknown> }>(
      `/admin/payments/raters/${userId}/process`,
      payload
    );
  },

  async updatePaymentDetails(updates: Partial<PaymentDetails>): Promise<{ status: string; message: string; data: User }> {
    return apiClient.patch<{ status: string; message: string; data: User }>('/user/payment-details', updates);
  },

  async getPaymentDetails(): Promise<{ status: string; data: User }> {
    return apiClient.get<{ status: string; data: User }>('/user/payment-details');
  },
};
