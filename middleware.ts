import { NextRequest, NextResponse } from 'next/server';
import ApiService from './service/ApiService';
import JwtService from './service/JwtService';

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


const isValidToken = (token: string | null | undefined): boolean => {
    if (!token || token === 'undefined' || token === 'null') return false;

    // Validar formato JWT (3 partes separadas por puntos)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Validar que no esté expirado
    return !JwtService.isTokenExpired(token);
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
        const refreshToken = request.cookies.get('refresh_token')?.value;
        const accessTokenValid = isValidToken(accessToken);
        const refreshTokenValid = isValidToken(refreshToken);

        debugLog('Ruta protegida', {
            pathname,
            hasAccessToken: !!accessToken,
            accessTokenValid,
            hasRefreshToken: !!refreshToken,
            refreshTokenValid
        });

        // Si el access token no es válido pero hay refresh token válido, 
        // dejar pasar. El cliente (ApiService) se encargará del refresh automático.
        if (!accessTokenValid && refreshTokenValid) {
            debugLog('Access token inválido pero refresh token válido, dejando pasar', { pathname });
            ApiService.refreshToken().catch((error) => {
                debugLog('Error al refrescar token en middleware:', error);
            });
            return NextResponse.next();
        }

        // Si no hay access token válido y tampoco hay refresh token válido, redirigir a login
        if (!accessTokenValid && !refreshTokenValid) {
            const loginUrl = new URL('/auth/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            debugLog('Redirigiendo a login por falta de tokens válidos', { pathname });
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
