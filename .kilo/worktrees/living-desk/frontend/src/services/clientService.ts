import { apiClient } from './apiClient';
import type { RequestReport } from './reportService';

export interface ClientDashboardResponse {
    status: string;
    message: string;
    data: {
        reports: RequestReport[];
        summary: {
            totalHours: number;
            totalTasks: number;
            totalReports: number;
            uniqueEmails: number;
            uniqueRaters: number;
        };
        emailStats: Record<string, unknown>[];
        raterStats: Record<string, unknown>[];
        pagination: Record<string, unknown>;
    };
}

export interface ClientSummaryResponse {
    status: string;
    message: string;
    data: {
        overview: Record<string, unknown>;
        statusBreakdown: Record<string, unknown>[];
        monthlyTrend: Record<string, unknown>[];
    };
}

export interface EmailReportsResponse {
    status: string;
    message: string;
    data: {
        reports: Record<string, unknown>[];
        summary: Record<string, unknown>;
        pagination: Record<string, unknown>;
    };
}

export interface SearchRatersResponse {
    status: string;
    message: string;
    data: Record<string, unknown>[];
}

export const clientService = {
    async getDashboard(params?: {
        page?: number;
        limit?: number;
        email?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<ClientDashboardResponse> {
        let endpoint = '/client/dashboard';
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.email) queryParams.append('email', params.email);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        
        if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

        const response = await apiClient.get<ClientDashboardResponse>(endpoint);
        return response;
    },

    async getSummary(): Promise<ClientSummaryResponse> {
        const response = await apiClient.get<ClientSummaryResponse>('/client/summary');
        return response;
    },

    async getReportsByEmail(email: string, params?: {
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
        status?: string;
    }): Promise<EmailReportsResponse> {
        let endpoint = `/client/email/${encodeURIComponent(email)}`;
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.status) queryParams.append('status', params.status);
        
        if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

        const response = await apiClient.get<EmailReportsResponse>(endpoint);
        return response;
    },

    async searchRaters(query: string): Promise<SearchRatersResponse> {
        const response = await apiClient.get<SearchRatersResponse>(`/client/search?q=${encodeURIComponent(query)}`);
        return response;
    },
};