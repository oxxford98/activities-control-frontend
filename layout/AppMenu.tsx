/* eslint-disable @next/next/no-img-element */

import React, { useContext } from 'react';
import AppMenuitem from './AppMenuitem';
import { LayoutContext } from './context/layoutcontext';
import { MenuProvider } from './context/menucontext';
import { useRouter } from 'next/navigation';
import { AppMenuItem } from '@/types';
import { ROUTES } from '@/lib/routes';
import JwtService from '@/service/JwtService';
import { useAuthStore } from '@/stores/auth';

const AppMenu = () => {
    const { layoutConfig } = useContext(LayoutContext);
    const router = useRouter();

    const handleLogout = async () => {
        // Llamar al endpoint de logout para limpiar cookies httpOnly
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
        
        // Limpiar estado local
        useAuthStore.getState().purgeAuth();
        JwtService.destroyToken();
        JwtService.destroyRefreshToken();
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('lastActivity');
        router.replace(ROUTES.AUTH.LOGIN);
    };

    const model: AppMenuItem[] = [
        {
            label: 'Home',
            items: [
                {
                    label: 'Hoy',
                    icon: 'pi pi-calendar',
                    to: ROUTES.HOME
                },
                {
                    label: 'Actividades',
                    icon: 'pi pi-fw pi-list',
                    to: ROUTES.ACTIVITIES
                },
                {
                    label: 'Cerrar sesión',
                    icon: 'pi pi-fw pi-sign-out',
                    command: handleLogout
                }
            ]
        },
    ];

    return (
        <MenuProvider>
            <ul className="layout-menu">
                {model.map((item, i) => {
                    return !item?.seperator ? <AppMenuitem item={item} root={true} index={i} key={item.label} /> : <li className="menu-separator"></li>;
                })}
            </ul>
        </MenuProvider>
    );
};

export default AppMenu;
