import { apiClient } from './apiClient';

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
    date: string;
    submissionTime?: string;
    description?: string;
    paymentDetails?: {
        bankName: string;
        accountNumber: string;
        accountName: string;
    };
    status?: 'Active' | 'Restricted' | 'Sacked' | 'Paid';
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
    createdAt?: string;
    updatedAt?: string;
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

export interface AccountSummaryItem {
    email: string;
    hasRestricted: boolean;
    hasSacked: boolean;
    lastActivity: string;
}

const REPORT_KEY = 'a1_raters_submitted_reports';

const normalizeReport = (report: RequestReport): RequestReport => ({
    ...report,
    id: report._id ? Date.now() : (report.id ?? Date.now()),
});

export const reportService = {
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

        const data = localStorage.getItem(REPORT_KEY);
        return data ? JSON.parse(data) : [];
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

        const all = this.getAllReportsLocal();
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

        const all = this.getAllReportsLocal();
        return all.filter(r => r.raterName === raterName);
    },

    async saveReports(reports: Omit<RequestReport, 'submissionTime'>[]): Promise<RequestReport[]> {
        try {
            const response = await apiClient.post<{ status: string; message?: string; data: RequestReport[] }>('/reports/bulk', { reports });
            if (response.status === 'success' && response.data) {
                return response.data.map(normalizeReport);
            }
            throw new Error(response.message || 'Failed to save reports');
        } catch (error) {
            console.error('Backend save reports failed, saving locally:', error);
            return this.saveReportsLocal(reports);
        }
    },

    async updateReport(updatedReport: RequestReport): Promise<RequestReport | undefined> {
        try {
            const id = updatedReport._id || updatedReport.id;
            if (!id) throw new Error('Report ID is required');

            const response = await apiClient.patch<{ status: string; data: RequestReport }>(`/reports/${id}`, updatedReport);
            if (response.status === 'success' && response.data) {
                return normalizeReport(response.data);
            }
        } catch (error) {
            console.error('Failed to update report on backend:', error);
        }

        return this.updateReportLocal(updatedReport);
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

    async deleteReport(id: string | number): Promise<boolean> {
        try {
            const reportId = typeof id === 'string' && id.startsWith('local_') ? null : id;
            if (reportId) {
                const response = await apiClient.delete<{ status: string }>(`/reports/${reportId}`);
                if (response.status === 'success') {
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to delete report on backend:', error);
        }

        return this.deleteReportLocal(id);
    },

    async getAccountSummary(): Promise<AccountSummaryItem[]> {
        try {
            const response = await apiClient.get<{ status: string; data: AccountSummaryItem[] }>('/reports/summary');
            if (response.status === 'success' && response.data) {
                return response.data;
            }
        } catch (error) {
            console.error('Failed to fetch account summary from backend, using local fallback:', error);
        }

        return this.getAccountSummaryLocal();
    },

    async getMonthlyStats(month: number, year: number): Promise<any[]> {
        try {
            const response = await apiClient.get<{ status: string; data: any[] }>(`/reports/monthly-stats?month=${month}&year=${year}`);
            if (response.status === 'success' && response.data) {
                return response.data;
            }
        } catch (error) {
            console.error('Failed to fetch monthly stats from backend:', error);
        }
        return [];
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
            submissionTime: new Date().toISOString()
        }));
        const updated = [...all, ...newReports];
        localStorage.setItem(REPORT_KEY, JSON.stringify(updated));
        return newReports;
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
        const filtered = all.filter(r => r.id !== id);
        if (filtered.length !== all.length) {
            localStorage.setItem(REPORT_KEY, JSON.stringify(filtered));
            return true;
        }
        return false;
    },

    getAccountSummaryLocal(): AccountSummaryItem[] {
        const all = this.getAllReportsLocal();
        const statusMap = new Map<string, { hasRestricted: boolean; hasSacked: boolean; lastActivity: string }>();

        all.forEach(r => {
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