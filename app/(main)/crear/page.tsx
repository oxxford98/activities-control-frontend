'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import JwtService from '@/service/JwtService';
import { ROUTES } from '@/lib/routes';

interface SessionUser {
    id?: number | string;
    first_name?: string;
    username?: string;
    email?: string;
}

interface TokenPayload {
    user_id?: number | string;
    id?: number | string;
    sub?: number | string;
    [key: string]: any;
}

interface CreateActivityPayload {
    title: string;
    type_activity: string;
    description: string | null;
    subject: string;
    event_date: string | null;
    deadline: string | null;
    grade: number | null;
    user: number;
}

const ACTIVITY_TYPE_OPTIONS = [
    { label: 'Examen', value: 'Examen' },
    { label: 'Quiz', value: 'Quiz' },
    { label: 'Taller', value: 'Taller' },
    { label: 'Proyecto', value: 'Proyecto' },
    { label: 'Otro', value: 'Otro' }
];

const formatApiError = (errorData: any): string => {
    if (!errorData) return 'No se pudo crear la actividad.';

    if (typeof errorData === 'string') {
        return errorData;
    }

    if (typeof errorData.message === 'string' && errorData.message.trim()) {
        return errorData.message;
    }

    if (typeof errorData.detail === 'string' && errorData.detail.trim()) {
        return errorData.detail;
    }

    if (typeof errorData === 'object') {
        const entries = Object.entries(errorData)
            .map(([field, value]) => {
                if (Array.isArray(value)) {
                    return `${field}: ${value.join(', ')}`;
                }
                if (typeof value === 'string') {
                    return `${field}: ${value}`;
                }
                return null;
            })
            .filter((entry): entry is string => Boolean(entry));

        if (entries.length > 0) {
            return entries.join(' | ');
        }
    }

    return 'No se pudo crear la actividad.';
};

const getUserFromStorage = (): SessionUser | null => {
    if (typeof window === 'undefined') return null;

    const rawUser = localStorage.getItem('user');
    if (rawUser) {
        try {
            return JSON.parse(rawUser) as SessionUser;
        } catch {
            return null;
        }
    }

    const rawAuthStore = localStorage.getItem('auth-store');
    if (!rawAuthStore) return null;

    try {
        const parsedStore = JSON.parse(rawAuthStore);
        return (parsedStore?.state?.user || null) as SessionUser | null;
    } catch {
        return null;
    }
};

const getDisplayName = (user: SessionUser | null): string => {
    if (!user) return 'usuario';
    return user.first_name || user.username || user.email || 'usuario';
};

const decodeTokenPayload = (token: string): TokenPayload | null => {
    try {
        return JSON.parse(atob(token.split('.')[1])) as TokenPayload;
    } catch {
        return null;
    }
};

const getValidToken = (): string | null => {
    const rawToken = localStorage.getItem('access_token') || JwtService.getToken();
    if (!rawToken) return null;
    if (rawToken === 'undefined' || rawToken === 'null') return null;
    return rawToken;
};

