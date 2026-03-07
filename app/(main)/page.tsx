/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { decodeSessionTokenPayload, getSessionToken, getSessionUserDisplayName, getSessionUserFromStorage, validateAndRefreshToken } from '@/lib/sessionUser';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';

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
    estimated_time?: number | string | null;
    target_date?: string | null;
    deadline?: string | null;
    event_date?: string | null;
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

const Dashboard = () => {
    const router = useRouter();
    const [displayName, setDisplayName] = useState('usuario');
    const [groupedItems, setGroupedItems] = useState<{ overdue: TodayActivityItem[]; today: TodayActivityItem[]; upcoming: TodayActivityItem[] }>({
        overdue: [],
        today: [],
        upcoming: []
    });
    const [filters, setFilters] = useState<TodayFilters>({
        estimated_time: '',
        type_activity: '',
        subject: ''
    });
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activityModalVisible, setActivityModalVisible] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [subTasks, setSubTasks] = useState<any[]>([]);
    const [loadingSubTasks, setLoadingSubTasks] = useState(false);
    const [showSubTasks, setShowSubTasks] = useState(false);

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

    const taskTitle = (item: TodayActivityItem): string => {
        return String(item.title || item.name || '-');
    };

    const buildTodayRequestUrl = (currentFilters: TodayFilters): string => {
        const params = new URLSearchParams();

        if (currentFilters.estimated_time.trim()) {
            params.set('estimated_time', currentFilters.estimated_time.trim());
        }

        if (currentFilters.type_activity.trim()) {
            params.set('type_activity', currentFilters.type_activity.trim());
        }

        if (currentFilters.subject.trim()) {
            params.set('subject', currentFilters.subject.trim());
        }

        const queryString = params.toString();
        return `${process.env.NEXT_PUBLIC_API_URL}/today/${queryString ? `?${queryString}` : ''}`;
    };

    const fetchToday = async (currentFilters: TodayFilters = filters) => {
        const validToken = await validateAndRefreshToken();
        if (!validToken) {
            router.replace(ROUTES.AUTH.LOGIN);
            return;
        }

        const authorizationHeader = validToken.startsWith('Bearer ') ? validToken : `Bearer ${validToken}`;
        const requestUrl = buildTodayRequestUrl(currentFilters);

        setLoading(true);
        setError('');

        try {
            const response = await fetch(requestUrl, {
                headers: { Authorization: authorizationHeader }
            });

            if (!response.ok) {
                throw new Error('No se pudieron cargar las actividades de hoy.');
            }

            const data = (await response.json()) as TodayResponse;
            const expiredList = Array.isArray(data?.expired) ? data.expired : [];
            const todayList = Array.isArray(data?.today) ? data.today : [];
            const upcomingList = Array.isArray(data?.upcoming) ? data.upcoming : [];

            const nextGroupedItems = {
                overdue: [...expiredList].sort(sortByDateThenEffort),
                today: [...todayList].sort(sortByDateThenEffort),
                upcoming: [...upcomingList].sort(sortByDateThenEffort)
            };

            setGroupedItems(nextGroupedItems);
        } catch (fetchError: any) {
            setError(fetchError.message || 'Error al cargar actividades del dashboard.');
            setGroupedItems({ overdue: [], today: [], upcoming: [] });
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        fetchToday(filters);
    };

    const clearFilters = () => {
        const emptyFilters: TodayFilters = {
            estimated_time: '',
            type_activity: '',
            subject: ''
        };

        setFilters(emptyFilters);
        fetchToday(emptyFilters);
    };

    const totalItems = groupedItems.overdue.length + groupedItems.today.length + groupedItems.upcoming.length;
    const hasActiveFilters = Boolean(filters.estimated_time.trim() || filters.type_activity.trim() || filters.subject.trim());

    const fetchActivityDetails = async (activityId: number) => {
        const validToken = await validateAndRefreshToken();
        if (!validToken) {
            router.replace(ROUTES.AUTH.LOGIN);
            return;
        }

        const authorizationHeader = validToken.startsWith('Bearer ') ? validToken : `Bearer ${validToken}`;
        const requestUrl = `${process.env.NEXT_PUBLIC_API_URL}/activities/${activityId}/`;

        setLoadingActivity(true);

        try {
            const response = await fetch(requestUrl, {
                headers: { Authorization: authorizationHeader }
            });

            if (!response.ok) {
                throw new Error('No se pudo cargar la actividad.');
            }

            const data = await response.json();
            setSelectedActivity(data);
            setActivityModalVisible(true);
        } catch (fetchError: any) {
            console.error('Error al cargar actividad:', fetchError);
        } finally {
            setLoadingActivity(false);
        }
    };

    const fetchSubTasks = async (activityId: number) => {
        const validToken = await validateAndRefreshToken();
        if (!validToken) {
            router.replace(ROUTES.AUTH.LOGIN);
            return;
        }

        const authorizationHeader = validToken.startsWith('Bearer ') ? validToken : `Bearer ${validToken}`;
        const requestUrl = `${process.env.NEXT_PUBLIC_API_URL}/sub-activities/by-activity/${activityId}`;

        setLoadingSubTasks(true);

        try {
            const response = await fetch(requestUrl, {
                headers: { Authorization: authorizationHeader }
            });

            if (!response.ok) {
                throw new Error('No se pudieron cargar las subtareas.');
            }

            const data = await response.json();
            const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
            setSubTasks(list);
        } catch (fetchError: any) {
            setSubTasks([]);
        } finally {
            setLoadingSubTasks(false);
        }
    };

    const handleRowClick = (rowData: TodayActivityItem) => {
        if (rowData.activity) {
            fetchActivityDetails(rowData.activity as number);
        }
    };

    const toggleSubTasks = () => {
        if (!showSubTasks && selectedActivity?.id && subTasks.length === 0) {
            fetchSubTasks(selectedActivity.id);
        }
        setShowSubTasks((prev) => !prev);
    };

    const handleCloseModal = () => {
        setActivityModalVisible(false);
        setShowSubTasks(false);
        setSubTasks([]);
    };

    useEffect(() => {
        const token = getSessionToken();
        const tokenPayload = (token ? decodeSessionTokenPayload(token) : null) as TokenPayload | null;

        const displayNameFromToken = tokenPayload?.first_name || tokenPayload?.firstName || tokenPayload?.name || tokenPayload?.username || tokenPayload?.email;

        const fallbackName = getSessionUserDisplayName('usuario');
        setDisplayName(displayNameFromToken || fallbackName);

        const sessionUser = getSessionUserFromStorage();
        fetchToday();
    }, []);

    return (
        <Card title="Hoy" className="shadow-1 border-round-xl">
            <div className="flex flex-column gap-4">
                <div className="surface-ground border-round-lg p-3 md:p-4">
                    <div className="text-2xl font-bold text-900">{`Hola ${displayName}`}</div>
                    <div className="text-600 mt-2">
                        Organiza tus subtareas en <strong>Vencidas</strong>, <strong>Para hoy</strong> y <strong>Proximas ({NEXT_DAYS_WINDOW} dias)</strong>.
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-2 py-1 border-round font-medium text-sm surface-card shadow-1">Total: {totalItems}</span>
                        <span className="px-2 py-1 border-round font-medium text-sm surface-card shadow-1">Vencidas: {groupedItems.overdue.length}</span>
                        <span className="px-2 py-1 border-round font-medium text-sm surface-card shadow-1">Hoy: {groupedItems.today.length}</span>
                        <span className="px-2 py-1 border-round font-medium text-sm surface-card shadow-1">Proximas: {groupedItems.upcoming.length}</span>
                    </div>
                </div>

                {error && <div className="p-3 border-round bg-red-50 text-red-600 font-medium">{error}</div>}

                <div className="surface-card border-1 border-round-lg p-3 md:p-4" style={{ borderColor: 'var(--surface-border)' }}>
                    <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                        <Button
                            type="button"
                            text
                            icon={`pi ${isFiltersOpen ? 'pi-chevron-down' : 'pi-chevron-right'}`}
                            iconPos="right"
                            onClick={() => setIsFiltersOpen((prev) => !prev)}
                            className="p-0"
                            label="Filtros"
                        />
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-filter text-600" aria-hidden="true" />
                            {hasActiveFilters && <span className="text-sm text-600">Filtros activos</span>}
                        </div>
                    </div>

                    {isFiltersOpen && (
                        <div className="grid mt-2">
                            <div className="col-12 md:col-3">
                                <label htmlFor="estimated-time-filter" className="block mb-2 font-medium">Esfuerzo estimado</label>
                                <InputText
                                    id="estimated-time-filter"
                                    value={filters.estimated_time}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, estimated_time: e.target.value }))}
                                    placeholder="Ej: 2"
                                    className="w-full"
                                />
                            </div>
                            <div className="col-12 md:col-3">
                                <label htmlFor="type-activity-filter" className="block mb-2 font-medium">Tipo de actividad</label>
                                <Dropdown
                                    id="type-activity-filter"
                                    value={filters.type_activity}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, type_activity: e.value }))}
                                    options={ACTIVITY_TYPE_OPTIONS}
                                    placeholder="Seleccione tipo"
                                    className="w-full"
                                />
                            </div>
                            <div className="col-12 md:col-3">
                                <label htmlFor="subject-filter" className="block mb-2 font-medium">Materia</label>
                                <InputText
                                    id="subject-filter"
                                    value={filters.subject}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
                                    placeholder="Ej: desarrollo"
                                    className="w-full"
                                />
                            </div>
                            <div className="col-12 md:col-3 flex align-items-end gap-2">
                                <Button label="Aplicar" onClick={applyFilters} loading={loading} className="w-full md:w-auto" />
                                <Button label="Limpiar" severity="secondary" outlined onClick={clearFilters} disabled={loading} className="w-full md:w-auto" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-column gap-4">
                    <div className="surface-card border-1 border-round-lg p-3 md:p-4" style={{ borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' }}>
                        <div className="flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
                            <h3 className="m-0">Vencidas</h3>
                            <span
                                className="px-2 py-1 border-round text-sm font-medium"
                                style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}
                            >
                                {groupedItems.overdue.length}
                            </span>
                        </div>
                        <DataTable
                            value={groupedItems.overdue}
                            loading={loading}
                            emptyMessage="No hay subtareas vencidas."
                            dataKey="id"
                            stripedRows
                            size="small"
                            onRowClick={(e) => handleRowClick(e.data)}
                            rowHover
                            style={{ cursor: 'pointer' }}
                        >
                            <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                            <Column
                                header="Subtarea"
                                body={(rowData: TodayActivityItem) => <span style={{ color: '#B91C1C', fontWeight: 600 }}>{taskTitle(rowData)}</span>}
                            />
                            <Column field="estimated_time" header="Esfuerzo" body={(rowData: TodayActivityItem) => rowData.estimated_time ?? '-'} />
                            <Column header="Fecha" body={(rowData: TodayActivityItem) => formatDateTime(rowData.target_date || rowData.deadline || rowData.event_date)} />
                        </DataTable>
                    </div>

                    <div className="surface-card border-1 border-round-lg p-3 md:p-4" style={{ borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }}>
                        <div className="flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
                            <h3 className="m-0">Para hoy</h3>
                            <span
                                className="px-2 py-1 border-round text-sm font-medium"
                                style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}
                            >
                                {groupedItems.today.length}
                            </span>
                        </div>
                        <DataTable
                            value={groupedItems.today}
                            loading={loading}
                            emptyMessage="No hay subtareas para hoy."
                            dataKey="id"
                            stripedRows
                            size="small"
                            onRowClick={(e) => handleRowClick(e.data)}
                            rowHover
                            style={{ cursor: 'pointer' }}
                        >
                            <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                            <Column
                                header="Subtarea"
                                body={(rowData: TodayActivityItem) => <span style={{ color: '#166534', fontWeight: 600 }}>{taskTitle(rowData)}</span>}
                            />
                            <Column field="estimated_time" header="Esfuerzo" body={(rowData: TodayActivityItem) => rowData.estimated_time ?? '-'} />
                            <Column header="Fecha" body={(rowData: TodayActivityItem) => formatDateTime(rowData.target_date || rowData.deadline || rowData.event_date)} />
                        </DataTable>
                    </div>

                    <div className="surface-card border-1 border-round-lg p-3 md:p-4" style={{ borderColor: '#93C5FD', backgroundColor: '#EFF6FF' }}>
                        <div className="flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
                            <h3 className="m-0">Proximas ({NEXT_DAYS_WINDOW} dias)</h3>
                            <span
                                className="px-2 py-1 border-round text-sm font-medium"
                                style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #93C5FD' }}
                            >
                                {groupedItems.upcoming.length}
                            </span>
                        </div>
                        <DataTable
                            value={groupedItems.upcoming}
                            loading={loading}
                            emptyMessage={`No hay subtareas en los proximos ${NEXT_DAYS_WINDOW} dias.`}
                            dataKey="id"
                            stripedRows
                            size="small"
                            onRowClick={(e) => handleRowClick(e.data)}
                            rowHover
                            style={{ cursor: 'pointer' }}
                        >
                            <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                            <Column
                                header="Subtarea"
                                body={(rowData: TodayActivityItem) => <span style={{ color: '#1D4ED8', fontWeight: 600 }}>{taskTitle(rowData)}</span>}
                            />
                            <Column field="estimated_time" header="Esfuerzo" body={(rowData: TodayActivityItem) => rowData.estimated_time ?? '-'} />
                            <Column header="Fecha" body={(rowData: TodayActivityItem) => formatDateTime(rowData.target_date || rowData.deadline || rowData.event_date)} />
                        </DataTable>
                    </div>
                </div>

                <Dialog
                    header="Detalles de la Actividad"
                    visible={activityModalVisible}
                    style={{ width: '50vw' }}
                    breakpoints={{ '960px': '75vw', '641px': '90vw' }}
                    onHide={handleCloseModal}
                    draggable={false}
                    resizable={false}
                >
                    {loadingActivity ? (
                        <div className="flex align-items-center justify-content-center p-4">
                            <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                        </div>
                    ) : selectedActivity ? (
                        <div className="flex flex-column gap-3">
                            <div>
                                <label className="block text-600 font-medium mb-1">Título</label>
                                <div className="text-900 font-bold text-xl">{selectedActivity.title || '-'}</div>
                            </div>
                            <div>
                                <label className="block text-600 font-medium mb-1">Descripción</label>
                                <div className="text-900 line-height-3">{selectedActivity.description || '-'}</div>
                            </div>
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <label className="block text-600 font-medium mb-1">Tipo de actividad</label>
                                    <div className="text-900">
                                        <span className="px-2 py-1 border-round font-medium" style={{ backgroundColor: '#E0E7FF', color: '#4338CA' }}>
                                            {selectedActivity.type_activity || '-'}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <label className="block text-600 font-medium mb-1">Materia</label>
                                    <div className="text-900 font-medium">{selectedActivity.subject || '-'}</div>
                                </div>
                            </div>
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <label className="block text-600 font-medium mb-1">
                                        <i className="pi pi-calendar mr-1"></i> Fecha límite
                                    </label>
                                    <div className="text-900">{formatDateTime(selectedActivity.deadline)}</div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <label className="block text-600 font-medium mb-1">
                                        <i className="pi pi-calendar-plus mr-1"></i> Fecha del evento
                                    </label>
                                    <div className="text-900">{formatDateTime(selectedActivity.event_date)}</div>
                                </div>
                            </div>
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <label className="block text-600 font-medium mb-1">Calificación</label>
                                    <div className="text-900">{selectedActivity.grade !== null && selectedActivity.grade !== undefined ? selectedActivity.grade : 'Sin calificar'}</div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <label className="block text-600 font-medium mb-1">Fecha de creación</label>
                                    <div className="text-900">{formatDateTime(selectedActivity.created_at)}</div>
                                </div>
                            </div>
                            {selectedActivity.updated_at && (
                                <div>
                                    <label className="block text-600 font-medium mb-1">Última actualización</label>
                                    <div className="text-600 text-sm">{formatDateTime(selectedActivity.updated_at)}</div>
                                </div>
                            )}

                            <div className="border-top-1 border-200 pt-3 mt-2">
                                <Button
                                    type="button"
                                    text
                                    icon={`pi ${showSubTasks ? 'pi-chevron-down' : 'pi-chevron-right'}`}
                                    iconPos="right"
                                    onClick={toggleSubTasks}
                                    label="Ver las subtareas"
                                    className="p-0 font-medium"
                                />
                                
                                {showSubTasks && (
                                    <div className="mt-3">
                                        {loadingSubTasks ? (
                                            <div className="flex align-items-center justify-content-center p-3">
                                                <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem' }}></i>
                                            </div>
                                        ) : subTasks.length > 0 ? (
                                            <DataTable
                                                value={subTasks}
                                                size="small"
                                                stripedRows
                                                emptyMessage="No hay subtareas"
                                            >
                                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: '50px' }} />
                                                <Column field="name" header="Nombre" body={(rowData) => rowData.name || rowData.title || '-'} />
                                                <Column field="estimated_time" header="Esfuerzo" style={{ width: '100px' }} body={(rowData) => rowData.estimated_time ?? '-'} />
                                                <Column field="target_date" header="Fecha" style={{ width: '150px' }} body={(rowData) => formatDateTime(rowData.target_date)} />
                                            </DataTable>
                                        ) : (
                                            <div className="text-center text-600 p-3">No hay subtareas para esta actividad</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-600 p-4">No hay información disponible</div>
                    )}
                </Dialog>
            </div>
        </Card>
    );
};

export default Dashboard;
