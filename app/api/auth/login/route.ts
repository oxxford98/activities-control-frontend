import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        // Realizar login contra el backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { message: errorData.message || 'Error en login' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const accessToken = data?.access || data?.access_token;
        const refreshToken = data?.refresh || data?.refresh_token;
        const userData = data?.user;

        if (!accessToken) {
            return NextResponse.json(
                { message: 'Respuesta de login inválida' },
                { status: 500 }
            );
        }

        // Crear respuesta con tokens en cookies httpOnly
        const res = NextResponse.json({
            message: 'Login exitoso',
            user: userData,
            access: accessToken,
            access_token: accessToken,
            refresh: refreshToken,
            refresh_token: refreshToken
        });

        // Cookie para access token (httpOnly, secure, 1 hora)
        res.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 // 1 hora
        });

        // Cookie para refresh token (httpOnly, secure, 7 días)
        if (refreshToken) {
            res.cookies.set('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 días
            });
        }

        return res;
    } catch (error: any) {
        console.error('API auth/login error:', error);
        return NextResponse.json(
            { message: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
