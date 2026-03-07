import { NextRequest, NextResponse } from 'next/server';

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

        // Si no hay access token, intentar refrescar
        if (!accessToken && refreshToken) {
            try {
                // Intentar refrescar el token
                const refreshResponse = await fetch(
                    new URL('/api/auth/refresh', request.url),
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include'
                    }
                );

                if (refreshResponse.ok) {
                    // Si el refresh fue exitoso, hace una nueva request con las cookies actualizadas
                    const cookieHeader = refreshResponse.headers.get('set-cookie');
                    const response = NextResponse.next();
                    if (cookieHeader) {
                        response.headers.set('set-cookie', cookieHeader);
                    }
                    return response;
                }
            } catch (error) {
                console.error('Error al refrescar token:', error);
            }

            // Si el refresh falla, redirigir a login
            const loginUrl = new URL('/auth/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Validar que exista un token válido
        if (!isValidToken(accessToken)) {
            const loginUrl = new URL('/auth/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
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
