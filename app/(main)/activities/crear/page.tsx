'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import JwtService from '@/service/JwtService';
import { ROUTES } from '@/lib/routes';
import { validateAndRefreshToken } from '@/lib/sessionUser';

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

interface SubActivityPayload {
    name: string;
    description: string | null;
    target_date: string | null;
    estimated_time: number;
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

const CrearPage = () => {
    const router = useRouter();
    const [titulo, setTitulo] = useState('');
    const [typeActivity, setTypeActivity] = useState('');
    const [subject, setSubject] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [deadline, setDeadline] = useState('');
    const [displayName, setDisplayName] = useState('usuario');
    const [loggedUserId, setLoggedUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // States para subtareas
    const [subActivities, setSubActivities] = useState<SubActivityPayload[]>([]);
    const [showSubActivityDialog, setShowSubActivityDialog] = useState(false);
    const [subTaskName, setSubTaskName] = useState('');
    const [subTaskDescription, setSubTaskDescription] = useState('');
    const [subTaskTargetDate, setSubTaskTargetDate] = useState('');
    const [subTaskEstimatedTime, setSubTaskEstimatedTime] = useState('');

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
            const validToken = await validateAndRefreshToken();

            if (!validToken) {
                router.replace(ROUTES.AUTH.LOGIN);
                return;
            }

            const storedUser = getUserFromStorage();
            let userId = parseUserId(storedUser?.id);
            let resolvedUser = storedUser;

            if (!userId) {
                const payload = decodeTokenPayload(validToken);
                userId = parseUserId(payload?.user_id ?? payload?.id ?? payload?.sub);
            }

            if (!userId) {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${validToken}` }
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

        const token = await validateAndRefreshToken();
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
            grade: null,
            user: loggedUserId
        };

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

            const createdActivity = await response.json();
            const activityId = createdActivity?.id;

            // Crear subtareas si existen
            if (activityId && subActivities.length > 0) {
                const subActivityEndpoint = process.env.NEXT_PUBLIC_WORK_PLAN_ENDPOINT || '/sub-activities/';
                const subActivityUrl = subActivityEndpoint.startsWith('http') ? subActivityEndpoint : `${process.env.NEXT_PUBLIC_API_URL}${subActivityEndpoint}`;

                for (const subActivity of subActivities) {
                    await fetch(subActivityUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            ...subActivity,
                            activity: activityId
                        })
                    }).catch(() => {
                        console.warn('Error al crear subtarea');
                    });
                }
            }

            setSuccess('Actividad y subtareas creadas correctamente.');
            setTitulo('');
            setTypeActivity('');
            setSubject('');
            setDescripcion('');
            setEventDate('');
            setDeadline('');
            setSubActivities([]);

            setTimeout(() => {
                router.push(ROUTES.HOME);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al crear la actividad.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubActivity = () => {
        if (!subTaskName.trim()) {
            setError('El nombre de la subtarea es obligatorio.');
            return;
        }

        const estimatedTime = Number.parseInt(subTaskEstimatedTime, 10);
        if (Number.isNaN(estimatedTime) || estimatedTime < 1) {
            setError('El tiempo estimado debe ser un número mayor a 0.');
            return;
        }

        const newSubActivity: SubActivityPayload = {
            name: subTaskName.trim(),
            description: subTaskDescription.trim() ? subTaskDescription.trim() : null,
            target_date: subTaskTargetDate ? new Date(subTaskTargetDate).toISOString() : null,
            estimated_time: estimatedTime
        };

        setSubActivities([...subActivities, newSubActivity]);
        setSubTaskName('');
        setSubTaskDescription('');
        setSubTaskTargetDate('');
        setSubTaskEstimatedTime('');
        setError('');
        setShowSubActivityDialog(false);
    };

    const handleRemoveSubActivity = (index: number) => {
        setSubActivities(subActivities.filter((_, i) => i !== index));
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('es-CO');
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

                {error && <div className="text-red-500 font-medium">{error}</div>}
                {success && <div className="text-green-500 font-medium">{success}</div>}

                <div className="border-top pt-4">
                    <div className="flex align-items-center justify-content-between mb-4">
                        <h2 className="text-xl font-semibold text-900 m-0">Subtareas</h2>
                        <Button label="Agregar subtarea" icon="pi pi-plus" onClick={() => setShowSubActivityDialog(true)} type="button" />
                    </div>

                    {subActivities.length > 0 && (
                        <DataTable value={subActivities} className="mb-4">
                            <Column field="name" header="Nombre" />
                            <Column field="description" header="Descripción" body={(rowData: SubActivityPayload) => rowData.description || '-'} />
                            <Column
                                field="target_date"
                                header="Fecha objetivo"
                                body={(rowData: SubActivityPayload) => formatDate(rowData.target_date)}
                            />
                            <Column field="estimated_time" header="Tiempo estimado (min)" />
                            <Column
                                header="Acciones"
                                body={(_, { rowIndex }) => (
                                    <Button
                                        icon="pi pi-trash"
                                        rounded
                                        text
                                        severity="danger"
                                        onClick={() => handleRemoveSubActivity(rowIndex)}
                                        type="button"
                                    />
                                )}
                            />
                        </DataTable>
                    )}
                </div>

                <div>
                    <Button type="submit" label="Guardar" icon="pi pi-check" loading={loading} disabled={!titulo.trim() || !typeActivity.trim() || !subject.trim() || loading} />
                </div>
            </form>

            <Dialog
                header="Agregar subtarea"
                visible={showSubActivityDialog}
                onHide={() => {
                    setShowSubActivityDialog(false);
                    setSubTaskName('');
                    setSubTaskDescription('');
                    setSubTaskTargetDate('');
                    setSubTaskEstimatedTime('');
                }}
                style={{ width: '40rem', maxWidth: '95vw' }}
                modal
                draggable={false}
            >
                <div className="flex flex-column gap-3">
                    <div className="flex flex-column gap-2">
                        <label htmlFor="subTaskName" className="font-medium">
                            Nombre *
                        </label>
                        <InputText
                            id="subTaskName"
                            value={subTaskName}
                            onChange={(e) => setSubTaskName(e.target.value)}
                            placeholder="Nombre de la subtarea"
                        />
                    </div>

                    <div className="flex flex-column gap-2">
                        <label htmlFor="subTaskDescription" className="font-medium">
                            Descripción
                        </label>
                        <InputTextarea
                            id="subTaskDescription"
                            value={subTaskDescription}
                            onChange={(e) => setSubTaskDescription(e.target.value)}
                            rows={3}
                            placeholder="Descripción de la subtarea"
                        />
                    </div>

                    <div className="flex flex-column gap-2">
                        <label htmlFor="subTaskTargetDate" className="font-medium">
                            Fecha objetivo
                        </label>
                        <InputText
                            id="subTaskTargetDate"
                            type="datetime-local"
                            value={subTaskTargetDate}
                            onChange={(e) => setSubTaskTargetDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-column gap-2">
                        <label htmlFor="subTaskEstimatedTime" className="font-medium">
                            Tiempo estimado (minutos) *
                        </label>
                        <InputText
                            id="subTaskEstimatedTime"
                            type="number"
                            min={1}
                            value={subTaskEstimatedTime}
                            onChange={(e) => setSubTaskEstimatedTime(e.target.value)}
                            placeholder="Ej: 120"
                        />
                    </div>

                    <div className="flex justify-content-end gap-2">
                        <Button
                            type="button"
                            label="Cancelar"
                            severity="secondary"
                            outlined
                            onClick={() => {
                                setShowSubActivityDialog(false);
                                setSubTaskName('');
                                setSubTaskDescription('');
                                setSubTaskTargetDate('');
                                setSubTaskEstimatedTime('');
                            }}
                        />
                        <Button type="button" label="Agregar" icon="pi pi-plus" onClick={handleAddSubActivity} />
                    </div>
                </div>
            </Dialog>
        </Card>
    );
};

export default CrearPage;
