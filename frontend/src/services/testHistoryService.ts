import { apiClient } from './apiClient';

export interface TestHistoryEntry {
    _id?: string;
    id?: string;
    userId: string;
    username: string;
    testType: 'practice' | 'test';
    category: string;
    subCategory?: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeSpent?: number;
    answers?: {
        taskId: string;
        query: string;
        userRating: string;
        correctRating: string;
        isCorrect: boolean;
        timeTaken?: number;
    }[];
    createdAt?: string;
    updatedAt?: string;
}

export interface TestHistoryListResponse {
    status: string;
    message: string;
    data: TestHistoryEntry[];
    stats?: {
        totalTests: number;
        averageScore: number;
        bestScore: number;
        totalTimeSpent: number;
    };
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

export interface TestStatsResponse {
    status: string;
    message: string;
    data: {
        byCategory: {
            category: string;
            totalTests: number;
            averageScore: number;
            bestScore: number;
            averageTime: number;
        }[];
        overall: {
            totalTests: number;
            averageScore: number;
            bestScore: number;
            totalTimeSpent: number;
        };
    };
}

export interface LeaderboardEntry {
    username: string;
    bestScore: number;
    bestTime: number;
    totalTests: number;
    averageScore: number;
}

export interface LeaderboardResponse {
    status: string;
    message: string;
    data: LeaderboardEntry[];
}

const normalizeEntry = (entry: TestHistoryEntry): TestHistoryEntry => ({
    ...entry,
    id: entry._id,
});

export const testHistoryService = {
    async saveTestResult(data: Omit<TestHistoryEntry, '_id' | 'userId' | 'username' | 'createdAt' | 'updatedAt'>): Promise<TestHistoryEntry> {
        try {
            const response = await apiClient.post<{ status: string; message?: string; data: TestHistoryEntry }>('/test-history', data);
            if (response.status === 'success' && response.data) {
                return normalizeEntry(response.data);
            }
            throw new Error(response.message || 'Failed to save test result');
        } catch (error) {
            console.error('Backend save test result failed, saving locally:', error);
            return this.saveTestResultLocal(data);
        }
    },

    async getTestHistory(params?: {
        testType?: string;
        category?: string;
        page?: number;
        limit?: number;
    }): Promise<{ entries: TestHistoryEntry[]; stats: Record<string, unknown>; pagination: Record<string, unknown> }> {
        try {
            let endpoint = '/test-history';
            const queryParams = new URLSearchParams();
            if (params?.testType) queryParams.append('testType', params.testType);
            if (params?.category) queryParams.append('category', params.category);
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            
            if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

            const response = await apiClient.get<TestHistoryListResponse>(endpoint);
            if (response.status === 'success' && response.data) {
                return {
                    entries: response.data.map(normalizeEntry),
                    stats: response.stats || {
                        totalTests: 0,
                        averageScore: 0,
                        bestScore: 0,
                        totalTimeSpent: 0,
                    },
                    pagination: response.pagination || {},
                };
            }
        } catch (error) {
            console.error('Failed to fetch test history from backend, using local fallback:', error);
        }

        return { entries: [], stats: {}, pagination: {} };
    },

    async getTestHistoryByUser(userId: string, params?: {
        testType?: string;
        category?: string;
        page?: number;
        limit?: number;
    }): Promise<{ entries: TestHistoryEntry[]; pagination: Record<string, unknown> }> {
        try {
            let endpoint = `/test-history/user/${userId}`;
            const queryParams = new URLSearchParams();
            if (params?.testType) queryParams.append('testType', params.testType);
            if (params?.category) queryParams.append('category', params.category);
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            
            if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

            const response = await apiClient.get<TestHistoryListResponse>(endpoint);
            if (response.status === 'success' && response.data) {
                return {
                    entries: response.data.map(normalizeEntry),
                    pagination: response.pagination || {},
                };
            }
        } catch (error) {
            console.error('Failed to fetch user test history from backend:', error);
        }

        return { entries: [], pagination: {} };
    },

    async getTestStats(username?: string): Promise<{
        byCategory: Record<string, unknown>[];
        overall: Record<string, unknown>;
    }> {
        try {
            let endpoint = '/test-history/stats';
            if (username) endpoint += `?username=${encodeURIComponent(username)}`;

            const response = await apiClient.get<TestStatsResponse>(endpoint);
            if (response.status === 'success' && response.data) {
                return response.data;
            }
        } catch (error) {
            console.error('Failed to fetch test stats from backend:', error);
        }

        return this.getTestStatsLocal(username);
    },

    async getLeaderboard(params?: {
        category?: string;
        testType?: string;
        limit?: number;
    }): Promise<LeaderboardEntry[]> {
        try {
            let endpoint = '/test-history/leaderboard';
            const queryParams = new URLSearchParams();
            if (params?.category) queryParams.append('category', params.category);
            if (params?.testType) queryParams.append('testType', params.testType);
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            
            if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

            const response = await apiClient.get<LeaderboardResponse>(endpoint);
            if (response.status === 'success' && response.data) {
                return response.data;
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard from backend:', error);
        }

        return [];
    },

    getTestHistoryLocal(username: string, testType: string): { attempts: number; scores: number[] } {
        const key = `a1_test_history_${username}_${testType}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : { attempts: 0, scores: [] };
    },

    saveTestResultLocal(data: Omit<TestHistoryEntry, '_id' | 'userId' | 'username' | 'createdAt' | 'updatedAt'>): TestHistoryEntry {
        const user = JSON.parse(localStorage.getItem('a1_raters_user') || '{}');
        const username = user.username || 'unknown';
        
        const key = `a1_test_history_${username}_${data.testType}`;
        const stored = localStorage.getItem(key);
        const history = stored ? JSON.parse(stored) : { attempts: 0, scores: [] };

        history.attempts += 1;
        history.scores.push(data.score);

        localStorage.setItem(key, JSON.stringify(history));

        return {
            ...data,
            userId: 'local',
            username,
            _id: `local_${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
    },

    getTestStatsLocal(username?: string): {
        byCategory: Record<string, unknown>[];
        overall: Record<string, unknown>;
    } {
        const user = username ? { username } : JSON.parse(localStorage.getItem('a1_raters_user') || '{}');
        const targetUsername = user.username || 'unknown';
        
        const categories = ['App Store', 'Video', 'Music', 'Podcast'];
        const testTypes = ['practice', 'test'];
        
const byCategory = categories.map(category => {
            let totalTests = 0;
            let totalScore = 0;
            let bestScore = 0;

            testTypes.forEach(testType => {
                const key = `a1_test_history_${targetUsername}_${testType}_${category}`;
                const stored = localStorage.getItem(key);
                if (stored) {
                    const history = JSON.parse(stored);
                    totalTests += history.attempts || 0;
                    if (history.scores && history.scores.length > 0) {
                        totalScore += history.scores.reduce((a: number, b: number) => a + b, 0);
                        bestScore = Math.max(bestScore, ...history.scores);
                    }
                }
            });
            
            return {
                category,
                totalTests,
                averageScore: totalTests > 0 ? Math.round((totalScore / totalTests) * 100) / 100 : 0,
                bestScore,
                averageTime: 0,
            };
        }).filter(c => c.totalTests > 0);

        let overallTests = 0;
        let overallScore = 0;
        let overallBest = 0;

        categories.forEach(category => {
            testTypes.forEach(testType => {
                const key = `a1_test_history_${targetUsername}_${testType}_${category}`;
                const stored = localStorage.getItem(key);
                if (stored) {
                    const history = JSON.parse(stored);
                    overallTests += history.attempts || 0;
                    if (history.scores && history.scores.length > 0) {
                        overallScore += history.scores.reduce((a: number, b: number) => a + b, 0);
                        overallBest = Math.max(overallBest, ...history.scores);
                    }
                }
            });
        });

        return {
            byCategory,
            overall: {
                totalTests: overallTests,
                averageScore: overallTests > 0 ? Math.round((overallScore / overallTests) * 100) / 100 : 0,
                bestScore: overallBest,
                totalTimeSpent: 0,
            },
        };
    },
};