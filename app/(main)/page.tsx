/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { decodeSessionTokenPayload, getSessionToken, getSessionUserDisplayName, validateAndRefreshToken } from '@/lib/sessionUser';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { Toast } from 'primereact/toast';
import { RescheduleModal, ValidateTentativeDateResult } from '@/components/RescheduleModal';
import { CapacityTracker } from '@/components/CapacityTracker';
import { CreateActivityModal } from '@/components/CreateActivityModal';

interface TokenPayload {
    first_name?: string;
    firstName?: string;
    name?: string;
    username?: string;
    email?: string;
    [key: string]: any;
}

interface TodayActivityItem {
    id?: number;
    name?: string;
    title?: string;
    type_activity?: string;
    subject?: string;
    description?: string | null;
    estimated_time?: number | string | null;
    target_date?: string | null;
    deadline?: string | null;
    event_date?: string | null;
    activity_name?: string;
    activity?: number;
    notes?: string[] | null;
    [key: string]: any;
}

interface ActivityDetail {
    id?: number;
    title: string;
    type_activity?: string;
    description?: string | null;
    subject?: string | null;
    event_date?: string | null;
    deadline?: string | null;
    grade?: number | null;
    total_subactivities?: number;
    total_completed?: number;
    [key: string]: any;
}

interface TodayResponse {
    now?: string;
    expired?: TodayActivityItem[];
    today?: TodayActivityItem[];
    upcoming?: TodayActivityItem[];
    [key: string]: any;
}

interface TodayFilters {
    estimated_time: string;
    type_activity: string;
    subject: string;
}

const NEXT_DAYS_WINDOW = 7;

const ACTIVITY_TYPE_OPTIONS = [
    { label: 'Todos', value: '' },
    { label: 'Examen', value: 'Examen' },
    { label: 'Quiz', value: 'Quiz' },
    { label: 'Taller', value: 'Taller' },
    { label: 'Proyecto', value: 'Proyecto' },
    { label: 'Otro', value: 'Otro' }
];

const COLUMNS = [
    {
        key: 'overdue' as const,
        title: '🔴 Vencidas',
        accentColor: '#EF4444',
        textColor: '#B91C1C',
        bgColor: '#FFF5F5',
        headerBg: '#FEE2E2',
        borderColor: '#FCA5A5',
        tagSeverity: 'danger' as const,
        emptyIcon: 'pi-thumbs-up',
        emptyText: 'Sin vencidas'
    },
    {
        key: 'today' as const,
        title: '🟢 Para hoy',
        accentColor: '#22C55E',
        textColor: '#166534',
        bgColor: '#F0FDF4',
        headerBg: '#DCFCE7',
        borderColor: '#86EFAC',
        tagSeverity: 'success' as const,
        emptyIcon: 'pi-check',
        emptyText: 'Nada para hoy'
    },
    {
        key: 'upcoming' as const,
        title: '🔵 Próximas',
        accentColor: '#3B82F6',
        textColor: '#1D4ED8',
        bgColor: '#EFF6FF',
        headerBg: '#DBEAFE',
        borderColor: '#93C5FD',
        tagSeverity: 'info' as const,
        emptyIcon: 'pi-calendar',
        emptyText: `Nada en ${NEXT_DAYS_WINDOW} días`
    }
];

