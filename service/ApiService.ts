import * as JwtService from '@/service/JwtService';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Response types for token refresh
 */
interface TokenResponse {
    access: string;
    refresh?: string;
    [key: string]: any;
}

/**
 * Generic API response wrapper
 */
interface ApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    [key: string]: any;
}

/**
 * API Service configuration
 */
interface ApiServiceConfig {
    baseURL?: string;
    inactivityLimit?: number;
}

/**
 * @description service to call HTTP request via Axios
 * Adapted for React/Next.js with TypeScript support
 */
class ApiService {
    private static axiosInstance: AxiosInstance;
    private static inactivityLimit: number = 20 * 60 * 1000; // 20 minutos

    /**
     * Initialize the API service
     * Call this in your app's root layout or component
     * @param config - Configuration object with baseURL and inactivityLimit
     * 
     * @example
     * ApiService.init({
     *   baseURL: process.env.NEXT_PUBLIC_API_URL,
     *   inactivityLimit: 30 * 60 * 1000 // 30 minutes
     * });
     */
    static init(config: ApiServiceConfig = {}): void {
        const baseURL = config.baseURL || process.env.NEXT_PUBLIC_API_URL || '';
        const inactivityLimit = config.inactivityLimit || 20 * 60 * 1000;

        ApiService.inactivityLimit = inactivityLimit;

        ApiService.axiosInstance = axios.create({
            baseURL,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        // Request Interceptor: validate inactivity and add token
        ApiService.axiosInstance.interceptors.request.use(
            (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
                ApiService.checkInactivity();
                const token = JwtService.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error: any) => Promise.reject(error)
        );

        // Response Interceptor: handle token expiration
        ApiService.axiosInstance.interceptors.response.use(
            (response: AxiosResponse): AxiosResponse => {
                // Update last activity on successful response
                ApiService.updateLastActivity();
                return response;
            },
            async (error: any) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    try {
                        await ApiService.refreshToken();
                        const token = JwtService.getToken();
                        if (token) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return ApiService.axiosInstance(originalRequest);
                    } catch (refreshError) {
                        return Promise.reject(refreshError);
                    }
                }
                return Promise.reject(error);
            }
        );

        // Initialize last activity if not exists
        if (typeof window !== 'undefined' && !localStorage.getItem('lastActivity')) {
            localStorage.setItem('lastActivity', Date.now().toString());
        }
    }

    /**
     * Update last activity timestamp in localStorage
     */
    private static updateLastActivity(): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('lastActivity', Date.now().toString());
        }
    }

    /**
     * Check user inactivity and redirect to login if timeout exceeded
     */
    static checkInactivity(): void {
        if (typeof window === 'undefined') return; // Skip on server side

        const lastActivityStr = localStorage.getItem('lastActivity');
        if (!lastActivityStr) {
            localStorage.setItem('lastActivity', Date.now().toString());
            return;
        }

        const lastActivity = parseInt(lastActivityStr, 10);
        const now = Date.now();

        if (now - lastActivity > ApiService.inactivityLimit) {
            JwtService.destroyToken();
            JwtService.destroyRefreshToken();
            localStorage.removeItem('lastActivity');
            window.location.href = '/auth/login';
            throw new Error('Sesión expirada por inactividad');
        }

        // Update last activity
        ApiService.updateLastActivity();
    }

    /**
     * Set authorization header with current token
     */
    static setHeader(): void {
        const token = JwtService.getToken();
        if (token) {
            ApiService.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        ApiService.axiosInstance.defaults.headers.common['Accept'] = 'application/json';
    }

    /**
     * Remove authorization header
     */
    static deleteHeader(): void {
        delete ApiService.axiosInstance.defaults.headers.common['Authorization'];
        ApiService.axiosInstance.defaults.headers.common['Accept'] = 'application/json';
    }

    /**
     * Refresh JWT token using refresh token
     */
    static async refreshToken(): Promise<TokenResponse> {
        try {
            const refresh_token = JwtService.getRefreshToken();
            if (!refresh_token) {
                throw new Error('No refresh token available');
            }

            const { data } = await ApiService.axiosInstance.post<TokenResponse>(
                '/auth/token/refresh/',
                { refresh: refresh_token }
            );

            if (data.access) {
                JwtService.saveToken(data.access);
                if (data.refresh) {
                    JwtService.saveRefreshToken(data.refresh);
                }
                ApiService.updateLastActivity();
                return data;
            } else {
                throw new Error('Failed to refresh token');
            }
        } catch (error) {
            console.error('No se pudo refrescar el token:', error);
            JwtService.destroyToken();
            JwtService.destroyRefreshToken();
            localStorage.removeItem('lastActivity');
            if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
            }
            throw error;
        }
    }

    /**
     * GET request with query parameters
     */
    static async query<T = any>(resource: string, params?: Record<string, any>): Promise<AxiosResponse<T>> {
        return await ApiService.axiosInstance.get<T>(resource, { params });
    }

    /**
     * GET request with optional slug
     */
    static async get<T = any>(resource: string, slug: string = ''): Promise<AxiosResponse<T>> {
        const url = `${resource}${slug ? `/${slug}` : ''}`;
        return await ApiService.axiosInstance.get<T>(url);
    }

    /**
     * POST request
     */
    static async post<T = any, D = any>(
        resource: string,
        payload: D,
        params?: Record<string, any>
    ): Promise<AxiosResponse<T>> {
        return await ApiService.axiosInstance.post<T>(resource, payload, { params });
    }

    /**
     * PUT request for updating specific resource by slug
     */
    static async update<T = any, D = any>(
        resource: string,
        slug: string,
        params: D
    ): Promise<AxiosResponse<T>> {
        const url = `${resource}/${slug}`;
        return await ApiService.axiosInstance.put<T>(url, params);
    }

    /**
     * PUT request
     */
    static async put<T = any, D = any>(
        resource: string,
        params: D
    ): Promise<AxiosResponse<T>> {
        return await ApiService.axiosInstance.put<T>(resource, params);
    }

    /**
     * DELETE request
     */
    static async delete<T = any>(resource: string): Promise<AxiosResponse<T>> {
        return await ApiService.axiosInstance.delete<T>(resource);
    }

    /**
     * PATCH request
     */
    static async patch<T = any, D = any>(
        resource: string,
        params: D
    ): Promise<AxiosResponse<T>> {
        return await ApiService.axiosInstance.patch<T>(resource, params);
    }

    // Public requests without authentication

    /**
     * Public GET request with query parameters
     */
    static async queryPublic<T = any>(
        resource: string,
        params?: Record<string, any>
    ): Promise<AxiosResponse<T>> {
        return await ApiService.axiosInstance.get<T>(resource, { params });
    }

    /**
     * Public GET request with optional slug
     */
    static async getPublic<T = any>(resource: string, slug: string = ''): Promise<AxiosResponse<T>> {
        const url = `${resource}${slug ? `/${slug}` : ''}`;
        return await ApiService.axiosInstance.get<T>(url);
    }

    /**
     * Public POST request
     */
    static async postPublic<T = any, D = any>(
        resource: string,
        payload: D,
        params?: Record<string, any>
    ): Promise<AxiosResponse<T>> {
        return await ApiService.axiosInstance.post<T>(resource, payload, { params });
    }
}

export default ApiService;
