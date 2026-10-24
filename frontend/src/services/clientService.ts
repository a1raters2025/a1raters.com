import { apiClient } from './apiClient';

export interface ClientDashboardResponse {
    status: string;
    message: string;
    data: {
        dailyTotals: { date: string; totalTasks: number; totalHours: number }[];
    };
}

export const clientService = {
    async getDashboard(): Promise<ClientDashboardResponse> {
        return apiClient.get<ClientDashboardResponse>('/client/dashboard');
    },
};
