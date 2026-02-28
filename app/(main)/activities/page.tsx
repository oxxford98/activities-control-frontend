/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
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

interface TokenPayload {
    user_id?: number | string;
    id?: number | string;
    sub?: number | string;
    [key: string]: any;
}

const HIDDEN_ACTIVITY_FIELDS = new Set(['id', 'grade', 'deleted_at', 'user']);

const ACTIVITY_LABELS_ES: Record<string, string> = {
    title: 'Título',
    type_activity: 'Tipo de actividad',
    description: 'Descripción',
    subject: 'Materia',
    event_date: 'Fecha del evento',
    deadline: 'Fecha límite',
    created_at: 'Fecha de creación',
    updated_at: 'Última actualización'
};

const ActivitiesPage = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [activitiesError, setActivitiesError] = useState('');
    const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
    const [activityDialogVisible, setActivityDialogVisible] = useState(false);

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

    useEffect(() => {
        fetchActivities();

        const refreshHandler = () => {
            fetchActivities();
        };

        window.addEventListener('activity-created', refreshHandler);
        return () => {
            window.removeEventListener('activity-created', refreshHandler);
        };
    }, []);

    const openActivityDetails = (activity: ActivityItem) => {
        setSelectedActivity(activity);
        setActivityDialogVisible(true);
    };

    const titleTemplate = (rowData: ActivityItem) => {
        return <Button label={rowData.title} link className="p-0 text-left" onClick={() => openActivityDetails(rowData)} />;
    };

    const formatActivityValue = (key: string, value: any) => {
        if (value === null || value === undefined || value === '') return '-';

        if (key === 'event_date' || key === 'deadline' || key === 'created_at' || key === 'updated_at') {
            const parsedDate = new Date(String(value));
            if (!Number.isNaN(parsedDate.getTime())) {
                return parsedDate.toLocaleString('es-CO');
            }
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    };

    const activityDetailsEntries = selectedActivity?.raw ? Object.entries(selectedActivity.raw).filter(([key]) => !HIDDEN_ACTIVITY_FIELDS.has(key)) : [];

    return (
        <Card title="Actividades">
            <div className="flex flex-column gap-4">
                <div className="flex justify-content-end">
                    <Button label="Crear actividad" icon="pi pi-plus" onClick={handleOpenCreateDialog} />
                </div>

                {activitiesError && <div className="text-red-500 font-medium">{activitiesError}</div>}

                <DataTable value={activities} loading={activitiesLoading} emptyMessage="No hay actividades registradas.">
                    <Column field="id" header="ID" />
                    <Column field="title" header="Título" body={titleTemplate} />
                    <Column field="type_activity" header="Tipo de actividad" />
                </DataTable>

                <Dialog header="Detalle de actividad" visible={activityDialogVisible} onHide={() => setActivityDialogVisible(false)} style={{ width: '40rem', maxWidth: '95vw' }} modal draggable={false}>
                    {selectedActivity?.raw ? (
                        <div className="flex flex-column gap-3">
                            {activityDetailsEntries.map(([key, value]) => (
                                <div key={key} className="flex flex-column">
                                    <span className="font-semibold">{ACTIVITY_LABELS_ES[key] || key}</span>
                                    <span>{formatActivityValue(key, value)}</span>
                                </div>
                            ))}

                            <div className="pt-2">
                                <Button type="button" label="Añadir plan de trabajo" />
                            </div>
                        </div>
                    ) : null}
                </Dialog>
            </div>
        </Card>
    );
};

export default ActivitiesPage;
