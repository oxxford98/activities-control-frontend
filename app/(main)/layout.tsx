import { Metadata } from 'next';
import Layout from '../../layout/layout';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const viewport = { initialScale: 1, width: 'device-width' };

export const metadata: Metadata = {
    title: 'PlanificaUni',
    description: 'App para planificación de actividades académicas',
    robots: { index: false, follow: false },
    openGraph: {
        type: 'website',
        title: 'PlanificaUni',
        url: 'https://planificauni.tech/',
        description: 'App para planificación de actividades académicas',
        images: ['https://planificauni.tech/static/social/planificauni.png'],
        ttl: 604800
    },
    icons: {
        icon: '/favicon.ico'
    }
};

export default function AppLayout({ children }: AppLayoutProps) {
    return <Layout>{children}</Layout>;
}
