const ID_TOKEN_KEY = 'id_token_sgdea';
const ID_REFRESH_TOKEN_KEY = 'id_refresh_token_sgdea';

/**
 * @description get token from localStorage
 */
export const getToken = () => {
    if (typeof window === 'undefined') return null; // Server-side safety
    return window.localStorage.getItem(ID_TOKEN_KEY);
};

/**
 * @description get refresh token from localStorage
 */
export const getRefreshToken = () => {
    if (typeof window === 'undefined') return null; // Server-side safety
    return window.localStorage.getItem(ID_REFRESH_TOKEN_KEY);
};

/**
 * @description save token into localStorage
 * @param {string} token - JWT token to save
 */
export const saveToken = (token) => {
    if (typeof window === 'undefined') return; // Server-side safety
    window.localStorage.setItem(ID_TOKEN_KEY, token);
};

/**
 * @description save refresh token into localStorage
 * @param {string} token - Refresh token to save
 */
export const saveRefreshToken = (token) => {
    if (typeof window === 'undefined') return; // Server-side safety
    window.localStorage.setItem(ID_REFRESH_TOKEN_KEY, token);
};

/**
 * @description remove token from localStorage
 */
export const destroyToken = () => {
    if (typeof window === 'undefined') return; // Server-side safety
    window.localStorage.removeItem(ID_TOKEN_KEY);
};

/**
 * @description remove refresh token from localStorage
 */
export const destroyRefreshToken = () => {
    if (typeof window === 'undefined') return; // Server-side safety
    window.localStorage.removeItem(ID_REFRESH_TOKEN_KEY);
};

/**
 * @description check if JWT token is expired
 * @param {string} token - JWT token to validate
 * @returns {boolean} true if token is expired or invalid
 */
export const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // exp is in seconds
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    } catch (e) {
        return true;
    }
};

/**
 * @description check if user is authenticated
 * @returns {boolean} true if valid token exists and is not expired
 */
export const isAuthenticated = () => {
    const token = getToken();
    return token && !isTokenExpired(token);
};

export default {
    getToken,
    getRefreshToken,
    saveToken,
    saveRefreshToken,
    destroyToken,
    destroyRefreshToken,
    isTokenExpired,
    isAuthenticated
};
