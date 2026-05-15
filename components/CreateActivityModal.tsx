'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import {
    getSessionToken,
    getSessionUserDisplayName,
    getSessionUserIdFromSources,
    validateAndRefreshToken,
} from '@/lib/sessionUser';

interface SubActivityPayload {
    name: string;
    description: string | null;
    target_date: string | null;
    estimated_time: number; // hours
}

interface ValidateResult {
    valid: boolean;
    current_load: number;
    limit: number;
    suggestions?: Array<{ tentative_date: string; current_load: number }>;
}

type ValidationState = 'idle' | 'checking' | 'success' | 'error';

const ACTIVITY_TYPE_OPTIONS = [
    { label: 'Examen', value: 'Examen' },
    { label: 'Quiz', value: 'Quiz' },
    { label: 'Taller', value: 'Taller' },
    { label: 'Proyecto', value: 'Proyecto' },
    { label: 'Otro', value: 'Otro' },
];

const formatApiError = (errorData: any): string => {
    if (!errorData) return 'No se pudo crear la actividad.';
    if (typeof errorData === 'string') return errorData;
    if (typeof errorData.message === 'string' && errorData.message.trim()) return errorData.message;
    if (typeof errorData.detail === 'string' && errorData.detail.trim()) return errorData.detail;
    if (typeof errorData === 'object') {
        const entries = Object.entries(errorData)
            .map(([field, value]) => {
                if (Array.isArray(value)) return `${field}: ${value.join(', ')}`;
                if (typeof value === 'string') return `${field}: ${value}`;
                return null;
            })
            .filter((e): e is string => Boolean(e));
        if (entries.length > 0) return entries.join(' | ');
    }
    return 'No se pudo crear la actividad.';
};

export interface CreateActivityModalProps {
    visible: boolean;
    onHide: () => void;
    onSuccess: () => void;
}

