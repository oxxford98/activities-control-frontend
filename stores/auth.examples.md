# Auth Store Examples - Zustand

Ejemplos de uso del store de autenticación con Zustand en React/Next.js

## 1. Componente de Login

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/stores/auth';
import ApiService from '@/service/ApiService';

export default function LoginPage() {
    const { getApiToken } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const response = await ApiService.post('/auth/login/', {
                email,
                password,
            });

            getApiToken({
                user: response.data.user,
                access: response.data.access,
                refresh: response.data.refresh,
                trd: response.data.trd,
            });

            window.location.href = '/dashboard';
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <h1>Login</h1>
            {errorMsg && <p className="error">{errorMsg}</p>}
            <form onSubmit={handleLogin}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
        </div>
    );
}
```

## 2. Componente Protegido

```typescript
'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/stores/auth';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
    const { isAuthenticated, verifyAuth, validatePermission } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            verifyAuth().catch(() => {
                window.location.href = '/auth/login';
            });
        }
    }, [isAuthenticated, verifyAuth]);

    if (requiredPermission && !validatePermission(requiredPermission)) {
        return <div>No tienes permiso para acceder a esta página</div>;
    }

    if (!isAuthenticated) {
        return <div>Loading...</div>;
    }

    return <>{children}</>;
}
```

## 3. Componente de Perfil/Logout

```typescript
'use client';

import { useAuth } from '@/stores/auth';

export default function UserProfile() {
    const { user, isAuthenticated, logout } = useAuth();

    if (!isAuthenticated) {
        return <p>No hay usuario autenticado</p>;
    }

    return (
        <div>
            <h2>Bienvenido, {user?.first_name || user?.username}!</h2>
            <p>Email: {user?.email}</p>
            <button onClick={logout}>Logout</button>
        </div>
    );
}
```

## 4. Inicializar en Layout Root

```typescript
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/stores/auth';
import ApiService from '@/service/ApiService';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const { verifyAuth } = useAuth();

    useEffect(() => {
        ApiService.init({
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            inactivityLimit: 30 * 60 * 1000,
        });

        verifyAuth();
    }, [verifyAuth]);

    return <>{children}</>;
}
```

## 5. Validar Permisos

```typescript
'use client';

import { useAuth } from '@/stores/auth';

export default function AdminPanel() {
    const { validatePermission, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <p>Debes estar autenticado</p>;
    }

    if (!validatePermission('delete_users')) {
        return <p>No tienes permiso para ver esta sección</p>;
    }

    return <div>Admin Panel</div>;
}
```

## 6. Hook Personalizado

```typescript
'use client';

import { useAuth } from '@/stores/auth';

export function useUser() {
    const { user, isAuthenticated } = useAuth();

    return {
        user,
        isAuthenticated,
        userName: user?.first_name || user?.username,
        userEmail: user?.email,
    };
}
```

## 7. Acceso Directo al Store

```typescript
import { useAuthStore } from '@/stores/auth';

function MyComponent() {
    const store = useAuthStore();

    return (
        <div>
            <p>Username: {store.user?.username}</p>
            <button onClick={store.logout}>Logout</button>
        </div>
    );
}
```

## Comparación: Pinia vs Zustand

| Pinia (Vue) | Zustand (React) |
|-----------|-----------|
| `useAuthStore()` | `useAuth()` |
| `authStore.logout()` | `logout()` |
| `authStore.user` | `user` |
| `authStore.$reset()` | N/A |

## Acciones Disponibles

- `setAuth(data)` - Establecer autenticación
- `setError(error)` - Establecer errores
- `purgeAuth()` - Limpiar autenticación
- `logout()` - Cerrar sesión
- `verifyToken()` - Verificar si existe token
- `verifyAuth()` - Verificar con servidor
- `getApiToken(data)` - Guardar tokens
- `validatePermission(permission)` - Validar permiso

## Propiedades del Store

- `user` - Datos del usuario
- `isAuthenticated` - Si está autenticado
- `errors` - Errores
- `accessKey` - Token actual
