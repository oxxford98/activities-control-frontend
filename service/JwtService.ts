const ID_TOKEN_KEY = 'id_token_sgdea';
const ID_REFRESH_TOKEN_KEY = 'id_refresh_token_sgdea';

/**
 * @description get token from localStorage
 */
export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null; // Server-side safety
    return window.localStorage.getItem(ID_TOKEN_KEY);
};

/**
 * @description get refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
    if (typeof window === 'undefined') return null; // Server-side safety
    return window.localStorage.getItem(ID_REFRESH_TOKEN_KEY);
};

/**
 * @description save token into localStorage
 * @param token - JWT token to save
 */
export const saveToken = (token: string): void => {
    if (typeof window === 'undefined') return; // Server-side safety
    window.localStorage.setItem(ID_TOKEN_KEY, token);
};

/**
 * @description save refresh token into localStorage
 * @param token - Refresh token to save
 */
export const saveRefreshToken = (token: string): void => {
    if (typeof window === 'undefined') return; // Server-side safety
    window.localStorage.setItem(ID_REFRESH_TOKEN_KEY, token);
};

/**
 * @description remove token from localStorage
 */
export const destroyToken = (): void => {
    if (typeof window === 'undefined') return; // Server-side safety
    window.localStorage.removeItem(ID_TOKEN_KEY);
};

/**
 * @description remove refresh token from localStorage
 */
export const destroyRefreshToken = (): void => {
    if (typeof window === 'undefined') return; // Server-side safety
    window.localStorage.removeItem(ID_REFRESH_TOKEN_KEY);
};

/**
 * @description Decode JWT payload
 * @param token - JWT token to decode
 * @returns Decoded payload
 */
const decodeToken = (token: string): Record<string, any> | null => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

/**
 * @description check if JWT token is expired
 * @param token - JWT token to validate
 * @returns true if token is expired or invalid
 */
export const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    try {
        const payload = decodeToken(token);
        if (!payload || !payload.exp) return true;
        
        // exp is in seconds
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    } catch (e) {
        return true;
    }
};

/**
 * @description check if user is authenticated
 * @returns true if valid token exists and is not expired
 */
export const isAuthenticated = (): boolean => {
    const token = getToken();
    return token !== null && !isTokenExpired(token);
};

/**
 * @description Get token expiration time in seconds remaining
 * @param token - JWT token
 * @returns Seconds remaining until expiration, or null if invalid
 */
export const getTokenExpiresIn = (token: string | null): number | null => {
    if (!token) return null;
    try {
        const payload = decodeToken(token);
        if (!payload || !payload.exp) return null;
        
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = payload.exp - now;
        return expiresIn > 0 ? expiresIn : null;
    } catch (e) {
        return null;
    }
};

const JwtService = {
    getToken,
    getRefreshToken,
    saveToken,
    saveRefreshToken,
    destroyToken,
    destroyRefreshToken,
    isTokenExpired,
    isAuthenticated,
    getTokenExpiresIn,
};

export default JwtService;
