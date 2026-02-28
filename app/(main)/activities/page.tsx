/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
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
    id?: number;
    title: string;
    type_activity: string;
    description: string | null;
    subject?: string | null;
    event_date: string | null;
    deadline: string | null;
    grade?: number | null;
    user?: number;
}

interface TokenPayload {
    user_id?: number | string;
    id?: number | string;
    sub?: number | string;
    [key: string]: any;
}

const ACTIVITY_TYPE_OPTIONS = [
    { label: 'Examen', value: 'Examen' },
    { label: 'Quiz', value: 'Quiz' },
    { label: 'Taller', value: 'Taller' },
    { label: 'Proyecto', value: 'Proyecto' },
    { label: 'Otro', value: 'Otro' }
];

const ActivitiesPage = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [activitiesError, setActivitiesError] = useState('');
    const [activitySuccessMessage, setActivitySuccessMessage] = useState('');
    const [successDialogVisible, setSuccessDialogVisible] = useState(false);
    const [actionError, setActionError] = useState('');

    const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
    const [selectedActivityDetail, setSelectedActivityDetail] = useState<ActivityDetail | null>(null);
    const [activityDetailLoading, setActivityDetailLoading] = useState(false);
    const [activityDetailError, setActivityDetailError] = useState('');

    const [subActivities, setSubActivities] = useState<SubActivityItem[]>([]);
    const [subActivitiesLoading, setSubActivitiesLoading] = useState(false);
    const [subActivitiesError, setSubActivitiesError] = useState('');
    const [editingActivity, setEditingActivity] = useState<ActivityDetail | null>(null);
    const [activityEditDialogVisible, setActivityEditDialogVisible] = useState(false);
    const [editingSubActivity, setEditingSubActivity] = useState<SubActivityItem | null>(null);
    const [subActivityEditDialogVisible, setSubActivityEditDialogVisible] = useState(false);
    const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
    const [confirmDialogTitle, setConfirmDialogTitle] = useState('');
    const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
    const [confirmActionType, setConfirmActionType] = useState<'delete-activity' | 'delete-subactivity' | null>(null);
    const [pendingDeleteActivity, setPendingDeleteActivity] = useState<ActivityItem | null>(null);
    const [pendingDeleteSubActivity, setPendingDeleteSubActivity] = useState<SubActivityItem | null>(null);

    const [showWorkPlanForm, setShowWorkPlanForm] = useState(false);
    const [taskName, setTaskName] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('');
    const [subtaskMessage, setSubtaskMessage] = useState('');
    const [subtaskLoading, setSubtaskLoading] = useState(false);

    const workPlanEndpoint = process.env.NEXT_PUBLIC_WORK_PLAN_ENDPOINT || '/sub-activities/';
    const workPlanUrl = workPlanEndpoint.startsWith('http') ? workPlanEndpoint : `${process.env.NEXT_PUBLIC_API_URL}${workPlanEndpoint}`;
    const getSubActivityDetailUrl = (subActivityId: number) => `${process.env.NEXT_PUBLIC_API_URL}/sub-activities/${subActivityId}/`;

    const subActivitiesByActivityEndpoint = process.env.NEXT_PUBLIC_SUB_ACTIVITIES_BY_ACTIVITY_ENDPOINT || '/sub-activities/by-activity/';
    const getSubActivitiesByActivityUrls = (activityId: number) => {
        const baseUrl = subActivitiesByActivityEndpoint.startsWith('http')
            ? `${subActivitiesByActivityEndpoint.replace(/\/$/, '')}/${activityId}`
            : `${process.env.NEXT_PUBLIC_API_URL}${subActivitiesByActivityEndpoint}${activityId}`;

        return [baseUrl, `${baseUrl}/`];
    };

    const getActivityDetailUrl = (activityId: number) => `${process.env.NEXT_PUBLIC_API_URL}/activities/${activityId}/`;
    const getActivityUpdateDeleteUrl = (activityId: number) => `${process.env.NEXT_PUBLIC_API_URL}/activities/${activityId}/`;

    const getSuccessMessageWithDate = (baseMessage: string) => {
        const now = new Date().toLocaleString('es-CO');
        return `${baseMessage} (${now}).`;
    };

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
                id: Number(data?.id),
                title: String(data?.title ?? ''),
                type_activity: String(data?.type_activity ?? ''),
                description: data?.description ?? null,
                subject: data?.subject ?? null,
                event_date: data?.event_date ?? null,
                deadline: data?.deadline ?? null,
                grade: data?.grade ?? null,
                user: data?.user ?? undefined
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

    const dateTimeToInputValue = (value: string | null | undefined) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
        return localISOTime;
    };

    const openEditActivity = (activity: ActivityItem) => {
        const raw = activity.raw || {};
        setEditingActivity({
            id: activity.id,
            title: String(raw.title ?? activity.title ?? ''),
            type_activity: String(raw.type_activity ?? activity.type_activity ?? ''),
            description: raw.description ?? null,
            subject: raw.subject ?? null,
            event_date: raw.event_date ?? null,
            deadline: raw.deadline ?? null,
            grade: raw.grade ?? null,
            user: raw.user ?? activity.user
        });
        setActivityEditDialogVisible(true);
    };

    const handleSaveActivityEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingActivity?.id) return;

        const token = getSessionToken();
        if (!token) {
            setActionError('Sesión no válida.');
            return;
        }

        if (!editingActivity.title.trim() || !editingActivity.type_activity.trim() || !String(editingActivity.subject || '').trim()) {
            setActionError('Título, tipo de actividad y materia son obligatorios.');
            return;
        }

        try {
            const response = await fetch(getActivityUpdateDeleteUrl(editingActivity.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: editingActivity.title.trim(),
                    type_activity: editingActivity.type_activity.trim(),
                    description: editingActivity.description || null,
                    subject: String(editingActivity.subject || '').trim(),
                    event_date: toIsoOrNull(dateTimeToInputValue(editingActivity.event_date)),
                    deadline: toIsoOrNull(dateTimeToInputValue(editingActivity.deadline)),
                    grade: editingActivity.grade ?? null,
                    user: editingActivity.user
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.detail || errorData?.message || 'No se pudo editar la actividad.');
            }

            setActivityEditDialogVisible(false);
            setActionError('');
            setActivitySuccessMessage(getSuccessMessageWithDate('La actividad se ha modificado exitosamente'));
            setSuccessDialogVisible(true);
            fetchActivities();
            if (selectedActivity?.id === editingActivity.id) {
                fetchActivityDetail(editingActivity.id);
            }
        } catch (error: any) {
            setActionError(error.message || 'Error al editar actividad.');
        }
    };

    const handleDeleteActivity = async (activity: ActivityItem) => {
        setPendingDeleteActivity(activity);
        setConfirmActionType('delete-activity');
        setConfirmDialogTitle('Confirmar eliminación de actividad');
        setConfirmDialogMessage(`¿Seguro que deseas eliminar la actividad "${activity.title}" y sus subtareas?`);
        setConfirmDialogVisible(true);
    };

    const performDeleteActivity = async (activity: ActivityItem) => {

        const token = getSessionToken();
        if (!token) {
            setActionError('Sesión no válida.');
            return;
        }

        try {
            const candidateUrls = getSubActivitiesByActivityUrls(activity.id);
            let byActivityResponse: Response | null = null;
            for (const url of candidateUrls) {
                const attempt = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                if (attempt.ok) {
                    byActivityResponse = attempt;
                    break;
                }
            }

            if (byActivityResponse) {
                const subData = await byActivityResponse.json();
                const subList = Array.isArray(subData) ? subData : Array.isArray(subData?.results) ? subData.results : [];

                for (const sub of subList) {
                    if (sub?.id) {
                        await fetch(getSubActivityDetailUrl(Number(sub.id)), {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                        });
                    }
                }
            }

            const activityDeleteResponse = await fetch(getActivityUpdateDeleteUrl(activity.id), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!activityDeleteResponse.ok) {
                const errorData = await activityDeleteResponse.json().catch(() => ({}));
                throw new Error(errorData?.detail || errorData?.message || 'No se pudo eliminar la actividad.');
            }

            if (selectedActivity?.id === activity.id) {
                setSelectedActivity(null);
                setSelectedActivityDetail(null);
                setSubActivities([]);
                setShowWorkPlanForm(false);
            }

            fetchActivities();
            setActionError('');
            setActivitySuccessMessage(getSuccessMessageWithDate('La actividad y sus subtareas se eliminaron exitosamente'));
            setSuccessDialogVisible(true);
        } catch (error: any) {
            setActionError(error.message || 'Error al eliminar actividad.');
        }
    };

    const openEditSubActivity = (subActivity: SubActivityItem) => {
        setEditingSubActivity({ ...subActivity });
        setSubActivityEditDialogVisible(true);
    };

    const handleSaveSubActivityEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingSubActivity?.id) return;

        const token = getSessionToken();
        if (!token) {
            setActionError('Sesión no válida.');
            return;
        }

        if (!String(editingSubActivity.name || '').trim()) {
            setActionError('El nombre de la subtarea es obligatorio.');
            return;
        }

        const estimated = Number.parseInt(String(editingSubActivity.estimated_time ?? ''), 10);
        if (Number.isNaN(estimated) || estimated < 1) {
            setActionError('El tiempo estimado debe ser un entero mayor o igual a 1.');
            return;
        }

        const targetDateIso = toIsoOrNull(String(editingSubActivity.target_date || ''));
        if (!targetDateIso) {
            setActionError('La fecha objetivo es obligatoria y válida.');
            return;
        }

        try {
            const response = await fetch(getSubActivityDetailUrl(editingSubActivity.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: String(editingSubActivity.name || '').trim(),
                    description: editingSubActivity.description || null,
                    target_date: targetDateIso,
                    estimated_time: estimated,
                    activity: selectedActivity?.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.detail || errorData?.message || 'No se pudo editar la subtarea.');
            }

            setSubActivityEditDialogVisible(false);
            setActionError('');
            setActivitySuccessMessage(getSuccessMessageWithDate('La subtarea se ha modificado exitosamente'));
            setSuccessDialogVisible(true);
            if (selectedActivity?.id) {
                fetchSubActivitiesByActivity(selectedActivity.id);
            }
        } catch (error: any) {
            setActionError(error.message || 'Error al editar subtarea.');
        }
    };

    const handleDeleteSubActivity = async (subActivity: SubActivityItem) => {
        if (!subActivity?.id) return;
        setPendingDeleteSubActivity(subActivity);
        setConfirmActionType('delete-subactivity');
        setConfirmDialogTitle('Confirmar eliminación de subtarea');
        setConfirmDialogMessage(`¿Seguro que deseas eliminar la subtarea "${subActivity.name}"?`);
        setConfirmDialogVisible(true);
    };

    const performDeleteSubActivity = async (subActivity: SubActivityItem) => {
        if (!subActivity?.id) return;

        const token = getSessionToken();
        if (!token) {
            setActionError('Sesión no válida.');
            return;
        }

        try {
            const response = await fetch(getSubActivityDetailUrl(subActivity.id), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.detail || errorData?.message || 'No se pudo eliminar la subtarea.');
            }

            if (selectedActivity?.id) {
                fetchSubActivitiesByActivity(selectedActivity.id);
            }
            setActionError('');
            setActivitySuccessMessage(getSuccessMessageWithDate('La subtarea se eliminó exitosamente'));
            setSuccessDialogVisible(true);
        } catch (error: any) {
            setActionError(error.message || 'Error al eliminar subtarea.');
        }
    };

    const handleConfirmAction = async () => {
        if (confirmActionType === 'delete-activity' && pendingDeleteActivity) {
            await performDeleteActivity(pendingDeleteActivity);
        } else if (confirmActionType === 'delete-subactivity' && pendingDeleteSubActivity) {
            await performDeleteSubActivity(pendingDeleteSubActivity);
        }

        setConfirmDialogVisible(false);
        setConfirmActionType(null);
        setPendingDeleteActivity(null);
        setPendingDeleteSubActivity(null);
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

    const activityActionsTemplate = (rowData: ActivityItem) => (
        <div className="flex gap-2">
            <Button icon="pi pi-pencil" rounded text type="button" onClick={() => openEditActivity(rowData)} aria-label="Editar actividad" />
            <Button icon="pi pi-trash" rounded text severity="danger" type="button" onClick={() => handleDeleteActivity(rowData)} aria-label="Eliminar actividad" />
        </div>
    );

    const subActivityActionsTemplate = (rowData: SubActivityItem) => (
        <div className="flex gap-2">
            <Button icon="pi pi-pencil" rounded text type="button" onClick={() => openEditSubActivity(rowData)} aria-label="Editar subtarea" />
            <Button icon="pi pi-trash" rounded text severity="danger" type="button" onClick={() => handleDeleteSubActivity(rowData)} aria-label="Eliminar subtarea" />
        </div>
    );

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
                {actionError && <div className="text-red-500 font-medium">{actionError}</div>}

                <div className="grid">
                    <div className="col-12 lg:col-7">
                        <DataTable value={activities} loading={activitiesLoading} emptyMessage="No hay actividades registradas.">
                            <Column field="id" header="ID" />
                            <Column field="title" header="Título" body={titleTemplate} />
                            <Column field="type_activity" header="Tipo de actividad" />
                            <Column header="Acciones" body={activityActionsTemplate} />
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
                                        <Column header="Acciones" body={subActivityActionsTemplate} />
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
                        <span className="text-600">{activitySuccessMessage || 'La operación se completó exitosamente.'}</span>
                        <Button label="Continuar" onClick={() => setSuccessDialogVisible(false)} />
                    </div>
                </Dialog>

                <Dialog
                    header="Editar actividad"
                    visible={activityEditDialogVisible}
                    onHide={() => setActivityEditDialogVisible(false)}
                    style={{ width: '40rem', maxWidth: '95vw' }}
                    modal
                    draggable={false}
                >
                    {editingActivity && (
                        <form className="flex flex-column gap-3" onSubmit={handleSaveActivityEdit}>
                            <div className="flex flex-column gap-2">
                                <label htmlFor="editActivityTitle" className="font-semibold">Título</label>
                                <InputText id="editActivityTitle" value={editingActivity.title} onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, title: e.target.value } : prev))} />
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="editActivityType" className="font-semibold">Tipo de actividad</label>
                                <Dropdown
                                    id="editActivityType"
                                    value={editingActivity.type_activity}
                                    options={ACTIVITY_TYPE_OPTIONS}
                                    onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, type_activity: e.value } : prev))}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="editActivitySubject" className="font-semibold">Materia</label>
                                <InputText id="editActivitySubject" value={String(editingActivity.subject || '')} onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, subject: e.target.value } : prev))} />
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="editActivityDescription" className="font-semibold">Descripción</label>
                                <InputTextarea id="editActivityDescription" value={editingActivity.description || ''} onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, description: e.target.value } : prev))} rows={3} />
                            </div>

                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <div className="flex flex-column gap-2">
                                        <label htmlFor="editActivityEventDate" className="font-semibold">Fecha del evento</label>
                                        <InputText id="editActivityEventDate" type="datetime-local" value={dateTimeToInputValue(editingActivity.event_date)} onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, event_date: e.target.value } : prev))} />
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex flex-column gap-2">
                                        <label htmlFor="editActivityDeadline" className="font-semibold">Fecha límite</label>
                                        <InputText id="editActivityDeadline" type="datetime-local" value={dateTimeToInputValue(editingActivity.deadline)} onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, deadline: e.target.value } : prev))} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-content-end gap-2">
                                <Button type="button" label="Cancelar" severity="secondary" outlined onClick={() => setActivityEditDialogVisible(false)} />
                                <Button type="submit" label="Guardar cambios" icon="pi pi-check" />
                            </div>
                        </form>
                    )}
                </Dialog>

                <Dialog
                    header="Editar subtarea"
                    visible={subActivityEditDialogVisible}
                    onHide={() => setSubActivityEditDialogVisible(false)}
                    style={{ width: '36rem', maxWidth: '95vw' }}
                    modal
                    draggable={false}
                >
                    {editingSubActivity && (
                        <form className="flex flex-column gap-3" onSubmit={handleSaveSubActivityEdit}>
                            <div className="flex flex-column gap-2">
                                <label htmlFor="editSubActivityName" className="font-semibold">Nombre</label>
                                <InputText id="editSubActivityName" value={String(editingSubActivity.name || '')} onChange={(e) => setEditingSubActivity((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="editSubActivityDescription" className="font-semibold">Descripción</label>
                                <InputTextarea id="editSubActivityDescription" value={String(editingSubActivity.description || '')} onChange={(e) => setEditingSubActivity((prev) => (prev ? { ...prev, description: e.target.value } : prev))} rows={3} />
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="editSubActivityTargetDate" className="font-semibold">Fecha objetivo</label>
                                <InputText id="editSubActivityTargetDate" type="datetime-local" value={dateTimeToInputValue(String(editingSubActivity.target_date || ''))} onChange={(e) => setEditingSubActivity((prev) => (prev ? { ...prev, target_date: e.target.value } : prev))} />
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="editSubActivityEstimatedTime" className="font-semibold">Tiempo estimado</label>
                                <InputText id="editSubActivityEstimatedTime" type="number" min={1} value={String(editingSubActivity.estimated_time ?? '')} onChange={(e) => setEditingSubActivity((prev) => (prev ? { ...prev, estimated_time: e.target.value } : prev))} />
                            </div>

                            <div className="flex justify-content-end gap-2">
                                <Button type="button" label="Cancelar" severity="secondary" outlined onClick={() => setSubActivityEditDialogVisible(false)} />
                                <Button type="submit" label="Guardar cambios" icon="pi pi-check" />
                            </div>
                        </form>
                    )}
                </Dialog>

                <Dialog
                    header={confirmDialogTitle || 'Confirmar acción'}
                    visible={confirmDialogVisible}
                    onHide={() => setConfirmDialogVisible(false)}
                    style={{ width: '30rem', maxWidth: '95vw' }}
                    modal
                    draggable={false}
                >
                    <div className="flex flex-column gap-4">
                        <span className="text-700">{confirmDialogMessage}</span>
                        <div className="flex justify-content-end gap-2">
                            <Button type="button" label="Cancelar" severity="secondary" outlined onClick={() => setConfirmDialogVisible(false)} />
                            <Button type="button" label="Eliminar" severity="danger" onClick={handleConfirmAction} />
                        </div>
                    </div>
                </Dialog>
            </div>
        </Card>
    );
};

export default ActivitiesPage;
