'use client';
import { useEffect } from 'react';
import { LayoutProvider } from '../layout/context/layoutcontext';
import { PrimeReactProvider } from 'primereact/api';
import ApiService from '@/service/ApiService';
import { useAuth } from '@/stores/auth';
import 'primereact/resources/primereact.css';
import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
import '../styles/layout/layout.scss';

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    const { verifyAuth } = useAuth();

    useEffect(() => {
        // Inicializar API Service globalmente
        ApiService.init({
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            inactivityLimit: 30 * 60 * 1000, // 30 minutos
        });

        // Verificar si el usuario está autenticado
        verifyAuth();
    }, [verifyAuth]);
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                <link id="theme-css" href={`/themes/lara-light-indigo/theme.css`} rel="stylesheet"></link>
            </head>
            <body>
                <PrimeReactProvider>
                    <LayoutProvider>{children}</LayoutProvider>
                </PrimeReactProvider>
            </body>
        </html>
    );
}
