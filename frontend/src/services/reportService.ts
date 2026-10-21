import { apiClient } from './apiClient';
import { authService } from './authService';

export interface MonthlyStatsItem {
  _id?: string;
  [key: string]: number | string | undefined;
}

export interface EarningsLeaderboardEntry {
  userId?: string;
  username: string;
  totalEarned: number;
  totalReports: number;
  totalHours: number;
}

export interface RequestReport {
  _id?: string;
  id: number;
  raterName: string;
  profileName: string;
  email: string;
  category: string;
  proxy: string;
  tasksWorked: string;
  hoursWorked: string;
  hourlyRate?: number;
  submissionId?: string;
  date: string;
  taskPublishedDate?: string;
  submissionTime?: string;
  description?: string;
  paymentDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  status?: 'Active' | 'Restricted' | 'Sacked' | 'Paid';
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  submittedBy?: {
    _id: string;
    userName: string;
    email: string;
  };
  approvedBy?: {
    _id: string;
    userName: string;
    email: string;
  };
  approvedAt?: string;
  latePenalty?: number;
  invoiceId?: string | { _id?: string; status?: string };
  isDeleted?: boolean;
  isResubmitted?: boolean;
  originalReportId?: string | null;
  deletedAt?: string;
  deletedBy?: { _id: string; userName: string; email: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  _id: string;
  actionType: 'create' | 'update' | 'delete' | 'status_change' | 'resubmit' | 'penalty_applied';
  reportId: {
    _id: string;
    raterName: string;
    email: string;
    category: string;
    date: string;
  } | string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: {
    _id: string;
    userName: string;
    email: string;
  } | string;
  changedByName: string;
  ipAddress?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListResponse {
  status: string;
  message: string;
  data: RequestReport[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface AdminReportReviewsResponse {
  data: RequestReport[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface AccountSummaryItem {
  email: string;
  hasRestricted: boolean;
  hasSacked: boolean;
  lastActivity: string;
}

export interface RaterPerformanceItem {
  email: string;
  totalHours: number;
  totalTasks: number;
  totalReports: number;
  categories: string[];
  proxies: string[];
  totalLatePenalty: number;
  firstDate: string;
  lastDate: string;
}

export interface RaterPerformanceResponse {
  status: string;
  message: string;
  data: {
    byEmail: RaterPerformanceItem[];
    overall: {
      totalHours: number;
      totalTasks: number;
      totalReports: number;
      totalLatePenalty: number;
    };
  };
}

const REPORT_KEY = 'a1_raters_submitted_reports';

const getLocalReports = (): RequestReport[] => {
  try { return JSON.parse(localStorage.getItem(REPORT_KEY) || '[]') as RequestReport[]; } catch { return []; }
};

const getCurrentUserReports = (): RequestReport[] => {
  const user = authService.getUser();
  const reports = getLocalReports();
  if (!user) return [];
  if (user.role === 'admin') return reports;
  return reports.filter(report => {
    const submittedBy = report.submittedBy?._id;
    if (submittedBy) return submittedBy === user._id;
    const username = user.userName || user.username;
    return Boolean(username) && report.raterName === username;
  });
};

const normalizeReport = (report: RequestReport): RequestReport => ({
  ...report,
  id: report._id ? Date.now() : (report.id ?? Date.now()),
});

const normalizeAuditLog = (log: AuditLogEntry): AuditLogEntry => ({
  ...log,
  _id: log._id || String(Date.now()),
});

export const reportService = {
  async getEarningsLeaderboard(params?: { category?: string; limit?: number }): Promise<EarningsLeaderboardEntry[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.limit) query.set('limit', String(params.limit));
    const suffix = query.toString();
    const response = await apiClient.get<{
      status: string;
      message?: string;
      data: EarningsLeaderboardEntry[];
    }>(`/reports/leaderboard${suffix ? `?${suffix}` : ''}`);
    if (response.status !== 'success' || !Array.isArray(response.data)) {
      throw new Error(response.message || 'Failed to load earnings leaderboard');
    }
    return response.data;
  },

  async getAdminReportReviews(params: {
    page?: number;
    limit?: number;
    category?: string;
    reviewStatus?: 'all' | 'pending' | 'approved' | 'rejected';
    raterName?: string;
  }): Promise<AdminReportReviewsResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.category) queryParams.append('category', params.category);
    if (params.reviewStatus) queryParams.append('reviewStatus', params.reviewStatus);
    if (params.raterName) queryParams.append('raterName', params.raterName);

    const response = await apiClient.get<{
      status: string;
      message?: string;
      data: RequestReport[];
      pagination: AdminReportReviewsResponse['pagination'];
    }>(`/reports/admin-review?${queryParams.toString()}`);

    if (response.status !== 'success' || !response.data || !response.pagination) {
      throw new Error(response.message || 'Failed to load rater reports');
    }
    return {
      data: response.data.map(normalizeReport),
      pagination: response.pagination,
    };
  },

  async updateReportReview(
    id: string,
    reviewStatus: 'approved' | 'rejected',
    reviewNote = '',
  ): Promise<RequestReport> {
    const response = await apiClient.patch<{
      status: string;
      message?: string;
      data: RequestReport;
    }>(`/reports/${encodeURIComponent(id)}/review-status`, { reviewStatus, reviewNote });

    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || `Failed to ${reviewStatus === 'approved' ? 'approve' : 'reject'} report`);
    }
    return normalizeReport(response.data);
  },

  async getAllReports(params?: {
    page?: number;
    limit?: number;
    email?: string;
    raterName?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
  }): Promise<RequestReport[]> {
    try {
      let endpoint = '/reports';
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.email) queryParams.append('email', params.email);
      if (params?.raterName) queryParams.append('raterName', params.raterName);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.category) queryParams.append('category', params.category);

      if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

      const response = await apiClient.get<ReportListResponse>(endpoint);
      if (response.status === 'success' && response.data) {
        return response.data.map(normalizeReport);
      }
    } catch (error) {
      console.error('Failed to fetch reports from backend, using local fallback:', error);
    }

