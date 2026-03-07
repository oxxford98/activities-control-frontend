import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const refreshToken = request.cookies.get('refresh_token')?.value;

        if (!refreshToken) {
            return NextResponse.json(
                { message: 'Refresh token no encontrado' },
                { status: 401 }
            );
        }

        // Realizar refresh contra el backend usando el endpoint correcto
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (!response.ok) {
            // Si el refresh falla, eliminar las cookies
            const res = NextResponse.json(
                { message: 'Refresh token inválido' },
                { status: 401 }
            );

            res.cookies.set('access_token', '', { maxAge: 0 });
            res.cookies.set('refresh_token', '', { maxAge: 0 });

            return res;
        }

        const data = await response.json();
        const newAccessToken = data?.access || data?.access_token;

        if (!newAccessToken) {
            return NextResponse.json(
                { message: 'Respuesta de refresh inválida' },
                { status: 500 }
            );
        }

        // Actualizar cookie de access token
        const res = NextResponse.json({
            message: 'Token refrescado exitosamente'
        });

        res.cookies.set('access_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 // 1 hora
        });

        return res;
    } catch (error: any) {
        console.error('API auth/refresh error:', error);
        return NextResponse.json(
            { message: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
