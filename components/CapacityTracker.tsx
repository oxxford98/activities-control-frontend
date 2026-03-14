'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { getSessionToken } from '@/lib/sessionUser';

interface DailyWorkConfig {
    estimated_hours: number;
    busy_hours: number;
    available_hours: number;
}

export function CapacityTracker() {
    const [config, setConfig] = useState<DailyWorkConfig | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [tempHours, setTempHours] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchConfig = async () => {
        const token = getSessionToken();
        if (!token) return;
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/config-daily-work-hours/by-user/`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return;
            const data = await res.json();
            const item: DailyWorkConfig | undefined = Array.isArray(data) ? data[0] : data;
            if (item) setConfig(item);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchConfig(); }, []);

    const handleEdit = () => {
        setTempHours(String(config?.estimated_hours ?? 8));
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setTempHours('');
    };

    const handleTempChange = (value: string) => {
        // Only allow whole numbers 1–16
        const cleaned = value.replace(/\D/g, '');
        if (cleaned === '') { setTempHours(''); return; }
        const num = Number(cleaned);
        if (num >= 1 && num <= 16) setTempHours(cleaned);
    };

    const handleSave = async () => {
        const hours = Number(tempHours);
        if (!hours || hours < 1 || hours > 16) return;
        const token = getSessionToken();
        if (!token) return;

        setIsSaving(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/config-daily-work-hours/`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ estimated_hours: hours })
                }
            );
            if (res.ok) {
                await fetchConfig();
                setIsEditing(false);
                setTempHours('');
            }
        } catch {
            // silent
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div
                className="border-round p-3 flex align-items-center gap-2"
                style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
                <i className="pi pi-spin pi-spinner text-primary" style={{ fontSize: '0.9rem' }} />
                <span className="text-500 text-sm">Cargando capacidad...</span>
            </div>
        );
    }

    if (!config) return null;

    const { estimated_hours, busy_hours, available_hours } = config;
    const percentage = estimated_hours > 0
        ? Math.min((busy_hours / estimated_hours) * 100, 100)
        : 0;

    const barColor = percentage >= 100 ? '#EF4444' : percentage > 75 ? '#F59E0B' : '#22C55E';
    const saveable = tempHours !== '' && Number(tempHours) >= 1 && Number(tempHours) <= 16;

    /* ---- Edit mode ---- */
    if (isEditing) {
        return (
            <div
                className="border-round p-3 flex align-items-center justify-content-between flex-wrap gap-3"
                style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
                <div className="flex align-items-center gap-2 flex-wrap">
                    <i className="pi pi-info-circle text-primary" style={{ fontSize: '1rem' }} />
                    <span className="text-sm font-medium text-700">Horas diarias disponibles:</span>
                    <InputText
                        value={tempHours}
                        onChange={(e) => handleTempChange(e.target.value)}
                        placeholder="1–16"
                        disabled={isSaving}
                        style={{ width: '4rem', textAlign: 'center', fontSize: '0.875rem' }}
                    />
                    <span className="text-sm text-500">horas</span>
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        label="Cancelar"
                        size="small"
                        severity="secondary"
                        outlined
                        onClick={handleCancel}
                        disabled={isSaving}
                    />
                    <Button
                        type="button"
                        label="Guardar"
                        size="small"
                        icon="pi pi-check"
                        loading={isSaving}
                        disabled={!saveable}
                        onClick={handleSave}
                    />
                </div>
            </div>
        );
    }

    /* ---- View mode ---- */
    return (
        <div
            className="border-round p-3"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
        >
            <div className="flex align-items-center justify-content-between flex-wrap gap-3">
                {/* Icon + label */}
                <div className="flex align-items-center gap-2">
                    <div
                        className="flex align-items-center justify-content-center border-round"
                        style={{ width: '2rem', height: '2rem', backgroundColor: '#EEF2FF', flexShrink: 0 }}
                    >
                        <i className="pi pi-clock" style={{ color: '#6366F1', fontSize: '0.85rem' }} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-700">Capacidad para hoy</div>
                        <div className="text-xs text-500">
                            {busy_hours}h ocupadas&nbsp;·&nbsp;{available_hours}h libres de {estimated_hours}h
                        </div>
                    </div>
                </div>

                {/* Progress bar + % + settings */}
                <div
                    className="flex align-items-center gap-2 flex-1"
                    style={{ minWidth: '10rem', maxWidth: '22rem' }}
                >
                    <div
                        className="flex-1 border-round-3xl overflow-hidden"
                        style={{ height: '0.45rem', backgroundColor: '#E2E8F0' }}
                    >
                        <div
                            style={{
                                width: `${percentage}%`,
                                height: '100%',
                                backgroundColor: barColor,
                                borderRadius: '9999px',
                                transition: 'width 0.4s ease, background-color 0.3s ease',
                            }}
                        />
                    </div>
                    <span
                        className="text-xs font-medium text-600"
                        style={{ minWidth: '2.5rem', textAlign: 'right' }}
                    >
                        {Math.round(percentage)}%
                    </span>
                    <Button
                        type="button"
                        icon="pi pi-cog"
                        text
                        size="small"
                        severity="secondary"
                        onClick={handleEdit}
                        tooltip="Configurar capacidad"
                        tooltipOptions={{ position: 'top' }}
                        style={{ padding: '0.2rem' }}
                    />
                </div>
            </div>
        </div>
    );
}
