import JwtService from '@/service/JwtService';

export interface SessionUser {
    id?: number | string;
    first_name?: string;
    firstName?: string;
    name?: string;
    username?: string;
    email?: string;
}

interface TokenPayload {
    user_id?: number | string;
    id?: number | string;
    sub?: number | string;
    first_name?: string;
    firstName?: string;
    name?: string;
    username?: string;
    email?: string;
    [key: string]: any;
}

export const getSessionUserFromStorage = (): SessionUser | null => {
    if (typeof window === 'undefined') return null;

    const rawUser = localStorage.getItem('user');
    if (rawUser) {
        try {
            return JSON.parse(rawUser) as SessionUser;
        } catch {
            return null;
        }
    }

    const rawAuthStore = localStorage.getItem('auth-store');
    if (!rawAuthStore) return null;

    try {
        const parsedStore = JSON.parse(rawAuthStore);
        return (parsedStore?.state?.user || null) as SessionUser | null;
    } catch {
        return null;
    }
};

export const getSessionUserDisplayName = (fallback = 'usuario'): string => {
    const user = getSessionUserFromStorage();
    if (!user) return fallback;
    return user.first_name || user.firstName || user.name || user.username || user.email || fallback;
};

export const getSessionToken = (): string | null => {
    if (typeof window === 'undefined') return null;

    const isValidCandidate = (value: string | null): value is string => {
        if (!value || value === 'undefined' || value === 'null') return false;
        const parts = value.split('.');
        return parts.length === 3;
    };

    const candidates = [localStorage.getItem('access_token'), JwtService.getToken()].filter(isValidCandidate);

    let selectedToken: string | null = null;
    let selectedExp = -1;

    for (const candidate of candidates) {
        const payload = decodeSessionTokenPayload(candidate);
        if (!payload) continue;

        const tokenType = String(payload?.token_type || payload?.type || '').toLowerCase();
        if (tokenType && tokenType !== 'access') {
            continue;
        }

        const exp = typeof payload?.exp === 'number' ? payload.exp : -1;
        if (exp > selectedExp) {
            selectedExp = exp;
            selectedToken = candidate;
        }
    }

    return selectedToken;
};

export const decodeSessionTokenPayload = (token: string): TokenPayload | null => {
    try {
        return JSON.parse(atob(token.split('.')[1])) as TokenPayload;
    } catch {
        return null;
    }
};

export const getSessionUserDisplayNameFromToken = (token: string | null, fallback = 'usuario'): string => {
    if (!token) return fallback;
    const payload = decodeSessionTokenPayload(token);
    if (!payload) return fallback;
    return payload.first_name || payload.firstName || payload.name || payload.username || payload.email || fallback;
};

const parseUserId = (value: number | string | undefined): number | null => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number') return Number.isInteger(value) ? value : null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

export const getSessionUserIdFromSources = (token: string | null): number | null => {
    const user = getSessionUserFromStorage();
    const userIdFromStorage = parseUserId(user?.id);
    if (userIdFromStorage) return userIdFromStorage;

    if (!token) return null;
    const payload = decodeSessionTokenPayload(token);
    if (!payload) return null;

    return parseUserId(payload.user_id ?? payload.id ?? payload.sub);
};

