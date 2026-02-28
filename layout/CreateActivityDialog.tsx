'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { ROUTES } from '@/lib/routes';
import { getSessionToken, getSessionUserDisplayName, getSessionUserDisplayNameFromToken, getSessionUserIdFromSources } from '@/lib/sessionUser';

interface CreateActivityDialogProps {
    visible: boolean;
    onHide: () => void;
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

interface RequiredFieldErrors {
    title: boolean;
    typeActivity: boolean;
    subject: boolean;
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

const toIsoOrNull = (value: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const CreateActivityDialog = ({ visible, onHide }: CreateActivityDialogProps) => {
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
    const [fieldErrors, setFieldErrors] = useState<RequiredFieldErrors>({
        title: false,
        typeActivity: false,
        subject: false
    });
    const [touched, setTouched] = useState<RequiredFieldErrors>({
        title: false,
        typeActivity: false,
        subject: false
    });

    const activityCreateEndpoint = process.env.NEXT_PUBLIC_ACTIVITY_CREATE_ENDPOINT || '/activities/';
    const activityCreateUrl = activityCreateEndpoint.startsWith('http') ? activityCreateEndpoint : `${process.env.NEXT_PUBLIC_API_URL}${activityCreateEndpoint}`;

    useEffect(() => {
        if (!visible) return;

        setError('');
        setFieldErrors({ title: false, typeActivity: false, subject: false });
        setTouched({ title: false, typeActivity: false, subject: false });

        const bootstrapSession = async () => {
            const token = getSessionToken();

            if (!token) {
                onHide();
                router.replace(ROUTES.AUTH.LOGIN);
                return;
            }

            let userId = getSessionUserIdFromSources(token);
            let resolvedDisplayName = getSessionUserDisplayName('usuario');
            if (resolvedDisplayName === 'usuario') {
                resolvedDisplayName = getSessionUserDisplayNameFromToken(token, 'usuario');
            }

            if (!userId) {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const me = await response.json();
                        userId = Number.isInteger(me?.id) ? me.id : Number.parseInt(String(me?.id), 10);
                        if (userId) {
                            resolvedDisplayName = me?.first_name || me?.firstName || me?.name || me?.username || me?.email || resolvedDisplayName;
                            localStorage.setItem('user', JSON.stringify(me));
                        }
                    }
                } catch {
                }
            }

            if (!userId) {
                onHide();
                router.replace(ROUTES.AUTH.LOGIN);
                return;
            }

            setDisplayName(resolvedDisplayName);
            setLoggedUserId(userId);
        };

        bootstrapSession();
    }, [visible, onHide, router]);

    const handleCreateActivity = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        const nextErrors: RequiredFieldErrors = {
            title: !titulo.trim(),
            typeActivity: !typeActivity.trim(),
            subject: !subject.trim()
        };
        setFieldErrors(nextErrors);
        setTouched({ title: true, typeActivity: true, subject: true });

        if (nextErrors.title || nextErrors.typeActivity || nextErrors.subject) {
            setError('Completa los campos requeridos: título, tipo de actividad y materia.');
            return;
        }

        if (!loggedUserId) {
            setError('No se pudo identificar al usuario logeado.');
            return;
        }