export function CreateActivityModal({ visible, onHide, onSuccess }: CreateActivityModalProps) {
    const [loggedUserId, setLoggedUserId] = useState<number | null>(null);
    const [displayName, setDisplayName] = useState('usuario');

    // Activity form
    const [titulo, setTitulo] = useState('');
    const [typeActivity, setTypeActivity] = useState('');
    const [subject, setSubject] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({ titulo: false, typeActivity: false, subject: false });

    // Sub-activities list
    const [subActivities, setSubActivities] = useState<SubActivityPayload[]>([]);

    // Sub-activity dialog
    const [showSubDialog, setShowSubDialog] = useState(false);
    const [subTaskName, setSubTaskName] = useState('');
    const [subTaskDescription, setSubTaskDescription] = useState('');
    const [subTaskTargetDate, setSubTaskTargetDate] = useState('');
    const [subTaskEstimatedHours, setSubTaskEstimatedHours] = useState('');
    const [subNameError, setSubNameError] = useState(false);

    // Validation state for sub-activity
    const [validationState, setValidationState] = useState<ValidationState>('idle');
    const [validationDetails, setValidationDetails] = useState<ValidateResult | null>(null);
    const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Bootstrap user ID and display name when modal opens
    useEffect(() => {
        if (!visible) return;
        const token = getSessionToken();
        const userId = getSessionUserIdFromSources(token);
        if (userId) setLoggedUserId(userId);
        setDisplayName(getSessionUserDisplayName('usuario'));
    }, [visible]);

    // Trigger validation when estimated hours or target date change in sub-activity dialog
    useEffect(() => {
        if (validationTimerRef.current) clearTimeout(validationTimerRef.current);

        const hoursNum = parseFloat(subTaskEstimatedHours);
        const hasHours = subTaskEstimatedHours.trim() !== '' && !Number.isNaN(hoursNum) && hoursNum > 0;
        const hasDate = subTaskTargetDate.trim() !== '';

        if (hasHours && hasDate) {
            setValidationState('checking');
            validationTimerRef.current = setTimeout(() => {
                runValidation(subTaskTargetDate, hoursNum);
            }, 500);
        } else {
            setValidationState('idle');
            setValidationDetails(null);
        }

        return () => {
            if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
        };
    }, [subTaskTargetDate, subTaskEstimatedHours]);

    const runValidation = async (dateValue: string, hours: number) => {
        const token = getSessionToken();
        if (!token) {
            setValidationState('idle');
            return;
        }

        try {
            const isoDate = new Date(dateValue).toISOString();
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/sub-activities/validate-tentative-date-to-create-sub`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ tentative_date: isoDate, hours_estimated: hours }),
                }
            );
            const data: ValidateResult = await response.json();
            setValidationDetails(data);
            setValidationState(data.valid ? 'success' : 'error');
        } catch {
            setValidationState('idle');
            setValidationDetails(null);
        }
    };

    const toLocalInputValue = (isoString: string): string => {
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const handleApplySuggestion = (isoDate: string) => {
        setSubTaskTargetDate(toLocalInputValue(isoDate));
    };

    const resetSubDialog = () => {
        setSubTaskName('');
        setSubTaskDescription('');
        setSubTaskTargetDate('');
        setSubTaskEstimatedHours('');
        setSubNameError(false);
        setValidationState('idle');
        setValidationDetails(null);
        if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    };

    const handleAddSubActivity = () => {
        if (!subTaskName.trim()) {
            setSubNameError(true);
            return;
        }
        if (validationState !== 'success') return;

        const hoursNum = parseFloat(subTaskEstimatedHours);
        setSubActivities((prev) => [
            ...prev,
            {
                name: subTaskName.trim(),
                description: subTaskDescription.trim() || null,
                target_date: new Date(subTaskTargetDate).toISOString(),
                estimated_time: hoursNum,
            },
        ]);
        resetSubDialog();
        setShowSubDialog(false);
    };

    const handleRemoveSubActivity = (index: number) => {
        setSubActivities((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const errors = {
            titulo: !titulo.trim(),
            typeActivity: !typeActivity.trim(),
            subject: !subject.trim(),
        };
        setFieldErrors(errors);
        if (errors.titulo || errors.typeActivity || errors.subject) {
            setError('Completa los campos obligatorios marcados en rojo.');
            return;
        }

        if (!loggedUserId) {
            setError('No se pudo identificar al usuario.');
            return;
        }

        const token = await validateAndRefreshToken();
        if (!token) return;

        setLoading(true);
        try {
            const activityEndpoint = process.env.NEXT_PUBLIC_ACTIVITY_CREATE_ENDPOINT || '/activities/';
            const activityUrl = activityEndpoint.startsWith('http')
                ? activityEndpoint
                : `${process.env.NEXT_PUBLIC_API_URL}${activityEndpoint}`;

            const response = await fetch(activityUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: titulo.trim(),
                    type_activity: typeActivity.trim(),
                    description: descripcion.trim() || null,
                    subject: subject.trim(),
                    event_date: null,
                    deadline: null,
                    grade: null,
                    user: loggedUserId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(formatApiError(errorData));
            }

            const createdActivity = await response.json();
            const activityId = createdActivity?.id;

            if (activityId && subActivities.length > 0) {
                const subEndpoint = process.env.NEXT_PUBLIC_WORK_PLAN_ENDPOINT || '/sub-activities/';
                const subUrl = subEndpoint.startsWith('http')
                    ? subEndpoint
                    : `${process.env.NEXT_PUBLIC_API_URL}${subEndpoint}`;

                for (const sub of subActivities) {
                    await fetch(subUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ ...sub, activity: activityId }),
                    }).catch(() => {});
                }
            }

            resetForm();
            onSuccess();
            onHide();
        } catch (err: any) {
            setError(err.message || 'Error al crear la actividad.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitulo('');
        setTypeActivity('');
        setSubject('');
        setDescripcion('');
        setSubActivities([]);
        setFieldErrors({ titulo: false, typeActivity: false, subject: false });
        setError('');
        setLoading(false);
        resetSubDialog();
    };

    const handleHide = () => {
        resetForm();
        onHide();
    };

    const canAddSub = validationState === 'success' && subTaskName.trim() !== '';

    const formatSuggestionDate = (isoStr: string) =>
        new Date(isoStr).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

    const formatSuggestionTime = (isoStr: string) =>
        new Date(isoStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    return (
        <>
            {/* ─── Main: create activity ─── */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-plus-circle text-primary" />
                        <span>Crear actividad</span>
                    </div>
                }
                visible={visible}
                onHide={handleHide}
                style={{ width: '52rem', maxWidth: '95vw' }}
                modal
                draggable={false}
            >
                <form onSubmit={handleSubmit} className="flex flex-column gap-4">
                    <p className="m-0 text-600">
                        Bienvenido, <span className="font-semibold text-900">{displayName}</span>
                    </p>

                    {/* Título + Tipo */}
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <div className="flex flex-column gap-2">
                                <label className="font-medium">Título *</label>
                                <InputText
                                    value={titulo}
                                    onChange={(e) => {
                                        setTitulo(e.target.value);
                                        if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, titulo: false }));
                                    }}
                                    placeholder="Escribe un título"
                                    className={fieldErrors.titulo ? 'p-invalid' : ''}
                                />
                                {fieldErrors.titulo && <small className="p-error">El título es obligatorio.</small>}
                            </div>
                        </div>
                        <div className="col-12 md:col-6">
                            <div className="flex flex-column gap-2">
                                <label className="font-medium">Tipo de actividad *</label>
                                <Dropdown
                                    value={typeActivity}
                                    options={ACTIVITY_TYPE_OPTIONS}
                                    onChange={(e) => {
                                        setTypeActivity(e.value);
                                        if (e.value) setFieldErrors((prev) => ({ ...prev, typeActivity: false }));
                                    }}
                                    placeholder="Selecciona un tipo"
                                    className={`w-full${fieldErrors.typeActivity ? ' p-invalid' : ''}`}
                                />
                                {fieldErrors.typeActivity && (
                                    <small className="p-error">El tipo de actividad es obligatorio.</small>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Materia */}
                    <div className="flex flex-column gap-2">
                        <label className="font-medium">Materia *</label>
                        <InputText
                            value={subject}
                            onChange={(e) => {
                                setSubject(e.target.value);
                                if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, subject: false }));
                            }}
                            placeholder="Ejemplo: Matemáticas"
                            className={fieldErrors.subject ? 'p-invalid' : ''}
                        />
                        {fieldErrors.subject && <small className="p-error">La materia es obligatoria.</small>}
                    </div>

                    {/* Descripción */}
                    <div className="flex flex-column gap-2">
                        <label className="font-medium">Descripción</label>
                        <InputTextarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={3}
                            placeholder="Describe la actividad"
                        />
                    </div>

                    {/* Subtareas */}
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem' }}>
                        <div className="flex align-items-center justify-content-between mb-3">
                            <div>
                                <h2 className="text-xl font-bold text-900 m-0">Subtareas</h2>
                                <p className="text-sm text-500 mt-1 mb-0">
                                    Divide esta actividad en pasos más pequeños
                                </p>
                            </div>
                            <Button
                                type="button"
                                label="Agregar subtarea"
                                icon="pi pi-plus"
                                onClick={() => setShowSubDialog(true)}
                            />
                        </div>

                        {subActivities.length === 0 ? (
                            <div
                                className="flex flex-column align-items-center justify-content-center p-5 border-round-lg"
                                style={{ border: '2px dashed #CBD5E0', backgroundColor: '#F7FAFC' }}
                            >
                                <i className="pi pi-calendar mb-3" style={{ fontSize: '2rem', color: '#A0AEC0' }} />
                                <p className="text-500 font-medium m-0">Aún no hay subtareas añadidas</p>
                                <p className="text-400 text-sm mt-1 mb-0">
                                    Haz clic en "Agregar subtarea" para comenzar
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-column gap-2">
                                {subActivities.map((sub, index) => (
                                    <div
                                        key={index}
                                        className="flex align-items-center justify-content-between p-3 border-round-lg surface-card"
                                        style={{ border: '1px solid #E2E8F0' }}
                                    >
                                        <div className="flex-1">
                                            <div className="font-semibold text-900">{sub.name}</div>
                                            {sub.description && (
                                                <div
                                                    className="text-500 text-sm mt-1"
                                                    style={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 1,
                                                        WebkitBoxOrient: 'vertical' as any,
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {sub.description}
                                                </div>
                                            )}
                                            <div className="flex align-items-center gap-3 mt-2">
                                                <span
                                                    className="flex align-items-center gap-1 text-xs text-600"
                                                    style={{
                                                        backgroundColor: '#F1F5F9',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    <i
                                                        className="pi pi-calendar"
                                                        style={{ fontSize: '0.7rem', color: '#6366F1' }}
                                                    />
                                                    {sub.target_date
                                                        ? new Date(sub.target_date).toLocaleString('es-CO')
                                                        : '-'}
                                                </span>
                                                <span
                                                    className="flex align-items-center gap-1 text-xs text-600"
                                                    style={{
                                                        backgroundColor: '#F1F5F9',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    <i
                                                        className="pi pi-clock"
                                                        style={{ fontSize: '0.7rem', color: '#F97316' }}
                                                    />
                                                    {sub.estimated_time} h
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                borderLeft: '1px solid #F1F5F9',
                                                paddingLeft: '1rem',
                                                marginLeft: '1rem',
                                            }}
                                        >
                                            <Button
                                                type="button"
                                                icon="pi pi-trash"
                                                rounded
                                                text
                                                severity="danger"
                                                onClick={() => handleRemoveSubActivity(index)}
                                                aria-label="Eliminar subtarea"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && <div className="text-red-500 font-medium">{error}</div>}

                    <div
                        className="flex justify-content-end"
                        style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}
                    >
                        <Button
                            type="submit"
                            label="Guardar actividad"
                            icon="pi pi-check"
                            loading={loading}
                            disabled={loading}
                        />
                    </div>
                </form>
            </Dialog>

            {/* ─── Sub-activity dialog ─── */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-calendar-plus text-primary" />
                        <span>Agregar subtarea</span>
                    </div>
                }
                visible={showSubDialog}
                onHide={() => {
                    resetSubDialog();
                    setShowSubDialog(false);
                }}
                style={{ width: '40rem', maxWidth: '95vw' }}
                modal
                draggable={false}
            >
                <div className="flex flex-column gap-4">
                    {/* Nombre */}
                    <div className="flex flex-column gap-2">
                        <label className="font-medium">Nombre *</label>
                        <InputText
                            value={subTaskName}
                            onChange={(e) => {
                                setSubTaskName(e.target.value);
                                if (e.target.value.trim()) setSubNameError(false);
                            }}
                            placeholder="Nombre de la subtarea"
                            className={subNameError ? 'p-invalid' : ''}
                        />
                        {subNameError && <small className="p-error">El nombre es obligatorio.</small>}
                    </div>

                    {/* Descripción */}
                    <div className="flex flex-column gap-2">
                        <label className="font-medium">Descripción</label>
                        <InputTextarea
                            value={subTaskDescription}
                            onChange={(e) => setSubTaskDescription(e.target.value)}
                            rows={2}
                            placeholder="Descripción de la subtarea"
                        />
                    </div>

                    {/* Horas + Fecha (side by side) */}
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <div className="flex flex-column gap-2">
                                <label className="font-medium">Tiempo estimado (horas) *</label>
                                <InputText
                                    type="number"
                                    min={0.5}
                                    step={0.5}
                                    value={subTaskEstimatedHours}
                                    onChange={(e) => setSubTaskEstimatedHours(e.target.value)}
                                    placeholder="Ej: 2"
                                />
                            </div>
                        </div>
                        <div className="col-12 md:col-6">
                            <div className="flex flex-column gap-2">
                                <label className="font-medium">Fecha objetivo *</label>
                                <InputText
                                    type="datetime-local"
                                    value={subTaskTargetDate}
                                    onChange={(e) => setSubTaskTargetDate(e.target.value)}
                                    className={`w-full${validationState === 'error' ? ' p-invalid' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ─── Validation zone ─── */}

                    {validationState === 'checking' && (
                        <div
                            className="border-round p-3 flex align-items-center gap-2"
                            style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                        >
                            <i className="pi pi-spin pi-spinner text-primary" />
                            <span className="text-600 text-sm">Verificando disponibilidad de la agenda...</span>
                        </div>
                    )}

                    {validationState === 'success' && validationDetails && (
                        <div
                            className="border-round p-3 flex gap-2"
                            style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }}
                        >
                            <i
                                className="pi pi-check-circle mt-1"
                                style={{ color: '#16A34A', fontSize: '1.1rem' }}
                            />
                            <div>
                                <div className="font-semibold" style={{ color: '#166534' }}>
                                    Fecha disponible
                                </div>
                                <div className="text-sm mt-1" style={{ color: '#15803D' }}>
                                    La carga del día quedaría en {validationDetails.current_load} h de{' '}
                                    {validationDetails.limit} h máx.
                                </div>
                            </div>
                        </div>
                    )}

                    {validationState === 'error' && validationDetails && (
                        <div className="flex flex-column gap-3">
                            {/* Error card */}
                            <div
                                className="border-round p-3"
                                style={{ backgroundColor: '#FFF5F5', border: '1px solid #FCA5A5' }}
                            >
                                <div className="flex gap-2">
                                    <i
                                        className="pi pi-exclamation-circle mt-1"
                                        style={{ color: '#DC2626', fontSize: '1.1rem', flexShrink: 0 }}
                                    />
                                    <div className="w-full">
                                        <div className="font-semibold" style={{ color: '#991B1B' }}>
                                            Fecha no disponible
                                        </div>
                                        <div className="text-sm mt-1 mb-3" style={{ color: '#B91C1C' }}>
                                            La carga de este día superaría el límite configurado.
                                        </div>
                                        <div className="grid">
                                            <div className="col-6">
                                                <div
                                                    className="border-round p-2"
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.6)',
                                                        border: '1px solid #FCA5A5',
                                                    }}
                                                >
                                                    <div
                                                        className="text-xs font-medium mb-1"
                                                        style={{ color: '#991B1B' }}
                                                    >
                                                        Carga estimada del día
                                                    </div>
                                                    <div
                                                        className="text-lg font-bold"
                                                        style={{ color: '#DC2626' }}
                                                    >
                                                        {validationDetails.current_load} h
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div
                                                    className="border-round p-2"
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.6)',
                                                        border: '1px solid #FCA5A5',
                                                    }}
                                                >
                                                    <div
                                                        className="text-xs font-medium mb-1"
                                                        style={{ color: '#991B1B' }}
                                                    >
                                                        Límite configurado
                                                    </div>
                                                    <div
                                                        className="text-lg font-bold"
                                                        style={{ color: '#DC2626' }}
                                                    >
                                                        {validationDetails.limit} h
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Suggestions */}
                            {Array.isArray(validationDetails.suggestions) &&
                                validationDetails.suggestions.length > 0 && (
                                    <div>
                                        <div
                                            className="text-sm font-semibold mb-1"
                                            style={{ color: '#4338CA' }}
                                        >
                                            Fechas sugeridas
                                        </div>
                                        <div className="text-xs text-500 mb-2">
                                            Haz clic en una opción para aplicarla:
                                        </div>
                                        <div className="flex flex-column gap-2">
                                            {validationDetails.suggestions.map((sug, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleApplySuggestion(sug.tentative_date)}
                                                    className="flex align-items-center justify-content-between p-3 border-round-lg w-full cursor-pointer"
                                                    style={{
                                                        border: '1px solid #E2E8F0',
                                                        backgroundColor: '#FAFAFA',
                                                        textAlign: 'left',
                                                        transition: 'border-color 0.15s ease, background-color 0.15s ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                                                            '#6366F1';
                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                                            '#EEF2FF';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                                                            '#E2E8F0';
                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                                            '#FAFAFA';
                                                    }}
                                                >
                                                    <div className="flex align-items-center gap-2">
                                                        <i className="pi pi-calendar text-500" />
                                                        <div>
                                                            <div className="text-sm font-medium text-900">
                                                                {formatSuggestionDate(sug.tentative_date)}
                                                            </div>
                                                            <div className="text-xs text-500">
                                                                {formatSuggestionTime(sug.tentative_date)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="text-xs font-medium px-2 py-1 border-round"
                                                        style={{ color: '#16A34A', backgroundColor: '#F0FDF4' }}
                                                    >
                                                        Carga est: {sug.current_load} h
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}

                    {/* Footer */}
                    <div
                        className="flex justify-content-end gap-2"
                        style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}
                    >
                        <Button
                            type="button"
                            label="Cancelar"
                            severity="secondary"
                            outlined
                            onClick={() => {
                                resetSubDialog();
                                setShowSubDialog(false);
                            }}
                        />
                        <Button
                            type="button"
                            label="Agregar subtarea"
                            icon="pi pi-plus"
                            onClick={handleAddSubActivity}
                            disabled={!canAddSub}
                        />
                    </div>
                </div>
            </Dialog>
        </>
    );
}
