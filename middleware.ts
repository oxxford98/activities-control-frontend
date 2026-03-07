import { NextRequest, NextResponse } from 'next/server';
import JwtService from './service/JwtService';
import ApiService from './service/ApiService';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

// Rutas privadas que requieren autenticación
const PROTECTED_ROUTES = ['/', '/activities', '/activities/crear'];

const decodeTokenPayload = (token: string): Record<string, any> | null => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const isTokenExpired = (token: string): boolean => {
    try {
        const payload = decodeTokenPayload(token);
        if (!payload || !payload.exp) return true;

        // exp is in seconds
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    } catch (e) {
        return true;
    }
};

const isValidToken = (token: string | null | undefined): boolean => {
    if (!token || token === 'undefined' || token === 'null') return false;

    // Validar formato JWT (3 partes separadas por puntos)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Validar que no esté expirado
    return !isTokenExpired(token);
};

const debugLog = (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('[middleware]', ...args);
    }
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const accessToken = request.cookies.get('access_token')?.value;

    // Si el usuario está autenticado y trata de acceder a login/register, redirigir al home
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        if (isValidToken(accessToken)) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Verificar si es una ruta protegida
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));

    if (isProtectedRoute) {
        const refreshToken = JwtService.getRefreshToken()
        const accessTokenValid = isValidToken(accessToken);
        const hasRefreshToken = !!refreshToken;

        debugLog('Ruta protegida', {
            pathname,
            hasAccessToken: !!accessToken,
            accessTokenValid,
            hasRefreshToken
        });

        // Si el access token no es valido pero hay refresh token, deja pasar.
        // El cliente (ApiService.refreshToken) se encarga del refresh real.
        if (!accessTokenValid && hasRefreshToken) {
            ApiService.refreshToken();
        }

        // Sin access valido y sin refresh token: redirigir a login.
        if (!accessTokenValid) {
            const loginUrl = new URL('/auth/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            debugLog('Redirigiendo a login por falta de tokens validos', { pathname });
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Coincidir con todas las rutas excepto:
         * - api (rutas API)
         * - _next/static (archivos estáticos)
         * - _next/image (archivos de optimización de imágenes)
         * - favicon.ico (favicon)
         * - public (archivos públicos)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'
    ]
};
