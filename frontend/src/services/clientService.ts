import { apiClient } from './apiClient';

export interface ClientDashboardResponse {
    status: string;
    message: string;
    data: {
        totalHours: number;
        categoryHours: { category: string; raterName: string; totalHours: number }[];
        projectCategories: string[];
    };
}

export interface ClientReport {
    _id: string;
    raterName: string;
    profileName: string;
    category: string;
    tasksWorked: string;
    hoursWorked: string;
    date: string;
    status: string;
    reviewStatus: string;
    description?: string;
}

export interface ClientReportsResponse {
    status: string;
    message: string;
    data: ClientReport[];
}

export const clientService = {
    async getDashboard(): Promise<ClientDashboardResponse> {
        return apiClient.get<ClientDashboardResponse>('/client/dashboard');
    },
    async getReports(): Promise<ClientReportsResponse> {
        return apiClient.get<ClientReportsResponse>('/client/reports');
    },
};
