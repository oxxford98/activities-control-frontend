/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { decodeSessionTokenPayload, getSessionToken } from '@/lib/sessionUser';

interface ActivityItem {
    id: number;
    title: string;
    type_activity: string;
    user?: number;
    raw: Record<string, any>;
}

interface SubActivityItem {
    id?: number;
    name: string;
    description?: string | null;
    target_date?: string | null;
    estimated_time?: number | string | null;
    activity?: number;
    [key: string]: any;
}

interface ActivityDetail {
    title: string;
    type_activity: string;
    description: string | null;
    event_date: string | null;
    deadline: string | null;
}

interface TokenPayload {
    user_id?: number | string;
    id?: number | string;
    sub?: number | string;
    [key: string]: any;
}

const ActivitiesPage = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [activitiesError, setActivitiesError] = useState('');
    const [activitySuccessMessage, setActivitySuccessMessage] = useState('');
    const [successDialogVisible, setSuccessDialogVisible] = useState(false);

    const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
    const [selectedActivityDetail, setSelectedActivityDetail] = useState<ActivityDetail | null>(null);
    const [activityDetailLoading, setActivityDetailLoading] = useState(false);
    const [activityDetailError, setActivityDetailError] = useState('');

    const [subActivities, setSubActivities] = useState<SubActivityItem[]>([]);
    const [subActivitiesLoading, setSubActivitiesLoading] = useState(false);
    const [subActivitiesError, setSubActivitiesError] = useState('');

    const [showWorkPlanForm, setShowWorkPlanForm] = useState(false);
    const [taskName, setTaskName] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('');
    const [subtaskMessage, setSubtaskMessage] = useState('');
    const [subtaskLoading, setSubtaskLoading] = useState(false);

    const workPlanEndpoint = process.env.NEXT_PUBLIC_WORK_PLAN_ENDPOINT || '/sub-activities/';
    const workPlanUrl = workPlanEndpoint.startsWith('http') ? workPlanEndpoint : `${process.env.NEXT_PUBLIC_API_URL}${workPlanEndpoint}`;

    const subActivitiesByActivityEndpoint = process.env.NEXT_PUBLIC_SUB_ACTIVITIES_BY_ACTIVITY_ENDPOINT || '/sub-activities/by-activity/';
    const getSubActivitiesByActivityUrls = (activityId: number) => {
        const baseUrl = subActivitiesByActivityEndpoint.startsWith('http')
            ? `${subActivitiesByActivityEndpoint.replace(/\/$/, '')}/${activityId}`
            : `${process.env.NEXT_PUBLIC_API_URL}${subActivitiesByActivityEndpoint}${activityId}`;

        return [baseUrl, `${baseUrl}/`];
    };

    const getActivityDetailUrl = (activityId: number) => `${process.env.NEXT_PUBLIC_API_URL}/activities/${activityId}/`;

    const handleOpenCreateDialog = () => {
        window.dispatchEvent(new Event('open-create-activity-dialog'));
    };

    const fetchActivities = async () => {
        const token = getSessionToken();
        if (!token) return;

        const tokenPayload = (token ? decodeSessionTokenPayload(token) : null) as TokenPayload | null;

        setActivitiesLoading(true);
        setActivitiesError('');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activities/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('No se pudieron cargar las actividades.');
            }

            const data = await response.json();
            const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

            const payloadUserId = Number.parseInt(String(tokenPayload?.user_id ?? tokenPayload?.id ?? tokenPayload?.sub), 10);
            const hasPayloadUserId = !Number.isNaN(payloadUserId);

            const formatted: ActivityItem[] = list
                .filter((item: any) => {
                    if (!hasPayloadUserId) return true;
                    if (item?.user === undefined || item?.user === null) return true;
                    return Number(item.user) === payloadUserId;
                })
                .map((item: any) => ({
                    id: Number(item.id),
                    title: String(item.title ?? ''),
                    type_activity: String(item.type_activity ?? ''),
                    user: item.user !== undefined ? Number(item.user) : undefined,
                    raw: item
                }));

            setActivities(formatted);
        } catch (error: any) {
            setActivitiesError(error.message || 'Error al cargar actividades.');
        } finally {
            setActivitiesLoading(false);
        }
    };

    const fetchSubActivitiesByActivity = async (activityId: number) => {
        const token = getSessionToken();
        if (!token) return;

        setSubActivitiesLoading(true);
        setSubActivitiesError('');

        try {
            const candidateUrls = getSubActivitiesByActivityUrls(activityId);
            let response: Response | null = null;
            let lastErrorDetail = '';

            for (const requestUrl of candidateUrls) {
                const attempt = await fetch(requestUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (attempt.ok) {
                    response = attempt;
                    break;
                }

                const errorData = await attempt.json().catch(() => ({}));
                const backendDetail =
                    (typeof errorData?.detail === 'string' && errorData.detail) ||
                    (typeof errorData?.message === 'string' && errorData.message) ||
                    '';

                lastErrorDetail = `(${attempt.status}) ${backendDetail}`.trim();
            }

            if (!response) {
                throw new Error(`No se pudieron cargar las subtareas de la actividad. ${lastErrorDetail}`.trim());
            }

            const data = await response.json();
            const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
            setSubActivities(list);
        } catch (error: any) {
            setSubActivitiesError(error.message || 'Error al cargar subtareas.');
            setSubActivities([]);
        } finally {
            setSubActivitiesLoading(false);
        }
    };

    const fetchActivityDetail = async (activityId: number) => {
        const token = getSessionToken();
        if (!token) return;

        setActivityDetailLoading(true);
        setActivityDetailError('');

        try {
            const requestUrl = getActivityDetailUrl(activityId);
            const response = await fetch(requestUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const backendDetail =
                    (typeof errorData?.detail === 'string' && errorData.detail) ||
                    (typeof errorData?.message === 'string' && errorData.message) ||
                    '';
                throw new Error(`No se pudo cargar la información de la actividad. (${response.status}) ${backendDetail}`.trim());
            }

            const data = await response.json();
            setSelectedActivityDetail({
                title: String(data?.title ?? ''),
                type_activity: String(data?.type_activity ?? ''),
                description: data?.description ?? null,
                event_date: data?.event_date ?? null,
                deadline: data?.deadline ?? null
            });
        } catch (error: any) {
            setActivityDetailError(error.message || 'Error al cargar detalle de actividad.');
            setSelectedActivityDetail(null);
        } finally {
            setActivityDetailLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();

        const refreshHandler = (event: Event) => {
            const customEvent = event as CustomEvent<{ message?: string }>;
            if (customEvent?.detail?.message) {
                setActivitySuccessMessage(customEvent.detail.message);
                setSuccessDialogVisible(true);
            }
            fetchActivities();
        };

        window.addEventListener('activity-created', refreshHandler);
        return () => {
            window.removeEventListener('activity-created', refreshHandler);
        };
    }, []);

    const openActivityDetails = (activity: ActivityItem) => {
        setSelectedActivity(activity);
        setSelectedActivityDetail(null);
        setActivityDetailError('');
        setShowWorkPlanForm(false);
        setTaskName('');
        setTaskDescription('');
        setTargetDate('');
        setEstimatedTime('');
        setSubtaskMessage('');
        fetchActivityDetail(activity.id);
        fetchSubActivitiesByActivity(activity.id);
    };

    const toIsoOrNull = (value: string): string | null => {
        if (!value) return null;
        const parsedDate = new Date(value);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
    };

    const handleSubtaskSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!taskName.trim() || !taskDescription.trim() || !targetDate || !estimatedTime.trim() || !selectedActivity?.id) {
            setSubtaskMessage('Completa todos los campos de la subtarea.');
            return;
        }

        const token = getSessionToken();
        if (!token) {
            setSubtaskMessage('Sesión no válida. Inicia sesión nuevamente.');
            return;
        }

        const estimatedTimeValue = Number.parseInt(estimatedTime, 10);
        if (Number.isNaN(estimatedTimeValue) || estimatedTimeValue < 1) {
            setSubtaskMessage('El tiempo estimado debe ser un número entero mayor o igual a 1.');
            return;
        }

        const targetDateIso = toIsoOrNull(targetDate);
        if (!targetDateIso) {
            setSubtaskMessage('La fecha objetivo no es válida.');
            return;
        }

        setSubtaskLoading(true);
        setSubtaskMessage('');

        try {
            const response = await fetch(workPlanUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: taskName.trim(),
                    description: taskDescription.trim() ? taskDescription.trim() : null,
                    target_date: targetDateIso,
                    estimated_time: estimatedTimeValue,
                    activity: selectedActivity.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const message =
                    (typeof errorData?.detail === 'string' && errorData.detail) ||
                    (typeof errorData?.message === 'string' && errorData.message) ||
                    'No se pudo crear el plan de trabajo.';
                throw new Error(message);
            }

            setSubtaskMessage('Plan de trabajo creado correctamente.');
            setTaskName('');
            setTaskDescription('');
            setTargetDate('');
            setEstimatedTime('');
            fetchSubActivitiesByActivity(selectedActivity.id);
        } catch (error: any) {
            setSubtaskMessage(error.message || 'Error al crear el plan de trabajo.');
        } finally {
            setSubtaskLoading(false);
        }
    };

    const titleTemplate = (rowData: ActivityItem) => {
        return <Button label={rowData.title} link className="p-0 text-left" onClick={() => openActivityDetails(rowData)} />;
    };

    const formatSubActivityDate = (value: string | null | undefined) => {
        if (!value) return '-';
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return String(value);
        return parsedDate.toLocaleString('es-CO');
    };

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return '-';
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return String(value);
        return parsedDate.toLocaleString('es-CO');
    };

    return (
        <Card title="Actividades">
            <div className="flex flex-column gap-4">
                <div className="flex justify-content-end">
                    <Button label="Crear actividad" icon="pi pi-plus" onClick={handleOpenCreateDialog} />
                </div>

                {activitiesError && <div className="text-red-500 font-medium">{activitiesError}</div>}

                <div className="grid">
                    <div className="col-12 lg:col-7">
                        <DataTable value={activities} loading={activitiesLoading} emptyMessage="No hay actividades registradas.">
                            <Column field="id" header="ID" />
                            <Column field="title" header="Título" body={titleTemplate} />
                            <Column field="type_activity" header="Tipo de actividad" />
                        </DataTable>
                    </div>

                    <div className="col-12 lg:col-5">
                        <Card title={selectedActivity ? `Subtareas: ${selectedActivity.title}` : 'Subtareas'}>
                            {!selectedActivity ? (
                                <div className="text-600">Selecciona una actividad para ver sus subtareas.</div>
                            ) : (
                                <div className="flex flex-column gap-3">
                                    {activityDetailError && <div className="text-red-500 font-medium">{activityDetailError}</div>}

                                    {activityDetailLoading ? (
                                        <div className="text-600">Cargando información de la actividad...</div>
                                    ) : selectedActivityDetail ? (
                                        <div className="flex flex-column gap-2">
                                            <div className="flex flex-column">
                                                <span className="font-semibold">Título</span>
                                                <span>{selectedActivityDetail.title || '-'}</span>
                                            </div>
                                            <div className="flex flex-column">
                                                <span className="font-semibold">Tipo de actividad</span>
                                                <span>{selectedActivityDetail.type_activity || '-'}</span>
                                            </div>
                                            <div className="flex flex-column">
                                                <span className="font-semibold">Descripción</span>
                                                <span>{selectedActivityDetail.description || '-'}</span>
                                            </div>
                                            <div className="flex flex-column">
                                                <span className="font-semibold">Fecha del evento</span>
                                                <span>{formatDateTime(selectedActivityDetail.event_date)}</span>
                                            </div>
                                            <div className="flex flex-column">
                                                <span className="font-semibold">Fecha límite</span>
                                                <span>{formatDateTime(selectedActivityDetail.deadline)}</span>
                                            </div>
                                        </div>
                                    ) : null}

                                    {subActivitiesError && <div className="text-red-500 font-medium">{subActivitiesError}</div>}

                                    <DataTable value={subActivities} loading={subActivitiesLoading} emptyMessage="No hay subtareas para esta actividad.">
                                        <Column field="name" header="Nombre" />
                                        <Column field="description" header="Descripción" body={(rowData: SubActivityItem) => rowData.description || '-'} />
                                        <Column field="target_date" header="Fecha objetivo" body={(rowData: SubActivityItem) => formatSubActivityDate(rowData.target_date || null)} />
                                    </DataTable>

                                    <div>
                                        <Button type="button" label="Añadir plan de trabajo" onClick={() => setShowWorkPlanForm((prev) => !prev)} />
                                    </div>

                                    {showWorkPlanForm && (
                                        <form className="flex flex-column gap-3" onSubmit={handleSubtaskSubmit}>
                                            <div className="flex flex-column gap-2">
                                                <label htmlFor="taskName" className="font-semibold">
                                                    Nombre
                                                </label>
                                                <InputText id="taskName" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Nombre de la subtarea" />
                                            </div>

                                            <div className="flex flex-column gap-2">
                                                <label htmlFor="taskDescription" className="font-semibold">
                                                    Descripción
                                                </label>
                                                <InputTextarea
                                                    id="taskDescription"
                                                    value={taskDescription}
                                                    onChange={(e) => setTaskDescription(e.target.value)}
                                                    rows={3}
                                                    placeholder="Describe la subtarea"
                                                />
                                            </div>

                                            <div className="flex flex-column gap-2">
                                                <label htmlFor="targetDate" className="font-semibold">
                                                    Fecha objetivo
                                                </label>
                                                <InputText id="targetDate" type="datetime-local" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                                            </div>

                                            <div className="flex flex-column gap-2">
                                                <label htmlFor="estimatedTime" className="font-semibold">
                                                    Tiempo estimado
                                                </label>
                                                <InputText id="estimatedTime" type="number" min={1} value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="Ejemplo: 120" />
                                            </div>

                                            {subtaskMessage && <div className="text-600 font-medium">{subtaskMessage}</div>}

                                            <div className="flex justify-content-end">
                                                <Button type="submit" label="Guardar subtarea" icon="pi pi-check" loading={subtaskLoading} disabled={subtaskLoading} />
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>

                <Dialog
                    header="Operación exitosa"
                    visible={successDialogVisible}
                    onHide={() => setSuccessDialogVisible(false)}
                    style={{ width: '28rem', maxWidth: '95vw' }}
                    draggable={false}
                    modal
                >
                    <div className="flex flex-column align-items-center text-center gap-3 py-2">
                        <i className="pi pi-check-circle text-green-500" style={{ fontSize: '3rem' }} />
                        <span className="text-900 font-semibold text-xl">Registro exitoso</span>
                        <span className="text-600">{'La actividad fue registrada correctamente.'}</span>
                        <Button label="Continuar" onClick={() => setSuccessDialogVisible(false)} />
                    </div>
                </Dialog>
            </div>
        </Card>
    );
};

export default ActivitiesPage;