const Dashboard = () => {
    const router = useRouter();
    const toastRef = useRef<Toast>(null);

    const [displayName, setDisplayName] = useState('usuario');
    const [groupedItems, setGroupedItems] = useState<{
        overdue: TodayActivityItem[];
        today: TodayActivityItem[];
        upcoming: TodayActivityItem[];
    }>({ overdue: [], today: [], upcoming: [] });
    const [filters, setFilters] = useState<TodayFilters>({ estimated_time: '', type_activity: '', subject: '' });
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Activity detail modal
    const [activityDetail, setActivityDetail] = useState<ActivityDetail | null>(null);
    const [activityDetailLoading, setActivityDetailLoading] = useState(false);
    const [activityDetailVisible, setActivityDetailVisible] = useState(false);

    // Reschedule modal
    const [rescheduleItem, setRescheduleItem] = useState<TodayActivityItem | null>(null);
    const [rescheduleVisible, setRescheduleVisible] = useState(false);

    // Status tab: 0=activas, 1=pospuestas, 2=finalizadas
    const [statusSubactivity, setStatusSubactivity] = useState(0);
    const [flatItems, setFlatItems] = useState<TodayActivityItem[]>([]);

    // Postpone modal
    const [postponeItem, setPostponeItem] = useState<TodayActivityItem | null>(null);
    const [postponeVisible, setPostponeVisible] = useState(false);
    const [postponeNote, setPostponeNote] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return '-';
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return String(value);
        return parsedDate.toLocaleString('es-CO');
    };

    const getDueDate = (item: TodayActivityItem): Date | null => {
        const raw = item.target_date || item.deadline || item.event_date;
        if (!raw) return null;
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const getEffort = (item: TodayActivityItem): number => {
        const parsed = Number(item.estimated_time);
        return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
    };

    const sortByDateThenEffort = (left: TodayActivityItem, right: TodayActivityItem): number => {
        const leftDate = getDueDate(left);
        const rightDate = getDueDate(right);
        const leftTime = leftDate ? leftDate.getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = rightDate ? rightDate.getTime() : Number.MAX_SAFE_INTEGER;
        if (leftTime !== rightTime) return leftTime - rightTime;
        return getEffort(left) - getEffort(right);
    };

    const taskTitle = (item: TodayActivityItem): string =>
        String(item.title || item.name || '-');

    const buildTodayRequestUrl = (currentFilters: TodayFilters, currentStatus: number): string => {
        const params = new URLSearchParams();
        params.set('status_subactivity', String(currentStatus));
        if (currentFilters.estimated_time.trim()) params.set('estimated_time', currentFilters.estimated_time.trim());
        if (currentFilters.type_activity.trim()) params.set('type_activity', currentFilters.type_activity.trim());
        if (currentFilters.subject.trim()) params.set('subject', currentFilters.subject.trim());
        return `${process.env.NEXT_PUBLIC_API_URL}/today/?${params.toString()}`;
    };

    const fetchToday = async (currentFilters: TodayFilters = filters, currentStatus: number = statusSubactivity) => {
        const validToken = await validateAndRefreshToken();
        if (!validToken) {
            router.replace(ROUTES.AUTH.LOGIN);
            return;
        }
        const authorizationHeader = validToken.startsWith('Bearer ') ? validToken : `Bearer ${validToken}`;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(buildTodayRequestUrl(currentFilters, currentStatus), {
                headers: { Authorization: authorizationHeader }
            });
            if (!response.ok) throw new Error('No se pudieron cargar las actividades de hoy.');
            const data = (await response.json()) as TodayResponse;
            if (currentStatus === 0) {
                setGroupedItems({
                    overdue: [...(Array.isArray(data?.expired) ? data.expired : [])].sort(sortByDateThenEffort),
                    today: [...(Array.isArray(data?.today) ? data.today : [])].sort(sortByDateThenEffort),
                    upcoming: [...(Array.isArray(data?.upcoming) ? data.upcoming : [])].sort(sortByDateThenEffort)
                });
            } else {
                const all = [
                    ...(Array.isArray(data?.expired) ? data.expired : []),
                    ...(Array.isArray(data?.today) ? data.today : []),
                    ...(Array.isArray(data?.upcoming) ? data.upcoming : [])
                ].sort(sortByDateThenEffort);
                setFlatItems(all);
            }
        } catch (fetchError: any) {
            setError(fetchError.message || 'Error al cargar actividades del dashboard.');
            if (currentStatus === 0) {
                setGroupedItems({ overdue: [], today: [], upcoming: [] });
            } else {
                setFlatItems([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityDetail = async (activityId: number) => {
        const token = getSessionToken();
        if (!token) return;
        setActivityDetailLoading(true);
        setActivityDetail(null);
        setActivityDetailVisible(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activities/${activityId}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('No se pudo cargar la actividad.');
            const data = await response.json();
            setActivityDetail(data);
        } catch (err: any) {
            setActivityDetailVisible(false);
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: err.message || 'No se pudo cargar la actividad.',
                life: 4000
            });
        } finally {
            setActivityDetailLoading(false);
        }
    };

    const handleCardClick = (item: TodayActivityItem) => {
        if (item.activity) fetchActivityDetail(item.activity);
    };

    const handleOpenReschedule = (e: React.MouseEvent, item: TodayActivityItem) => {
        e.stopPropagation();
        setRescheduleItem(item);
        setRescheduleVisible(true);
    };

    const handleValidateTentativeDate = async (
        subActivityId: number,
        tentativeDate: string
    ): Promise<ValidateTentativeDateResult> => {
        const token = getSessionToken();
        if (!token) throw new Error('Sin sesión activa.');
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/sub-activities/validate-tentative-date`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ subactivity: subActivityId, tentative_date: tentativeDate })
            }
        );
        const data = await response.json();
        return data as ValidateTentativeDateResult;
    };

    const handleSaveReschedule = async (subActivityId: number, newDate: string) => {
        const token = getSessionToken();
        if (!token) throw new Error('Sin sesión activa.');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sub-activities/${subActivityId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ target_date: newDate, status_subactivity: 0 })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const detail =
                (typeof errorData?.detail === 'string' && errorData.detail) ||
                (typeof errorData?.message === 'string' && errorData.message) ||
                (Array.isArray(errorData?.target_date) && errorData.target_date[0]) ||
                (typeof errorData?.target_date === 'string' && errorData.target_date) ||
                'No se pudo reprogramar la subtarea.';
            toastRef.current?.show({
                severity: 'error',
                summary: 'No se pudo reprogramar',
                detail,
                life: 5000
            });
            throw new Error(detail);
        }

        toastRef.current?.show({
            severity: 'success',
            summary: 'Reprogramada',
            detail: 'La fecha de la subtarea se actualizó correctamente.',
            life: 3000
        });
        setRescheduleVisible(false);
        setRescheduleItem(null);
        fetchToday(filters);
    };

    const applyFilters = () => fetchToday(filters, statusSubactivity);

    const clearFilters = () => {
        const emptyFilters: TodayFilters = { estimated_time: '', type_activity: '', subject: '' };
        setFilters(emptyFilters);
        fetchToday(emptyFilters, statusSubactivity);
    };

    const handleTabChange = (newStatus: number) => {
        setStatusSubactivity(newStatus);
        fetchToday(filters, newStatus);
    };

    const handleMarkAsDone = async (e: React.MouseEvent, item: TodayActivityItem) => {
        e.stopPropagation();
        const token = getSessionToken();
        if (!token || !item.id) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sub-activities/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status_subactivity: 2 })
            });
            if (!response.ok) throw new Error('No se pudo marcar como hecha.');
            toastRef.current?.show({ severity: 'success', summary: 'Hecha', detail: 'Subtarea marcada como finalizada.', life: 3000 });
            fetchToday(filters, statusSubactivity);
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err.message || 'No se pudo actualizar.', life: 4000 });
        }
    };

    const handleOpenPostpone = (e: React.MouseEvent, item: TodayActivityItem) => {
        e.stopPropagation();
        setPostponeItem(item);
        setPostponeNote('');
        setPostponeVisible(true);
    };

    const handleConfirmPostpone = async () => {
        const token = getSessionToken();
        if (!token || !postponeItem?.id) return;
        try {
            const notes = postponeNote.trim() ? [postponeNote.trim()] : [];
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sub-activities/${postponeItem.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status_subactivity: 1, notes })
            });
            if (!response.ok) throw new Error('No se pudo posponer la subtarea.');
            toastRef.current?.show({ severity: 'info', summary: 'Pospuesta', detail: 'Subtarea pospuesta correctamente.', life: 3000 });
            setPostponeVisible(false);
            setPostponeItem(null);
            fetchToday(filters, statusSubactivity);
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err.message || 'No se pudo posponer.', life: 4000 });
        }
    };

    const totalItems = statusSubactivity === 0
        ? groupedItems.overdue.length + groupedItems.today.length + groupedItems.upcoming.length
        : flatItems.length;
    const hasActiveFilters = Boolean(filters.estimated_time.trim() || filters.type_activity.trim() || filters.subject.trim());

    useEffect(() => {
        const token = getSessionToken();
        const tokenPayload = (token ? decodeSessionTokenPayload(token) : null) as TokenPayload | null;
        const nameFromToken = tokenPayload?.first_name || tokenPayload?.firstName || tokenPayload?.name || tokenPayload?.username || tokenPayload?.email;
        setDisplayName(nameFromToken || getSessionUserDisplayName('usuario'));
        fetchToday();
    }, []);

    const renderSubtaskCard = (item: TodayActivityItem, index: number, col: typeof COLUMNS[number]) => (
        <div
            key={item.id ?? index}
            className="surface-card border-round-lg cursor-pointer"
            style={{
                border: '1px solid #E2E8F0',
                borderLeft: `4px solid ${col.accentColor}`,
                transition: 'box-shadow 0.15s ease, transform 0.1s ease'
            }}
            onClick={() => handleCardClick(item)}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
            }}
        >
            <div className="p-3">
                {/* Context row: subject · type_activity */}
                {(item.subject || item.type_activity) && (
                    <div className="flex align-items-center gap-1 mb-2">
                        <i className="pi pi-book" style={{ fontSize: '0.65rem', color: col.accentColor }} />
                        {item.subject && (
                            <span
                                className="text-xs font-medium text-500 overflow-hidden text-overflow-ellipsis white-space-nowrap"
                                style={{ maxWidth: '9rem' }}
                            >
                                {item.subject}
                            </span>
                        )}
                        {item.subject && item.type_activity && (
                            <span className="text-300 text-xs">•</span>
                        )}
                        {item.type_activity && (
                            <span className="text-xs text-500">{item.type_activity}</span>
                        )}
                    </div>
                )}

                {/* Sub-activity name */}
                <div className="font-bold text-900 line-height-2 mb-1" style={{ fontSize: '0.875rem' }}>
                    {taskTitle(item)}
                </div>

                {/* Description — max 2 lines */}
                {item.description && (
                    <div
                        className="text-500 text-xs line-height-3"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as any,
                            overflow: 'hidden'
                        }}
                    >
                        {item.description}
                    </div>
                )}

                {/* Notes */}
                {Array.isArray(item.notes) && item.notes.length > 0 && (
                    <div className="mt-2 flex flex-column gap-1">
                        {item.notes.map((note, i) => (
                            <div key={i} className="flex gap-2 align-items-start p-2 border-round" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                                <i className="pi pi-comment" style={{ fontSize: '0.75rem', color: '#F97316', marginTop: '0.1rem', flexShrink: 0 }} />
                                <span className="text-xs text-700" style={{ fontStyle: 'italic' }}>&ldquo;{note}&rdquo;</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div
                className="flex justify-content-between align-items-center px-3 pb-2 pt-2"
                style={{ borderTop: '1px solid #F1F5F9' }}
            >
                <div className="flex flex-column gap-1">
                    {item.estimated_time != null && (
                        <span className="flex align-items-center gap-1 text-xs text-500">
                            <i className="pi pi-clock" style={{ fontSize: '0.7rem' }} />
                            {item.estimated_time} horas
                        </span>
                    )}
                    <span className="flex align-items-center gap-1 text-xs text-400">
                        <i className="pi pi-calendar" style={{ fontSize: '0.7rem' }} />
                        {formatDateTime(item.target_date || item.deadline || item.event_date)}
                    </span>
                </div>

                <div className="flex gap-1">
                    <Button
                        type="button"
                        icon="pi pi-calendar-plus"
                        size="small"
                        text
                        tooltip="Reprogramar"
                        tooltipOptions={{ position: 'top' }}
                        style={{ width: '2rem', height: '2rem' }}
                        onClick={(e) => handleOpenReschedule(e, item)}
                    />
                    <Button
                        type="button"
                        icon="pi pi-hourglass"
                        size="small"
                        text
                        severity="warning"
                        tooltip="Posponer"
                        tooltipOptions={{ position: 'top' }}
                        style={{ width: '2rem', height: '2rem' }}
                        onClick={(e) => handleOpenPostpone(e, item)}
                    />
                    <Button
                        type="button"
                        icon="pi pi-check-circle"
                        size="small"
                        text
                        severity="success"
                        tooltip="Marcar como hecha"
                        tooltipOptions={{ position: 'top' }}
                        style={{ width: '2rem', height: '2rem' }}
                        onClick={(e) => handleMarkAsDone(e, item)}
                    />
                </div>
            </div>
        </div>
    );

    const renderFlatCard = (item: TodayActivityItem, index: number) => {
        const isPostponed = statusSubactivity === 1;
        const accentColor = isPostponed ? '#F97316' : '#22C55E';
        return (
            <div
                key={item.id ?? index}
                className="surface-card border-round-lg cursor-pointer"
                style={{
                    border: '1px solid #E2E8F0',
                    borderLeft: `4px solid ${accentColor}`,
                    transition: 'box-shadow 0.15s ease, transform 0.1s ease'
                }}
                onClick={() => handleCardClick(item)}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLDivElement).style.transform = 'none';
                }}
            >
                <div className="p-3">
                    {/* Context row */}
                    {(item.subject || item.type_activity) && (
                        <div className="flex align-items-center gap-1 mb-2">
                            <i className="pi pi-book" style={{ fontSize: '0.65rem', color: accentColor }} />
                            {item.subject && (
                                <span className="text-xs font-medium text-500 overflow-hidden text-overflow-ellipsis white-space-nowrap" style={{ maxWidth: '9rem' }}>
                                    {item.subject}
                                </span>
                            )}
                            {item.subject && item.type_activity && <span className="text-300 text-xs">•</span>}
                            {item.type_activity && <span className="text-xs text-500">{item.type_activity}</span>}
                        </div>
                    )}

                    {/* Title */}
                    <div className="font-bold text-900 line-height-2 mb-1" style={{ fontSize: '0.875rem' }}>
                        {taskTitle(item)}
                    </div>

                    {/* Description */}
                    {item.description && (
                        <div
                            className="text-500 text-xs line-height-3"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}
                        >
                            {item.description}
                        </div>
                    )}

                    {/* Notes */}
                    {Array.isArray(item.notes) && item.notes.length > 0 && (
                        <div className="mt-2 flex flex-column gap-1">
                            {item.notes.map((note, i) => (
                                <div key={i} className="flex gap-2 align-items-start p-2 border-round" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                                    <i className="pi pi-comment" style={{ fontSize: '0.75rem', color: '#F97316', marginTop: '0.1rem', flexShrink: 0 }} />
                                    <span className="text-xs text-700" style={{ fontStyle: 'italic' }}>&ldquo;{note}&rdquo;</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-content-between align-items-center px-3 pb-2 pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                    <div className="flex flex-column gap-1">
                        {item.estimated_time != null && (
                            <span className="flex align-items-center gap-1 text-xs text-500">
                                <i className="pi pi-clock" style={{ fontSize: '0.7rem' }} />
                                {item.estimated_time} horas
                            </span>
                        )}
                        <span className="flex align-items-center gap-1 text-xs text-400">
                            <i className="pi pi-calendar" style={{ fontSize: '0.7rem' }} />
                            {formatDateTime(item.target_date || item.deadline || item.event_date)}
                        </span>
                    </div>

                    {isPostponed && (
                        <Button
                            type="button"
                            label="Reprogramar"
                            icon="pi pi-calendar-plus"
                            size="small"
                            text
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}
                            onClick={(e) => handleOpenReschedule(e, item)}
                        />
                    )}
                    {statusSubactivity === 2 && (
                        <span className="flex align-items-center gap-1 text-xs font-medium" style={{ color: '#22C55E' }}>
                            <i className="pi pi-check-circle" style={{ fontSize: '0.8rem' }} /> Finalizada
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const renderFlatGrid = () => {
        if (loading) {
            return (
                <div className="grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="col-12 md:col-6 lg:col-4">
                            <div className="surface-card border-round-lg p-3" style={{ border: '1px solid var(--surface-border)' }}>
                                <div className="flex flex-column gap-2">
                                    <div className="border-round" style={{ height: '0.6rem', backgroundColor: 'var(--surface-border)', width: '45%' }} />
                                    <div className="border-round" style={{ height: '0.85rem', backgroundColor: 'var(--surface-border)', width: '78%' }} />
                                    <div className="border-round" style={{ height: '0.65rem', backgroundColor: 'var(--surface-border)', width: '60%' }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        if (flatItems.length === 0) {
            return (
                <div className="flex flex-column align-items-center justify-content-center text-center gap-3 py-6">
                    <i className="pi pi-inbox" style={{ fontSize: '2.5rem', color: '#9CA3AF' }} />
                    <span className="text-600 text-sm">
                        {statusSubactivity === 1 ? 'No hay subtareas pospuestas.' : 'No hay subtareas finalizadas.'}
                    </span>
                </div>
            );
        }
        return (
            <div className="grid">
                {flatItems.map((item, index) => (
                    <div key={item.id ?? index} className="col-12 md:col-6 lg:col-4">
                        {renderFlatCard(item, index)}
                    </div>
                ))}
            </div>
        );
    };

    const renderColumn = (col: typeof COLUMNS[number]) => {
        const items = groupedItems[col.key];
        return (
            <div
                key={col.key}
                className="flex flex-column border-round-xl overflow-hidden"
                style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    border: `1px solid ${col.borderColor}`,
                    backgroundColor: col.bgColor,
                    minHeight: '18rem'
                }}
            >
                <div
                    className="flex align-items-center justify-content-between px-3 py-2"
                    style={{ backgroundColor: col.headerBg, borderBottom: `1px solid ${col.borderColor}` }}
                >
                    <span className="font-bold text-sm" style={{ color: col.textColor }}>{col.title}</span>
                    <Tag value={String(items.length)} severity={col.tagSeverity} rounded style={{ fontSize: '0.7rem' }} />
                </div>

                <div className="flex flex-column gap-2 p-2 overflow-y-auto" style={{ flex: 1 }}>
                    {loading ? (
                        <div className="flex flex-column gap-2 pt-1">
                            {[1, 2].map(i => (
                                <div key={i} className="surface-card border-round p-3" style={{ border: '1px solid var(--surface-border)' }}>
                                    <div className="flex flex-column gap-2">
                                        <div className="border-round" style={{ height: '0.6rem', backgroundColor: 'var(--surface-border)', width: '45%' }} />
                                        <div className="border-round" style={{ height: '0.85rem', backgroundColor: 'var(--surface-border)', width: '78%' }} />
                                        <div className="border-round" style={{ height: '0.65rem', backgroundColor: 'var(--surface-border)', width: '92%' }} />
                                        <div className="border-round" style={{ height: '0.65rem', backgroundColor: 'var(--surface-border)', width: '60%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-column align-items-center justify-content-center gap-2 py-5 text-center" style={{ flex: 1 }}>
                            <i className={`pi ${col.emptyIcon}`} style={{ fontSize: '1.75rem', color: col.accentColor, opacity: 0.35 }} />
                            <span className="text-xs text-400">{col.emptyText}</span>
                        </div>
                    ) : (
                        items.map((item, index) => renderSubtaskCard(item, index, col))
                    )}
                </div>
            </div>
        );
    };

    return (
        <Card title="Hoy" className="shadow-1 border-round-xl">
            <Toast ref={toastRef} />
            <div className="flex flex-column gap-4">

                {/* Header */}
                <div className="surface-ground border-round-lg p-3 md:p-4">
                    {/* Row 1: name + tags + help button */}
                    <div className="flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                        <div className="flex align-items-center flex-wrap gap-2">
                            <div className="text-2xl font-bold text-900">Hola, {displayName}</div>
                            <div className="flex flex-wrap gap-2">
                                <Tag value={`Total: ${totalItems}`} icon="pi pi-list" style={{ backgroundColor: '#E5E7EB', color: '#374151' }} />
                                {statusSubactivity === 0 && groupedItems.overdue.length > 0 && <Tag value={`Vencidas: ${groupedItems.overdue.length}`} severity="danger" />}
                                {statusSubactivity === 0 && groupedItems.today.length > 0 && <Tag value={`Hoy: ${groupedItems.today.length}`} severity="success" />}
                                {statusSubactivity === 0 && groupedItems.upcoming.length > 0 && <Tag value={`Próximas: ${groupedItems.upcoming.length}`} severity="info" />}
                            </div>
                        </div>
                        <Button
                            type="button"
                            text
                            label={isHelpOpen ? 'Ocultar ayuda' : '¿Cómo funciona?'}
                            icon={isHelpOpen ? 'pi pi-times-circle' : 'pi pi-info-circle'}
                            onClick={() => setIsHelpOpen(prev => !prev)}
                            size="small"
                        />
                    </div>

                    {isHelpOpen && (
                        <div className="mb-3 p-3 surface-card border-1 border-round" style={{ borderColor: 'var(--surface-border)' }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex flex-column gap-2 text-600 text-sm line-height-3">
                                <li><strong>🔴 Vencidas:</strong> subtareas cuya fecha límite ya expiró.</li>
                                <li><strong>🟢 Para hoy:</strong> subtareas que vencen en lo que resta del día.</li>
                                <li><strong>🔵 Próximas ({NEXT_DAYS_WINDOW} días):</strong> subtareas con fecha en los próximos {NEXT_DAYS_WINDOW} días.</li>
                                <li className="text-500 text-xs mt-1">
                                    <i className="pi pi-sort-amount-down mr-1" />
                                    Ordenadas de la más urgente a la más lejana; ante empate en fecha, primero la de mayor carga estimada.
                                </li>
                            </ul>
                        </div>
                    )}

                    {/* Row 2: capacity tracker */}
                    <CapacityTracker />
                </div>

                {error && <div className="p-3 border-round bg-red-50 text-red-600 font-medium">{error}</div>}

                {/* Unified Toolbar: tabs + filters */}
                <div
                    className="surface-card border-1 border-round-xl"
                    style={{ borderColor: 'var(--surface-border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                    <div className="flex align-items-center justify-content-between flex-wrap gap-2 p-2">
                        {/* Status tabs */}
                        <div className="flex gap-1 overflow-x-auto">
                            {([
                                { label: 'Activas', value: 0 as const, icon: 'pi-play', count: groupedItems.overdue.length + groupedItems.today.length + groupedItems.upcoming.length },
                                { label: 'Pospuestas', value: 1 as const, icon: 'pi-hourglass', count: statusSubactivity === 1 ? flatItems.length : 0 },
                                { label: 'Finalizadas', value: 2 as const, icon: 'pi-check-circle', count: statusSubactivity === 2 ? flatItems.length : 0 }
                            ]).map(tab => {
                                const isActive = statusSubactivity === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => handleTabChange(tab.value)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            whiteSpace: 'nowrap',
                                            border: isActive ? '1px solid #C7D2FE' : '1px solid transparent',
                                            borderRadius: '0.5rem',
                                            padding: '0.45rem 0.85rem',
                                            fontSize: '0.85rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                                            color: isActive ? '#4338CA' : 'var(--text-color-secondary)'
                                        }}
                                    >
                                        <i
                                            className={`pi ${tab.icon}`}
                                            style={{ fontSize: '0.8rem', color: isActive ? '#4F46E5' : 'var(--text-color-secondary)' }}
                                        />
                                        {tab.label}
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minWidth: '1.25rem',
                                                height: '1.25rem',
                                                padding: '0 0.3rem',
                                                borderRadius: '999px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                backgroundColor: isActive ? '#E0E7FF' : 'var(--surface-border)',
                                                color: isActive ? '#4338CA' : 'var(--text-color-secondary)'
                                            }}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Filters toggle button */}
                        <button
                            type="button"
                            onClick={() => setIsFiltersOpen(prev => !prev)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                border: '1px solid var(--surface-border)',
                                borderRadius: '0.5rem',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                backgroundColor: 'var(--surface-card)',
                                color: 'var(--text-color)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{ color: '#4F46E5', fontWeight: 600 }}>Filtros</span>
                            {hasActiveFilters && (
                                <span
                                    style={{
                                        width: '0.45rem',
                                        height: '0.45rem',
                                        borderRadius: '50%',
                                        backgroundColor: '#4F46E5',
                                        flexShrink: 0
                                    }}
                                />
                            )}
                            <span style={{ width: '1px', height: '1rem', backgroundColor: 'var(--surface-border)', margin: '0 0.1rem' }} />
                            <i
                                className={`pi ${isFiltersOpen ? 'pi-chevron-up' : 'pi-chevron-down'}`}
                                style={{ fontSize: '0.75rem', color: '#4F46E5' }}
                            />
                            <i className="pi pi-filter" style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }} />
                        </button>
                    </div>

                    {/* Expandable filter panel */}
                    {isFiltersOpen && (
                        <div className="p-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
                            <div className="grid">
                                <div className="col-12 md:col-3">
                                    <label className="block mb-2 font-medium text-sm">Esfuerzo estimado</label>
                                    <InputText value={filters.estimated_time} onChange={(e) => setFilters(prev => ({ ...prev, estimated_time: e.target.value }))} placeholder="Ej: 2" className="w-full" />
                                </div>
                                <div className="col-12 md:col-3">
                                    <label className="block mb-2 font-medium text-sm">Tipo de actividad</label>
                                    <Dropdown value={filters.type_activity} onChange={(e) => setFilters(prev => ({ ...prev, type_activity: e.value }))} options={ACTIVITY_TYPE_OPTIONS} placeholder="Seleccione tipo" className="w-full" />
                                </div>
                                <div className="col-12 md:col-3">
                                    <label className="block mb-2 font-medium text-sm">Materia</label>
                                    <InputText value={filters.subject} onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))} placeholder="Ej: Cálculo" className="w-full" />
                                </div>
                                <div className="col-12 md:col-3 flex align-items-end gap-2">
                                    <Button label="Aplicar" icon="pi pi-search" onClick={applyFilters} loading={loading} className="w-full md:w-auto" />
                                    <Button label="Limpiar" icon="pi pi-times" severity="secondary" outlined onClick={clearFilters} disabled={loading} className="w-full md:w-auto" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content: kanban for status 0, flat grid for status 1/2 */}
                {statusSubactivity === 0 ? (
                    !loading && totalItems === 0 ? (
                        <div className="flex flex-column align-items-center justify-content-center text-center gap-4 py-6">
                            <div className="flex align-items-center justify-content-center border-circle" style={{ width: '6rem', height: '6rem', backgroundColor: '#F3F4F6' }}>
                                <i className="pi pi-check-circle" style={{ fontSize: '3rem', color: '#9CA3AF' }} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-700 mb-2">¡Todo al día!</div>
                                <div className="text-600 line-height-3" style={{ maxWidth: '24rem' }}>
                                    No tienes subtareas vencidas ni programadas para los próximos {NEXT_DAYS_WINDOW} días.
                                    Crea una actividad y empieza a organizar tu tiempo.
                                </div>
                            </div>
                            <Button label="Crear actividad" icon="pi pi-plus" size="large" onClick={() => setShowCreateModal(true)} />
                        </div>
                    ) : (
                        <div className="flex gap-3" style={{ overflowX: 'auto', alignItems: 'flex-start' }}>
                            {COLUMNS.map(col => renderColumn(col))}
                        </div>
                    )
                ) : (
                    renderFlatGrid()
                )}
            </div>

            {/* Activity Detail Modal */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-book text-primary" />
                        <span>Detalle de actividad</span>
                    </div>
                }
                visible={activityDetailVisible}
                onHide={() => { setActivityDetailVisible(false); setActivityDetail(null); }}
                style={{ width: '32rem', maxWidth: '95vw' }}
                modal
                draggable={false}
            >
                {activityDetailLoading ? (
                    <div className="flex justify-content-center py-5">
                        <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: 'var(--primary-color)' }} />
                    </div>
                ) : activityDetail ? (
                    <div className="flex flex-column gap-4">
                        <div>
                            {activityDetail.type_activity && (
                                <span
                                    className="px-2 py-1 border-round text-xs font-bold mb-2 inline-block"
                                    style={{ backgroundColor: '#EEF2FF', color: '#4338CA' }}
                                >
                                    {activityDetail.type_activity}
                                </span>
                            )}
                            <div className="text-900 font-bold text-xl line-height-2 mt-1">{activityDetail.title}</div>
                            {activityDetail.description && (
                                <div className="text-600 text-sm line-height-3 mt-2">{activityDetail.description}</div>
                            )}
                        </div>

                        {/* Progress bar */}
                        {activityDetail.total_subactivities != null && (
                            <div className="p-3 border-round" style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--surface-border)' }}>
                                <div className="flex justify-content-between align-items-end mb-2">
                                    <span className="text-xs font-semibold text-500" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progreso</span>
                                    <span className="text-sm font-bold text-primary">
                                        {activityDetail.total_subactivities > 0
                                            ? Math.round(((activityDetail.total_completed ?? 0) / activityDetail.total_subactivities) * 100)
                                            : 0}%
                                    </span>
                                </div>
                                <div className="w-full border-round" style={{ height: '0.6rem', backgroundColor: 'var(--surface-border)', overflow: 'hidden' }}>
                                    <div
                                        className="border-round"
                                        style={{
                                            height: '100%',
                                            width: `${activityDetail.total_subactivities > 0 ? Math.round(((activityDetail.total_completed ?? 0) / activityDetail.total_subactivities) * 100) : 0}%`,
                                            backgroundColor: 'var(--primary-color)',
                                            transition: 'width 0.5s ease'
                                        }}
                                    />
                                </div>
                                <div className="text-xs text-400 text-right mt-1">
                                    {activityDetail.total_completed ?? 0} de {activityDetail.total_subactivities} subtareas completadas
                                </div>
                            </div>
                        )}

                        <Divider className="my-0" />

                        <div className="grid">
                            {activityDetail.subject && (
                                <div className="col-6">
                                    <div className="surface-ground border-1 border-round p-3" style={{ borderColor: 'var(--surface-border)' }}>
                                        <div className="text-xs text-500 mb-1 flex align-items-center gap-1">
                                            <i className="pi pi-book" style={{ fontSize: '0.7rem' }} /> Materia
                                        </div>
                                        <div className="text-900 font-medium text-sm">{activityDetail.subject}</div>
                                    </div>
                                </div>
                            )}
                            {activityDetail.grade != null && (
                                <div className="col-6">
                                    <div className="surface-ground border-1 border-round p-3" style={{ borderColor: 'var(--surface-border)' }}>
                                        <div className="text-xs text-500 mb-1 flex align-items-center gap-1">
                                            <i className="pi pi-star" style={{ fontSize: '0.7rem' }} /> Calificación
                                        </div>
                                        <div className="text-900 font-medium text-sm">{activityDetail.grade}</div>
                                    </div>
                                </div>
                            )}
                            {activityDetail.event_date && (
                                <div className="col-6">
                                    <div className="surface-ground border-1 border-round p-3" style={{ borderColor: 'var(--surface-border)' }}>
                                        <div className="text-xs text-500 mb-1 flex align-items-center gap-1">
                                            <i className="pi pi-calendar" style={{ fontSize: '0.7rem' }} /> Fecha del evento
                                        </div>
                                        <div className="text-900 font-medium text-sm">{formatDateTime(activityDetail.event_date)}</div>
                                    </div>
                                </div>
                            )}
                            {activityDetail.deadline && (
                                <div className="col-6">
                                    <div className="surface-ground border-1 border-round p-3" style={{ borderColor: 'var(--surface-border)' }}>
                                        <div className="text-xs text-500 mb-1 flex align-items-center gap-1">
                                            <i className="pi pi-clock" style={{ fontSize: '0.7rem' }} /> Fecha límite
                                        </div>
                                        <div className="text-900 font-medium text-sm">{formatDateTime(activityDetail.deadline)}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-content-end">
                            <Button
                                label="Cerrar"
                                severity="secondary"
                                outlined
                                onClick={() => { setActivityDetailVisible(false); setActivityDetail(null); }}
                            />
                        </div>
                    </div>
                ) : null}
            </Dialog>

            {/* Reschedule Modal */}
            <RescheduleModal
                isOpen={rescheduleVisible}
                onClose={() => { setRescheduleVisible(false); setRescheduleItem(null); }}
                subActivityId={rescheduleItem?.id ?? 0}
                title={taskTitle(rescheduleItem ?? {})}
                estimatedTime={rescheduleItem?.estimated_time}
                currentDate={rescheduleItem ? formatDateTime(rescheduleItem.target_date) : null}
                onValidate={handleValidateTentativeDate}
                onSave={handleSaveReschedule}
            />

            {/* Create Activity Modal */}
            <CreateActivityModal
                visible={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                onSuccess={() => fetchToday()}
            />

            {/* Postpone Modal */}
            <Dialog
                header="Posponer subtarea"
                visible={postponeVisible}
                onHide={() => { setPostponeVisible(false); setPostponeItem(null); }}
                style={{ width: '26rem', maxWidth: '95vw' }}
                modal
                draggable={false}
            >
                <div className="flex flex-column gap-3">
                    <div className="text-600 text-sm">
                        ¿Por qué necesitas posponer <strong>&ldquo;{taskTitle(postponeItem ?? {})}&rdquo;</strong>?
                    </div>
                    <div>
                        <label className="block mb-2 font-medium text-sm">Nota (opcional pero recomendada)</label>
                        <textarea
                            className="w-full border-1 border-round p-3 text-sm"
                            style={{ minHeight: '6rem', resize: 'none', outline: 'none', borderColor: 'var(--surface-border)', fontFamily: 'inherit' }}
                            placeholder="Ej: Aún estoy esperando respuesta del profesor..."
                            value={postponeNote}
                            onChange={(e) => setPostponeNote(e.target.value)}
                        />
                        <span className="text-xs text-400">La nota quedará guardada junto a la subtarea.</span>
                    </div>
                    <div className="flex justify-content-end gap-2 pt-1">
                        <Button label="Cancelar" severity="secondary" outlined onClick={() => { setPostponeVisible(false); setPostponeItem(null); }} />
                        <Button label="Posponer" icon="pi pi-hourglass" severity="warning" onClick={handleConfirmPostpone} />
                    </div>
                </div>
            </Dialog>
        </Card>
    );
};

export default Dashboard;