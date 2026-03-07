import ApiService from '@/service/ApiService';
import JwtService from '@/service/JwtService';
import { ApiError } from 'next/dist/server/api-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const refreshToken = body?.refresh || request.cookies.get('refresh_token')?.value || JwtService.getRefreshToken();

        if (!refreshToken) {
            return NextResponse.json(
                { message: 'Refresh token no proporcionado' },
                { status: 400 }
            );
        }

        // Llamar al backend para refrescar el token
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/token/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { message: errorData.message || 'Error al refrescar el token' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const accessToken = data?.access || data?.access_token;
        const newRefreshToken = data?.refresh || data?.refresh_token;

        if (!accessToken) {
            return NextResponse.json(
                { message: 'Respuesta de refresh inválida' },
                { status: 500 }
            );
        }

        // Crear respuesta con el nuevo access token
        const res = NextResponse.json({
            message: 'Token refrescado exitosamente',
            access: accessToken,
            access_token: accessToken,
            refresh: newRefreshToken || refreshToken,
            refresh_token: newRefreshToken || refreshToken
        });

        // Actualizar cookie del access token
        res.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 // 1 hora
        });

        // Si el backend devuelve un nuevo refresh token, actualizarlo también
        if (newRefreshToken) {
            res.cookies.set('refresh_token', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 días
            });
        }

        return res;
    } catch (error: any) {
        console.error('API api/auth/token/refresh error:', error);
        return NextResponse.json(
            { message: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