const CrearPage = () => {
    const router = useRouter();
    const [titulo, setTitulo] = useState('');
    const [typeActivity, setTypeActivity] = useState('');
    const [subject, setSubject] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [deadline, setDeadline] = useState('');
    const [grade, setGrade] = useState('');
    const [displayName, setDisplayName] = useState('usuario');
    const [loggedUserId, setLoggedUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const activityCreateEndpoint = process.env.NEXT_PUBLIC_ACTIVITY_CREATE_ENDPOINT || '/activities/';
    const activityCreateUrl = activityCreateEndpoint.startsWith('http') ? activityCreateEndpoint : `${process.env.NEXT_PUBLIC_API_URL}${activityCreateEndpoint}`;

    const toIsoOrNull = (value: string): string | null => {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };

    const parseUserId = (value: number | string | undefined): number | null => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'number') return Number.isInteger(value) ? value : null;
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
    };

    useEffect(() => {
        const bootstrapSession = async () => {
            const token = getValidToken();

            if (!token) {
                router.replace(ROUTES.AUTH.LOGIN);
                return;
            }

            const storedUser = getUserFromStorage();
            let userId = parseUserId(storedUser?.id);
            let resolvedUser = storedUser;

            if (!userId) {
                const payload = decodeTokenPayload(token);
                userId = parseUserId(payload?.user_id ?? payload?.id ?? payload?.sub);
            }

            if (!userId) {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const me = await response.json();
                        userId = parseUserId(me?.id);
                        if (userId) {
                            resolvedUser = me as SessionUser;
                            localStorage.setItem('user', JSON.stringify(me));
                        }
                    }
                } catch {
                }
            }

            if (!userId) {
                router.replace(ROUTES.AUTH.LOGIN);
                return;
            }

            setDisplayName(getDisplayName(resolvedUser));
            setLoggedUserId(userId);
            setIsCheckingAuth(false);
        };

        bootstrapSession();
    }, [router]);

    const handleCreateActivity = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!titulo.trim() || !typeActivity.trim() || !subject.trim()) {
            setError('Completa los campos requeridos: título, tipo de actividad y materia.');
            return;
        }

        if (!loggedUserId) {
            setError('No se pudo identificar al usuario logeado.');
            return;
        }

        const token = getValidToken();
        if (!token) {
            router.replace(ROUTES.AUTH.LOGIN);
            return;
        }

        const payload: CreateActivityPayload = {
            title: titulo.trim(),
            type_activity: typeActivity.trim(),
            description: descripcion.trim() ? descripcion.trim() : null,
            subject: subject.trim(),
            event_date: toIsoOrNull(eventDate),
            deadline: toIsoOrNull(deadline),
            grade: grade.trim() ? Number.parseFloat(grade) : null,
            user: loggedUserId
        };

        if (payload.grade !== null && Number.isNaN(payload.grade)) {
            setError('La nota debe ser un número válido.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(activityCreateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(formatApiError(errorData));
            }

            setSuccess('Actividad creada correctamente.');
            setTitulo('');
            setTypeActivity('');
            setSubject('');
            setDescripcion('');
            setEventDate('');
            setDeadline('');
            setGrade('');
        } catch (err: any) {
            setError(err.message || 'Error al crear la actividad.');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) {
        return null;
    }

    return (
        <Card title="Crear actividad">
            <form className="flex flex-column gap-4" onSubmit={handleCreateActivity}>
                <p className="m-0 text-600">
                    Bienvenido, <span className="font-semibold text-900">{displayName}</span>
                </p>

                <div className="flex flex-column gap-2">
                    <label htmlFor="titulo" className="font-medium">
                        Título *
                    </label>
                    <InputText id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Escribe un título" />
                </div>

                <div className="flex flex-column gap-2">
                    <label htmlFor="typeActivity" className="font-medium">
                        Tipo de actividad *
                    </label>
                    <Dropdown
                        id="typeActivity"
                        value={typeActivity}
                        options={ACTIVITY_TYPE_OPTIONS}
                        onChange={(e) => setTypeActivity(e.value)}
                        placeholder="Selecciona un tipo"
                        className="w-full"
                    />
                </div>

                <div className="flex flex-column gap-2">
                    <label htmlFor="subject" className="font-medium">
                        Materia *
                    </label>
                    <InputText id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ejemplo: Matemáticas" />
                </div>

                <div className="flex flex-column gap-2">
                    <label htmlFor="descripcion" className="font-medium">
                        Descripción
                    </label>
                    <InputTextarea
                        id="descripcion"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows={5}
                        placeholder="Describe la actividad"
                    />
                </div>

                <div className="grid">
                    <div className="col-12 md:col-6">
                        <div className="flex flex-column gap-2">
                            <label htmlFor="eventDate" className="font-medium">
                                Fecha del evento
                            </label>
                            <InputText id="eventDate" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="col-12 md:col-6">
                        <div className="flex flex-column gap-2">
                            <label htmlFor="deadline" className="font-medium">
                                Fecha límite
                            </label>
                            <InputText id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-column gap-2">
                    <label htmlFor="grade" className="font-medium">
                        Nota
                    </label>
                    <InputText id="grade" type="number" step="0.01" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Ejemplo: 4.5" />
                </div>

                {error && <div className="text-red-500 font-medium">{error}</div>}
                {success && <div className="text-green-500 font-medium">{success}</div>}

                <div>
                    <Button type="submit" label="Guardar" icon="pi pi-check" loading={loading} disabled={!titulo.trim() || !typeActivity.trim() || !subject.trim() || loading} />
                </div>
            </form>
        </Card>
    );
};

export default CrearPage;