        const token = getSessionToken();
        if (!token) {
            onHide();
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

            setTitulo('');
            setTypeActivity('');
            setSubject('');
            setDescripcion('');
            setEventDate('');
            setDeadline('');
            setGrade('');
            onHide();
            window.dispatchEvent(
                new CustomEvent('activity-created', {
                    detail: { message: 'Registro exitoso' }
                })
            );
        } catch (err: any) {
            setError(err.message || 'Error al crear la actividad.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            header="Crear actividad"
            visible={visible}
            style={{ width: '50rem', maxWidth: '95vw' }}
            onHide={onHide}
            draggable={false}
            modal
        >
            <form className="flex flex-column gap-4" onSubmit={handleCreateActivity}>
                <p className="m-0 text-600">
                    Bienvenido, <span className="font-semibold text-900">{displayName}</span>
                </p>

                {/* Título */}
                <div className="flex flex-column gap-2">
                    <label htmlFor="titulo" className="font-medium">
                        Título *
                    </label>
                    <InputText
                        id="titulo"
                        value={titulo}
                        onChange={(e) => {
                            setTitulo(e.target.value);
                            if (e.target.value.trim()) {
                                setFieldErrors((prev) => ({ ...prev, title: false }));
                            }
                        }}
                        onBlur={() => {
                            setTouched((prev) => ({ ...prev, title: true }));
                            setFieldErrors((prev) => ({ ...prev, title: !titulo.trim() }));
                        }}
                        placeholder="Escribe un título"
                        className={fieldErrors.title || (touched.title && !titulo.trim()) ? 'p-invalid' : ''}
                    />
                    {(fieldErrors.title || (touched.title && !titulo.trim())) && (
                        <small className="p-error">El título es obligatorio.</small>
                    )}
                </div>

                {/* Tipo de actividad */}
                <div className="flex flex-column gap-2">
                    <label htmlFor="typeActivity" className="font-medium">
                        Tipo de actividad *
                    </label>
                    <Dropdown
                        id="typeActivity"
                        value={typeActivity}
                        options={ACTIVITY_TYPE_OPTIONS}
                        onChange={(e) => {
                            setTypeActivity(e.value);
                            if (String(e.value || '').trim()) {
                                setFieldErrors((prev) => ({ ...prev, typeActivity: false }));
                            }
                            setTouched((prev) => ({ ...prev, typeActivity: true }));
                        }}
                        onBlur={() => {
                            setTouched((prev) => ({ ...prev, typeActivity: true }));
                            setFieldErrors((prev) => ({ ...prev, typeActivity: !typeActivity.trim() }));
                        }}
                        placeholder="Selecciona un tipo"
                        className={`w-full ${fieldErrors.typeActivity || (touched.typeActivity && !typeActivity.trim()) ? 'p-invalid' : ''}`}
                    />
                    {(fieldErrors.typeActivity || (touched.typeActivity && !typeActivity.trim())) && (
                        <small className="p-error">El tipo de actividad es obligatorio.</small>
                    )}
                </div>

                {/* Materia */}
                <div className="flex flex-column gap-2">
                    <label htmlFor="subject" className="font-medium">
                        Materia *
                    </label>
                    <InputText
                        id="subject"
                        value={subject}
                        onChange={(e) => {
                            setSubject(e.target.value);
                            if (e.target.value.trim()) {
                                setFieldErrors((prev) => ({ ...prev, subject: false }));
                            }
                        }}
                        onBlur={() => {
                            setTouched((prev) => ({ ...prev, subject: true }));
                            setFieldErrors((prev) => ({ ...prev, subject: !subject.trim() }));
                        }}
                        placeholder="Ejemplo: Matemáticas"
                        className={fieldErrors.subject || (touched.subject && !subject.trim()) ? 'p-invalid' : ''}
                    />
                    {(fieldErrors.subject || (touched.subject && !subject.trim())) && (
                        <small className="p-error">La materia es obligatoria.</small>
                    )}
                </div>

                {/* Descripción */}
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

                {/* Fechas */}
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

                {/* Nota */}
                <div className="flex flex-column gap-2">
                    <label htmlFor="grade" className="font-medium">
                        Nota
                    </label>
                    <InputText id="grade" type="number" step="0.01" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Ejemplo: 4.5" />
                </div>

                {error && <div className="text-red-500 font-medium">{error}</div>}

                <div className="flex justify-content-end gap-2">
                    <Button type="button" label="Cancelar" severity="secondary" outlined onClick={onHide} />
                    <Button type="submit" label="Guardar" icon="pi pi-check" loading={loading} disabled={!titulo.trim() || !typeActivity.trim() || !subject.trim() || loading} />
                </div>
            </form>
        </Dialog>
    );
};

export default CreateActivityDialog;