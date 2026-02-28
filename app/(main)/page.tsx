/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { decodeSessionTokenPayload, getSessionToken, getSessionUserDisplayName, getSessionUserFromStorage } from '@/lib/sessionUser';

interface TokenPayload {
    first_name?: string;
    firstName?: string;
    name?: string;
    username?: string;
    email?: string;
    [key: string]: any;
}

const Dashboard = () => {
    const [displayName, setDisplayName] = useState('usuario');

    useEffect(() => {
        const token = getSessionToken();
        const tokenPayload = (token ? decodeSessionTokenPayload(token) : null) as TokenPayload | null;

        const displayNameFromToken = tokenPayload?.first_name || tokenPayload?.firstName || tokenPayload?.name || tokenPayload?.username || tokenPayload?.email;

        const fallbackName = getSessionUserDisplayName('usuario');
        setDisplayName(displayNameFromToken || fallbackName);

        const sessionUser = getSessionUserFromStorage();
        console.log('Usuario logeado (storage):', sessionUser);
        console.log('Usuario logeado (token payload):', tokenPayload);
    }, []);

    return (
        <Card title="Dashboard">
            <div>{`Hola ${displayName} ¿qué vamos a hacer hoy?`}</div>
        </Card>
    );
};

export default Dashboard;
