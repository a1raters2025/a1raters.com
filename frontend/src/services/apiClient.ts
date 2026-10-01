import { APP_CONFIG } from '../config/appConfig';

const API_BASE_URL = APP_CONFIG.apiUrl;

type TokenRefreshHandler = (accessToken: string) => void;
type UnauthorizedHandler = () => void;

const AUTH_ENDPOINTS = new Set([
  '/user/login',
  '/user/register',
  '/user/resend-verification',
  '/user/admin/register',
  '/user/google',
  '/user/refresh-token',
  '/user/logout',
]);

export class ApiError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const isUnauthorizedError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

class ApiClient {
  private token: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private tokenRefreshHandler: TokenRefreshHandler | null = null;
  private unauthorizedHandler: UnauthorizedHandler | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  setTokenRefreshHandler(handler: TokenRefreshHandler | null) {
    this.tokenRefreshHandler = handler;
  }

  setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
    this.unauthorizedHandler = handler;
  }

  private isAuthEndpoint(endpoint: string): boolean {
    return AUTH_ENDPOINTS.has(endpoint.split('?')[0]);
  }

  private async readResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 204 || !contentType.includes('application/json')) {
      return null;
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private getErrorMessage(data: unknown, fallback: string): string {
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message) {
        return message;
      }
    }
    return fallback;
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/user/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          credentials: 'include',
        });

        if (!response.ok) {
          return null;
        }

        const data = await this.readResponse(response);
        if (data && typeof data === 'object' && 'accessToken' in data) {
          const accessToken = (data as { accessToken?: unknown }).accessToken;
          if (typeof accessToken === 'string' && accessToken) {
            this.token = accessToken;
            this.tokenRefreshHandler?.(accessToken);
            return accessToken;
          }
        }
      } catch {
        return null;
      }

      return null;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };

    const response = await fetch(url, config);
    const data = await this.readResponse(response);

    if (!response.ok) {
      const message = this.getErrorMessage(data, `Request failed with status ${response.status}`);

      if (response.status === 401 && !this.isAuthEndpoint(endpoint)) {
        if (retry) {
          const refreshedToken = await this.refreshAccessToken();
          if (refreshedToken) {
            return this.request<T>(endpoint, options, false);
          }
        }

        this.unauthorizedHandler?.();
      }

      throw new ApiError(message, response.status);
    }

    return data as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.uploadWithAuth(endpoint, formData, true);
  }

  private async uploadWithAuth<T>(
    endpoint: string,
    formData: FormData,
    retry = true,
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = new Headers();
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await this.readResponse(response);

    if (!response.ok) {
      const message = this.getErrorMessage(data, 'Upload failed');

      if (response.status === 401 && !this.isAuthEndpoint(endpoint) && retry) {
        const refreshedToken = await this.refreshAccessToken();
        if (refreshedToken) {
          return this.uploadWithAuth<T>(endpoint, formData, false);
        }
        this.unauthorizedHandler?.();
      }

      throw new ApiError(message, response.status);
    }

    return data as T;
  }
}

export const apiClient = new ApiClient();