import { apiClient } from './apiClient';

export interface User {
    _id?: string;
    username: string;
    userName?: string;
    email?: string;
    evaluation?: string;
    proxy?: string;
    failedTest?: boolean;
    isAdmin?: boolean;
    role?: 'admin' | 'user' | 'client';
    isVerified?: boolean;
    image?: string;
}

export interface LoginResponse {
    status: string;
    message: string;
    token: string;
    data: User;
}

export interface RegisterResponse {
    status: string;
    message: string;
    data: User;
}

export type GoogleRegisterResponse = LoginResponse;

const REPORT_EMAILS_KEY = 'a1_raters_report_emails';
const TOKEN_KEY = 'a1_raters_token';
let currentUser: User | null = null;

const getStoredToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

const setStoredToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    apiClient.setToken(token);
};

const clearStoredToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    apiClient.setToken(null);
};

const initializeAuth = () => {
    const token = getStoredToken();
    if (token) {
        apiClient.setToken(token);
    }
};

initializeAuth();

export const authService = {
    async login(username: string, password: string): Promise<User | null> {
        const response = await apiClient.post<LoginResponse>('/user/login', { email: username, password });
        if (response.status !== 'success' || !response.data || !response.token) {
            return null;
        }

        const user: User = {
            ...response.data,
            username: response.data.userName || response.data.username,
            isAdmin: response.data.role === 'admin',
        };
        delete (user as User & { password?: string }).password;
        currentUser = user;
        setStoredToken(response.token);
        return user;
    },

    async register(username: string, password?: string, email?: string, _evaluation?: string, proxy?: string, role: User['role'] = 'user', confirmPassword?: string): Promise<User> {
        const response = await apiClient.post<RegisterResponse>('/user/register', {
            userName: username,
            email: email || `${username.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            password: password || `${username.toLowerCase()}123!`,
            confirmPassword: confirmPassword || password || `${username.toLowerCase()}123!`,
            proxy,
            role,
        });
        if (response.status !== 'success' || !response.data) {
            throw new Error(response.message || 'Registration failed');
        }
        return response.data;
    },

    async registerAdmin(username: string, email: string, password: string, confirmPassword: string, passcode: string): Promise<User> {
        const response = await apiClient.post<RegisterResponse>('/user/admin/register', {
            userName: username,
            email,
            password,
            confirmPassword,
            passcode,
        });
        if (response.status !== 'success' || !response.data) {
            throw new Error(response.message || 'Administrator registration failed');
        }
        return response.data;
    },

    async registerWithGoogle(credential: string, role: User['role'] = 'user', proxy?: string): Promise<User> {
        const response = await apiClient.post<GoogleRegisterResponse>('/user/google', { credential, role, proxy });
        if (response.status !== 'success' || !response.data) {
            throw new Error(response.message || 'Google signup failed');
        }

        const user: User = {
            ...response.data,
            username: response.data.userName || response.data.username,
            isAdmin: response.data.role === 'admin',
        };
        delete (user as User & { password?: string }).password;
        currentUser = user;
        setStoredToken(response.token);
        return user;
    },

    async logout(): Promise<void> {
        try {
            await apiClient.post('/user/logout', {});
        } catch (error) {
            console.error('Backend logout failed:', error);
        } finally {
            clearStoredToken();
            currentUser = null;
        }
    },

    getUser(): User | null {
        return currentUser;
    },

    isAuthenticated(): boolean {
        return Boolean(currentUser || getStoredToken());
    },

    async getProfile(): Promise<User | null> {
        try {
            const response = await apiClient.get<{ status: string; data: User }>('/user/profile');
            if (response.status === 'success' && response.data) {
                const user: User = {
                    ...response.data,
                    username: response.data.userName || response.data.username,
                    isAdmin: response.data.role === 'admin',
                };
                delete (user as User & { password?: string }).password;
                currentUser = user;
                return user;
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
        return null;
    },

    async updateProfile(updates: Pick<User, 'username' | 'email' | 'evaluation' | 'proxy'>): Promise<User> {
        if (!currentUser?.email) throw new Error('You must be signed in to update your profile');
        const response = await apiClient.patch<{ status: string; message?: string; data: User }>(`/user/${encodeURIComponent(currentUser.email)}`, {
            userName: updates.username,
            email: updates.email,
            evaluation: updates.evaluation,
            proxy: updates.proxy,
        });
        if (response.status !== 'success' || !response.data) throw new Error(response.message || 'Profile update failed');
        currentUser = { ...response.data, username: response.data.userName || response.data.username, isAdmin: response.data.role === 'admin' };
        return currentUser;
    },

    async refreshToken(): Promise<boolean> {
        try {
            const response = await apiClient.post<{ accessToken: string }>('/user/refresh-token', {});
            if (response.accessToken) {
                setStoredToken(response.accessToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        return false;
    },

    getAllUsers(): User[] { return []; },

    saveReportEmail: (email: string) => {
        const emails = authService.getReportEmails();
        if (!emails.includes(email)) {
            emails.push(email);
            localStorage.setItem(REPORT_EMAILS_KEY, JSON.stringify(emails));
        }
    },

    getReportEmails: (): string[] => {
        const data = localStorage.getItem(REPORT_EMAILS_KEY);
        try {
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    async getUsersFromBackend(): Promise<User[]> {
        try {
            const response = await apiClient.get<{ status: string; data: User[] }>('/user/users');
            if (response.status === 'success' && response.data) {
                return response.data.map(u => ({
                    ...u,
                    username: u.userName || u.username,
                    isAdmin: u.role === 'admin',
                }));
            }
        } catch (error) {
            console.error('Failed to fetch users from backend:', error);
        }
        return this.getAllUsers();
    },
};