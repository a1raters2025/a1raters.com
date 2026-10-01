import { apiClient, isUnauthorizedError } from './apiClient';

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
    isApproved?: boolean;
    isRejected?: boolean;
    rejectionReason?: string | null;
    rejectedAt?: string | null;
    categories?: string[];
    image?: string;
    lastLoginAt?: string;
    lastLoginIp?: string;
    lastSeenAt?: string;
    loginCount?: number;
    createdAt?: string;
    paymentDetails?: {
        bankName?: string | null;
        accountNumber?: string | null;
        accountName?: string | null;
        currency?: string;
        isVerified?: boolean;
        verifiedAt?: string | null;
    };
    totalEarned?: number;
    totalPaid?: number;
    paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed';
    lastPaymentDate?: string | null;
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
const USER_KEY = 'a1_raters_user';
let currentUser: User | null = null;
let authInitialized = false;
let authInitPromise: Promise<void> | null = null;

const getStoredToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

const setStoredToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    apiClient.setToken(token);
};

const clearStoredToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    apiClient.setToken(null);
};

const getStoredUser = (): User | null => {
    const data = localStorage.getItem(USER_KEY);
    try {
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

const setStoredUser = (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const initializeAuth = async () => {
    if (authInitialized || authInitPromise) return authInitPromise;

    authInitPromise = (async () => {
        const token = getStoredToken();
        const storedUser = getStoredUser();

        if (token) {
            apiClient.setToken(token);
            if (storedUser) {
                currentUser = storedUser;
            } else {
                // Try to fetch fresh profile
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
                        setStoredUser(user);
                    }
            } catch (error) {
                if (!isUnauthorizedError(error)) {
                    console.error('Failed to fetch profile on init:', error);
                }
                clearStoredToken();
                currentUser = null;
            }
            }
        }

        authInitialized = true;
    })();

    return authInitPromise;
};

export const authService = {
    async init(): Promise<void> {
        await initializeAuth();
    },

    isAuthReady(): boolean {
        return authInitialized;
    },
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
        setStoredUser(user);
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

    async resendVerificationEmail(email: string): Promise<string> {
        const response = await apiClient.post<{ status: string; message: string }>(
            '/user/resend-verification',
            { email },
        );
        if (response.status !== 'success') {
            throw new Error(response.message || 'Unable to resend verification email');
        }
        return response.message;
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
        setStoredUser(user);
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
        setStoredUser(currentUser);
        return currentUser;
    },

    async approveUser(userId: string): Promise<User> {
        const response = await apiClient.patch<{ status: string; message?: string; data: User }>(
            `/user/users/${encodeURIComponent(userId)}/approval`,
            { approved: true },
        );
        if (response.status !== 'success' || !response.data) {
            throw new Error(response.message || 'Unable to approve user');
        }
        return response.data;
    },

    async getPendingUsers(page = 1, limit = 50, role?: string): Promise<{ users: User[]; total: number; totalPages: number; currentPage: number }> {
        let endpoint = `/user/users/pending?page=${page}&limit=${limit}`;
        if (role) endpoint += `&role=${encodeURIComponent(role)}`;
        const response = await apiClient.get<{ status: string; data: User[]; pagination: { currentPage: number; totalPages: number; totalItems: number; itemsPerPage: number } }>(endpoint);
        if (response.status !== 'success' || !response.data) {
            throw new Error('Unable to fetch pending users');
        }
        return {
            users: response.data,
            total: response.pagination?.totalItems ?? response.data.length,
            totalPages: response.pagination?.totalPages ?? 1,
            currentPage: response.pagination?.currentPage ?? page,
        };
    },

    async rejectUser(userId: string, reason: string): Promise<User> {
        const response = await apiClient.post<{ status: string; message?: string; data: User }>(
            `/user/users/${encodeURIComponent(userId)}/reject`,
            { reason },
        );
        if (response.status !== 'success' || !response.data) {
            throw new Error(response.message || 'Unable to reject user');
        }
        return response.data;
    },

    async uploadProfileImage(file: File): Promise<User> {
        if (!currentUser?.email) throw new Error('You must be signed in to upload a profile image');
        const formData = new FormData();
        formData.append('image', file);
        const response = await apiClient.upload<{ status: string; message?: string; data: User }>(`/user/${encodeURIComponent(currentUser.email)}/image`, formData);
        if (response.status !== 'success' || !response.data) throw new Error(response.message || 'Image upload failed');
        currentUser = { ...response.data, username: response.data.userName || response.data.username, isAdmin: response.data.role === 'admin' };
        setStoredUser(currentUser);
        return currentUser;
    },

    async refreshToken(): Promise<boolean> {
        const accessToken = await apiClient.refreshAccessToken();
        return Boolean(accessToken);
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

apiClient.setTokenRefreshHandler((accessToken) => {
    setStoredToken(accessToken);
});

apiClient.setUnauthorizedHandler(() => {
    clearStoredToken();
    currentUser = null;
    authInitialized = true;
    window.dispatchEvent(new Event('auth-changed'));
});