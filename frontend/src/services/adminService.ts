import { apiClient } from './apiClient';
import type { User } from './authService';

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
  totalTasks: number;
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
  method?: 'paystack' | 'manual';
  paymentProvider?: string | null;
  bankName: string | null;
  bankCode?: string | null;
  accountNumber: string | null;
  accountNumberMasked?: string | null;
  accountName: string | null;
  routingNumber?: string | null;
  iban?: string | null;
  swiftCode?: string | null;
  country?: string | null;
  currency: string;
  isVerified: boolean;
  verificationStatus?: 'pending_review' | 'approved' | 'rejected';
  verificationNote?: string | null;
  verifiedAt: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  recipientCode?: string;
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
  pendingPayoutReference?: string | null;
  pendingPayoutAmount?: number | null;
  lastPaymentDate: string | null;
  createdAt: string;
}

export interface PayoutApproval {
  _id: string;
  userName: string;
  email: string;
  proxy?: string;
  paymentDetails: PaymentDetails;
  totalEarned: number;
  totalPaid: number;
  availableAmount: number;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  pendingPayoutReference?: string | null;
  pendingPayoutAmount?: number | null;
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

export interface PayoutApprovalsResponse {
  status: string;
  data: PayoutApproval[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface PayoutInitiateResponse {
  status: string;
  message: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    rater: {
      userId: string;
      userName: string;
      paymentStatus: string;
      totalEarned: number;
      totalPaid: number;
      lastPaymentDate: string | null;
    };
  };
}

export interface PayoutVerifyResponse {
  status: string;
  message: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paidAt: string | null;
    rater: {
      userId: string;
      userName: string;
      paymentStatus: string;
      totalEarned: number;
      totalPaid: number;
      lastPaymentDate: string | null;
    };
  };
}

export interface Bank {
  name: string;
  code: string;
  slug: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentBank {
  name: string;
  code: string;
}

export interface BanksResponse {
  status: string;
  data: Bank[];
}

export interface ResolveAccountResponse {
  status: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

export interface PaymentAccountResolveResponse {
  status: string;
  data: {
    accountNumber: string;
    accountName: string;
  };
}

export interface PaymentDetailsSaveResponse {
  status: string;
  message: string;
  data: {
    paymentDetails: PaymentDetails;
    totalEarned: number;
    totalPaid: number;
    paymentStatus: RaterPayment['paymentStatus'];
    lastPaymentDate: string | null;
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

  async reviewManualPaymentDetails(userId: string, decision: 'approved' | 'rejected', note = ''): Promise<{ status: string; message: string; data: RaterPayment }> {
    return apiClient.patch<{ status: string; message: string; data: RaterPayment }>(
      `/admin/payments/raters/${userId}/payment-details/review`,
      { decision, note },
    );
  },

  async initiatePayout(userId: string, payload: { amount?: number; reason?: string; bankCode?: string }): Promise<PayoutInitiateResponse> {
    return apiClient.post<PayoutInitiateResponse>(`/admin/payments/raters/${userId}/payout`, payload);
  },

  async verifyPayout(userId: string, reference: string): Promise<PayoutVerifyResponse> {
    return apiClient.get<PayoutVerifyResponse>(`/admin/payments/raters/${userId}/payout/${reference}/verify`);
  },

  async getBanks(currency = 'NGN'): Promise<BanksResponse> {
    return apiClient.get<BanksResponse>(`/admin/payments/banks?currency=${currency}`);
  },

  async resolveAccount(accountNumber: string, bankCode: string): Promise<ResolveAccountResponse> {
    return apiClient.post<ResolveAccountResponse>('/admin/payments/resolve-account', { accountNumber, bankCode });
  },

  async getPayoutApprovals(filters?: { page?: number; limit?: number; search?: string }): Promise<PayoutApprovalsResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value));
      });
    }
    const qs = params.toString();
    return apiClient.get<PayoutApprovalsResponse>(`/admin/payments/approvals${qs ? `?${qs}` : ''}`);
  },

  async getPaymentBanks(): Promise<{ status: string; data: PaymentBank[] }> {
    return apiClient.get<{ status: string; data: PaymentBank[] }>('/user/payment-banks');
  },

  async resolvePaymentAccount(accountNumber: string, bankCode: string): Promise<PaymentAccountResolveResponse> {
    return apiClient.post<PaymentAccountResolveResponse>('/user/resolve-payment-account', { accountNumber, bankCode });
  },

  async updatePaymentDetails(updates: Partial<PaymentDetails>): Promise<PaymentDetailsSaveResponse> {
    return apiClient.patch<PaymentDetailsSaveResponse>('/user/payment-details', updates);
  },

  async getPaymentDetails(): Promise<{ status: string; data: User }> {
    return apiClient.get<{ status: string; data: User }>('/user/payment-details');
  },
};
