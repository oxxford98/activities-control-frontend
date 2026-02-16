import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import ApiService from '@/service/ApiService';
import * as JwtService from '@/service/JwtService';

/**
 * User type definition
 */
interface User {
    id?: string | number;
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    [key: string]: any;
}

/**
 * Auth store state and actions
 */
interface AuthState {
    // State
    errors: Record<string, any>;
    user: User;
    isAuthenticated: boolean;
    accessKey: string;

    // Actions
    setAuth: (data: { user: User; access?: string }) => void;
    setError: (error: Record<string, any>) => void;
    purgeAuth: () => void;
    logout: () => void;
    verifyToken: () => void;
    verifyAuth: () => Promise<User | void>;
    getApiToken: (data: {
        user: User;
        access: string;
        refresh: string;
        trd?: any;
    }) => void;
    validatePermission: (permission: string) => boolean;
}

/**
 * Auth Store with Zustand
 * Replaces Pinia store for authentication in React/Next.js
 */
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // =========================
            // STATE
            // =========================
            errors: {},
            user: {},
            isAuthenticated: false,
            accessKey: '',

            // =========================
            // ACTIONS
            // =========================

            /**
             * Set authentication state with user data
             */
            setAuth: (data: { user: User; access?: string }) => {
                set({
                    isAuthenticated: true,
                    user: data.user,
                    errors: {},
                    accessKey: data.access || '',
                });
            },

            /**
             * Set error state
             */
            setError: (error: Record<string, any>) => {
                set({ errors: error });
            },

            /**
             * Clear authentication and user data
             */
            purgeAuth: () => {
                set({
                    isAuthenticated: false,
                    user: {},
                    errors: {},
                    accessKey: '',
                });

                JwtService.destroyToken();
                JwtService.destroyRefreshToken();
            },

            /**
             * Logout user and clear auth state
             */
            logout: () => {
                get().purgeAuth();
            },

            /**
             * Verify if token exists and is valid
             */
            verifyToken: () => {
                if (!JwtService.getToken()) {
                    get().purgeAuth();
                }
            },

            /**
             * Verify authentication by fetching user data from server
             */
            verifyAuth: async (): Promise<User | void> => {
                return new Promise((resolve) => {
                    const token = JwtService.getToken();

                    if (!token) {
                        get().purgeAuth();
                        return resolve();
                    }

                    ApiService.setHeader();

                    ApiService.get<User>('/auth/me')
                        .then(({ data }) => {
                            if (data?.id) {
                                const dataFlow = {
                                    user: data,
                                    access: JwtService.getToken() || '',
                                };
                                get().setAuth(dataFlow);
                                resolve(data);
                            } else {
                                get().purgeAuth();
                                resolve();
                            }
                        })
                        .catch(() => {
                            get().purgeAuth();
                            resolve();
                        });
                });
            },

            /**
             * Save API tokens and user data from login response
             */
            getApiToken: (data: {
                user: User;
                access: string;
                refresh: string;
                trd?: any;
            }) => {
                if (data.trd) {
                    localStorage.setItem('trd', JSON.stringify(data.trd));
                }

                JwtService.saveToken(data.access);
                JwtService.saveRefreshToken(data.refresh);

                get().setAuth(data);
            },

            /**
             * Validate if user has a specific permission
             * @param permission - Permission string to check
             * @returns true if user has permission
             */
            validatePermission: (permission: string): boolean => {
                const state = get();
                const permissions = state.user?.permissions || [];

                // Check for admin or staff permissions
                if (
                    Array.isArray(permissions) &&
                    (permissions.includes('all') || permissions.includes('is_staff'))
                ) {
                    return true;
                }

                return (
                    Array.isArray(permissions) && permissions.includes(permission)
                );
            },
        }),
        {
            // =========================
            // PERSISTENCE CONFIG
            // =========================
            name: 'auth-store', // nombre de la clave en localStorage
            partialize: (state) =>
                ({
                    user: state.user,
                    isAuthenticated: state.isAuthenticated,
                } as Pick<AuthState, 'user' | 'isAuthenticated'>),
        }
    )
);

/**
 * Hook para acceder al estado de autenticación
 * @example
 * const { user, isAuthenticated, logout } = useAuthStore();
 */
export const useAuth = () => {
    const {
        user,
        isAuthenticated,
        logout,
        setAuth,
        purgeAuth,
        verifyAuth,
        getApiToken,
        validatePermission,
    } = useAuthStore();

    return {
        user,
        isAuthenticated,
        logout,
        setAuth,
        purgeAuth,
        verifyAuth,
        getApiToken,
        validatePermission,
    };
};

export default useAuthStore;
