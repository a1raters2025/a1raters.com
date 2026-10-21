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

export const clientService = {
    async getDashboard(): Promise<ClientDashboardResponse> {
        return apiClient.get<ClientDashboardResponse>('/client/dashboard');
    },
};
