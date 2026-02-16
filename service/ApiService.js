import * as JwtService from '@/service/JwtService.js';
import axios from 'axios';

/**
 * @description service to call HTTP request via Axios
 * Adapted for React - standalone axios service
 */
class ApiService {
    static axiosInstance;
    static inactivityLimit = 20 * 60 * 1000; // 20 minutos

    /**
     * Initialize the API service
     * Call this in your app's root layout or _app.js
     * @param {string} baseURL - Base URL for API (e.g., process.env.NEXT_PUBLIC_API_URL)
     */
    static init(baseURL = '') {
        ApiService.axiosInstance = axios.create({
            baseURL: baseURL || process.env.NEXT_PUBLIC_API_URL || '',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Interceptor para validar inactividad y agregar token
        ApiService.axiosInstance.interceptors.request.use(
            (config) => {
                ApiService.checkInactivity();
                const token = JwtService.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Interceptor para manejar respuestas y token expirado
        ApiService.axiosInstance.interceptors.response.use(
            (response) => {
                // Actualizar última actividad en respuesta exitosa
                localStorage.setItem('lastActivity', Date.now());
                return response;
            },
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    try {
                        await ApiService.refreshToken();
                        const token = JwtService.getToken();
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return ApiService.axiosInstance(originalRequest);
                    } catch (refreshError) {
                        return Promise.reject(refreshError);
                    }
                }
                return Promise.reject(error);
            }
        );

        // Inicializar última actividad si no existe
        if (typeof window !== 'undefined' && !localStorage.getItem('lastActivity')) {
            localStorage.setItem('lastActivity', Date.now());
        }
    }

    /** --- VALIDAR INACTIVIDAD --- */
    static checkInactivity() {
        if (typeof window === 'undefined') return; // Skip on server side

        const lastActivity = parseInt(localStorage.getItem('lastActivity'), 10);
        const now = Date.now();

        if (now - lastActivity > ApiService.inactivityLimit) {
            JwtService.destroyToken();
            JwtService.destroyRefreshToken();
            localStorage.removeItem('lastActivity');
            window.location.href = '/auth/login';
            throw new Error('Sesión expirada por inactividad');
        }

        // actualizar última actividad
        localStorage.setItem('lastActivity', now);
    }

    static setHeader() {
        const token = JwtService.getToken();
        if (token) {
            ApiService.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        ApiService.axiosInstance.defaults.headers.common['Accept'] = 'application/json';
    }

    static deleteHeader() {
        delete ApiService.axiosInstance.defaults.headers.common['Authorization'];
        ApiService.axiosInstance.defaults.headers.common['Accept'] = 'application/json';
    }

    static async refreshToken() {
        try {
            const refresh_token = JwtService.getRefreshToken();
            if (!refresh_token) throw new Error('No refresh token available');

            const { data } = await ApiService.axiosInstance.post('/auth/token/refresh/', {
                refresh: refresh_token
            });

            if (data.access) {
                JwtService.saveToken(data.access);
                localStorage.setItem('lastActivity', Date.now());
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

    static async query(resource, params) {
        return await ApiService.axiosInstance.get(resource, { params });
    }

    static async get(resource, slug = '') {
        const url = `${resource}${slug ? `/${slug}` : ''}`;
        return await ApiService.axiosInstance.get(url);
    }

    static async post(resource, payload, params = {}) {
        return await ApiService.axiosInstance.post(resource, payload, { params });
    }

    static async update(resource, slug, params) {
        const url = `${resource}/${slug}`;
        return await ApiService.axiosInstance.put(url, params);
    }

    static async put(resource, params) {
        return await ApiService.axiosInstance.put(resource, params);
    }

    static async delete(resource) {
        return await ApiService.axiosInstance.delete(resource);
    }

    static async patch(resource, params) {
        return await ApiService.axiosInstance.patch(resource, params);
    }

    // Métodos para peticiones públicas sin autenticación
    static async queryPublic(resource, params) {
        return await ApiService.axiosInstance.get(resource, { params });
    }

    static async getPublic(resource, slug = '') {
        const url = `${resource}${slug ? `/${slug}` : ''}`;
        return await ApiService.axiosInstance.get(url);
    }

    static async postPublic(resource, payload, params = {}) {
        return await ApiService.axiosInstance.post(resource, payload, { params });
    }
}

export default ApiService;