    const user = authService.getUser();
    if (user?.role !== 'admin') return getCurrentUserReports();
    const data = localStorage.getItem(REPORT_KEY);
    return data ? JSON.parse(data) : [];
  },

  async getAllReportsFromServer(): Promise<RequestReport[]> {
    const reports: RequestReport[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await apiClient.get<ReportListResponse>(`/reports?page=${page}&limit=100`);
      if (response.status !== 'success' || !Array.isArray(response.data) || !response.pagination) {
        throw new Error(response.message || 'Failed to load rater reports');
      }
      reports.push(...response.data.map(normalizeReport));
      totalPages = response.pagination.totalPages;
      page += 1;
    } while (page <= totalPages);
    return reports;
  },

  async getReportsByEmail(email: string, params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<RequestReport[]> {
    try {
      let endpoint = `/reports/email/${encodeURIComponent(email)}`;
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.status) queryParams.append('status', params.status);

      if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

      const response = await apiClient.get<{ status: string; data: RequestReport[] }>(endpoint);
      if (response.status === 'success' && response.data) {
        return response.data.map(normalizeReport);
      }
    } catch (error) {
      console.error('Failed to fetch reports by email from backend, using local fallback:', error);
    }

    const all = getCurrentUserReports();
    return all.filter(r => r.email.toLowerCase() === email.toLowerCase());
  },

  async getReportsByRater(raterName: string, params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<RequestReport[]> {
    try {
      let endpoint = `/reports/rater/${encodeURIComponent(raterName)}`;
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.status) queryParams.append('status', params.status);

      if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

      const response = await apiClient.get<{ status: string; data: RequestReport[] }>(endpoint);
      if (response.status === 'success' && response.data) {
        return response.data.map(normalizeReport);
      }
    } catch (error) {
      console.error('Failed to fetch reports by rater from backend, using local fallback:', error);
    }

    const user = authService.getUser();
    if (user?.role !== 'admin' && raterName !== (user?.userName || user?.username)) return [];
    const all = getCurrentUserReports();
    return all.filter(r => r.raterName === raterName);
  },

  async getMyReports(params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<RequestReport[]> {
    try {
      let endpoint = '/reports/my-reports';
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.status) queryParams.append('status', params.status);

      if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

      const response = await apiClient.get<{ status: string; data: RequestReport[] }>(endpoint);
      if (response.status === 'success' && response.data) {
        return response.data.map(normalizeReport);
      }
    } catch (error) {
      console.error('Failed to fetch my reports from backend, using local fallback:', error);
    }

    return getCurrentUserReports();
  },

  async getMyReportsFromServer(): Promise<RequestReport[]> {
    const response = await apiClient.get<{ status: string; message?: string; data: RequestReport[] }>('/reports/my-reports');
    if (response.status !== 'success' || !Array.isArray(response.data)) {
      throw new Error(response.message || 'Failed to load your reports');
    }
    return response.data.map(normalizeReport);
  },

  async getReportById(id: string): Promise<RequestReport | undefined> {
    try {
      const response = await apiClient.get<{ status: string; data: RequestReport }>(`/reports/${id}`);
      if (response.status === 'success' && response.data) {
        return normalizeReport(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch report by ID from backend:', error);
    }

    return undefined;
  },

  async saveReports(reports: Omit<RequestReport, 'submissionTime'>[]): Promise<RequestReport[]> {
    const reportsForSubmission = reports.map((report) => ({
      ...report,
      submissionId: report.submissionId || crypto.randomUUID(),
    }));

    const response = await apiClient.post<{ status: string; message?: string; data: RequestReport[] }>(
      '/reports/bulk',
      { reports: reportsForSubmission },
    );
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to save reports');
    }
    return response.data.map(normalizeReport);
  },

  async createReport(report: Omit<RequestReport, 'id' | 'submissionTime'>): Promise<RequestReport | undefined> {
    try {
      const response = await apiClient.post<{ status: string; message?: string; data: RequestReport }>('/reports', report);
      if (response.status === 'success' && response.data) {
        return normalizeReport(response.data);
      }
    } catch (error) {
      console.error('Failed to create report on backend:', error);
    }

    return undefined;
  },

  async updateReport(updatedReport: RequestReport, reason?: string): Promise<RequestReport | undefined> {
    try {
      const id = updatedReport._id || updatedReport.id;
      if (!id) throw new Error('Report ID is required');

      const body: Partial<RequestReport> & { reason?: string } = { ...updatedReport };
      if (reason) body.reason = reason;

      const response = await apiClient.patch<{ status: string; data: RequestReport }>(`/reports/${id}`, body);
      if (response.status === 'success' && response.data) {
        return normalizeReport(response.data);
      }
    } catch (error) {
      console.error('Failed to update report on backend:', error);
    }

    return this.updateReportLocal(updatedReport);
  },

  async updateMyReport(id: string, updates: Partial<RequestReport>): Promise<RequestReport> {
    const response = await apiClient.patch<{ status: string; message?: string; data: RequestReport }>(
      `/reports/${encodeURIComponent(id)}`,
      updates,
    );
    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || 'Failed to update report');
    }
    return normalizeReport(response.data);
  },

  async updateReportStatus(id: string | number, status: 'Active' | 'Restricted' | 'Sacked' | 'Paid'): Promise<RequestReport | undefined> {
    try {
      const reportId = typeof id === 'string' && id.startsWith('local_') ? null : id;
      if (reportId) {
        const response = await apiClient.patch<{ status: string; data: RequestReport }>(`/reports/${reportId}/status`, { status });
        if (response.status === 'success' && response.data) {
          return normalizeReport(response.data);
        }
      }
    } catch (error) {
      console.error('Failed to update report status on backend:', error);
    }

    return this.updateReportStatusLocal(id, status);
  },

  async deleteReport(id: string | number, reason?: string): Promise<boolean> {
    const isServerReportId = typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
    if (!isServerReportId) return this.deleteReportLocal(id);

    try {
      let endpoint = `/reports/${encodeURIComponent(id)}`;
      if (reason) endpoint += `?reason=${encodeURIComponent(reason)}`;
      const response = await apiClient.delete<{ status: string; message?: string }>(endpoint);
      if (response.status === 'success') return true;
      throw new Error(response.message || 'Failed to archive report on the server');
    } catch (error) {
      console.error('Failed to archive report on backend:', error);
      throw error instanceof Error ? error : new Error('Failed to archive report on the server');
    }
  },

  async getDeletedReports(params?: {
    page?: number;
    limit?: number;
    raterName?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<RequestReport[]> {
    try {
      let endpoint = '/reports/deleted';
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.raterName) queryParams.append('raterName', params.raterName);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

      const response = await apiClient.get<{ status: string; data: RequestReport[] }>(endpoint);
      if (response.status === 'success' && response.data) {
        return response.data.map(normalizeReport);
      }
    } catch (error) {
      console.error('Failed to fetch deleted reports from backend:', error);
    }

    return [];
  },

  async getAuditLog(reportId?: string): Promise<AuditLogEntry[]> {
    try {
      const endpoint = reportId
        ? `/reports/audit-log/${encodeURIComponent(reportId)}`
        : '/reports/audit-log';

      const response = await apiClient.get<{ status: string; data: AuditLogEntry[] }>(endpoint);
      if (response.status === 'success' && response.data) {
        return response.data.map(normalizeAuditLog);
      }
    } catch (error) {
      console.error('Failed to fetch audit log from backend:', error);
    }

    return [];
  },

  async getRaterPerformance(raterName: string, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<RaterPerformanceResponse | undefined> {
    try {
      let endpoint = `/reports/performance/${encodeURIComponent(raterName)}`;
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

      const response = await apiClient.get<RaterPerformanceResponse>(endpoint);
      if (response.status === 'success') {
        return response;
      }
    } catch (error) {
      console.error('Failed to fetch rater performance from backend:', error);
    }

    return undefined;
  },

  getAllReportsLocal(): RequestReport[] {
    const data = localStorage.getItem(REPORT_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveReportsLocal(reports: Omit<RequestReport, 'submissionTime'>[]): RequestReport[] {
    const all = this.getAllReportsLocal();
    const newReports = reports.map(r => ({
      ...r,
      id: Date.now() + Math.random(),
      submissionTime: new Date().toISOString(),
      latePenalty: this.calculateLatePenalty(new Date().toISOString()),
    }));
    const updated = [...all, ...newReports];
    localStorage.setItem(REPORT_KEY, JSON.stringify(updated));
    return newReports;
  },

  calculateLatePenalty(submissionTime: string): number {
    if (!submissionTime) return 0;
    const d = new Date(submissionTime);
    const hour = d.getHours();
    const minute = d.getMinutes();
    if (hour > 9 || (hour === 9 && minute > 0)) {
      return 10000;
    }
    return 0;
  },

  isLateSubmission(submissionTime: string): boolean {
    return this.calculateLatePenalty(submissionTime) > 0;
  },

  updateReportLocal(updatedReport: RequestReport): RequestReport | undefined {
    const all = this.getAllReportsLocal();
    const index = all.findIndex(r => r.id === updatedReport.id);
    if (index !== -1) {
      all[index] = updatedReport;
      localStorage.setItem(REPORT_KEY, JSON.stringify(all));
      return updatedReport;
    }
    return undefined;
  },

  updateReportStatusLocal(id: string | number, status: 'Active' | 'Restricted' | 'Sacked' | 'Paid'): RequestReport | undefined {
    const all = this.getAllReportsLocal();
    const index = all.findIndex(r => r.id === id);
    if (index !== -1) {
      all[index] = { ...all[index], status };
      localStorage.setItem(REPORT_KEY, JSON.stringify(all));
      return all[index];
    }
    return undefined;
  },

  deleteReportLocal(id: string | number): boolean {
    const all = this.getAllReportsLocal();
    const report = all.find(r => r.id === id);
    if (report) {
      report.isDeleted = true;
      report.deletedAt = new Date().toISOString();
      localStorage.setItem(REPORT_KEY, JSON.stringify(all));
      return true;
    }
    return false;
  },

  getAccountSummaryLocal(): AccountSummaryItem[] {
    const all = this.getAllReportsLocal();
    const statusMap = new Map<string, { hasRestricted: boolean; hasSacked: boolean; lastActivity: string }>();

    all.forEach(r => {
      if (r.isDeleted) return;
      const current = statusMap.get(r.email) || { hasRestricted: false, hasSacked: false, lastActivity: r.date };
      if (r.status === 'Restricted') current.hasRestricted = true;
      if (r.status === 'Sacked') current.hasSacked = true;
      if (new Date(r.date) > new Date(current.lastActivity)) {
        current.lastActivity = r.date;
      }
      statusMap.set(r.email, current);
    });

    return Array.from(statusMap.entries()).map(([email, status]) => ({
      email,
      ...status,
    }));
  },
};
