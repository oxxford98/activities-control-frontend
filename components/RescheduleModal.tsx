'use client';

import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

export interface ValidateTentativeDateResult {
    valid: boolean;
    current_load: number;
    limit: number;
    suggestions?: Array<{ tentative_date: string; current_load: number }>;
}

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    subActivityId: number;
    title: string;
    estimatedTime?: number | string | null;
    currentDate?: string | null;
    onValidate: (subActivityId: number, tentativeDate: string) => Promise<ValidateTentativeDateResult>;
    onSave: (subActivityId: number, newDate: string) => Promise<void>;
}

export function RescheduleModal({
    isOpen,
    onClose,
    subActivityId,
    title,
    estimatedTime,
    currentDate,
    onValidate,
    onSave,
}: RescheduleModalProps) {
    const [tentativeDate, setTentativeDate] = useState('');
    const [validation, setValidation] = useState<ValidateTentativeDateResult | null>(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const resetState = () => {
        setTentativeDate('');
        setValidation(null);
        setSelectedSuggestion(null);
        setIsValidating(false);
        setIsSaving(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleDateChange = async (value: string) => {
        setTentativeDate(value);
        setSelectedSuggestion(null);
        setValidation(null);

        if (!value) return;

        setIsValidating(true);
        try {
            const isoDate = new Date(value).toISOString();
            const result = await onValidate(subActivityId, isoDate);
            setValidation(result);
        } catch {
            // silent — parent already shows toast on unexpected errors
        } finally {
            setIsValidating(false);
        }
    };

    const handleSuggestionSelect = (suggestion: { tentative_date: string; current_load: number }) => {
        setSelectedSuggestion(prev =>
            prev === suggestion.tentative_date ? null : suggestion.tentative_date
        );
    };

    const handleSave = async () => {
        const finalDate = selectedSuggestion ?? new Date(tentativeDate).toISOString();
        setIsSaving(true);
        try {
            await onSave(subActivityId, finalDate);
            handleClose();
        } catch {
            // Parent shows toast, modal stays open so user can retry
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = Boolean((validation?.valid && tentativeDate) || selectedSuggestion);

    const formatSuggestionDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });

    const formatSuggestionTime = (dateStr: string) =>
        new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const formatFullDate = (dateStr: string) =>
        new Date(dateStr).toLocaleString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const dialogHeader = (
        <div className="flex align-items-center gap-2">
            <i className="pi pi-calendar-plus text-primary" />
            <span>Reprogramar subtarea</span>
        </div>
    );

    return (
        <Dialog
            header={dialogHeader}
            visible={isOpen}
            onHide={handleClose}
            style={{ width: '36rem', maxWidth: '95vw' }}
            modal
            draggable={false}
        >
            <div className="flex flex-column gap-4">
                {/* Activity info */}
                <div>
                    <div className="text-900 font-semibold text-lg line-height-2">{title}</div>
                    {estimatedTime != null && (
                        <div className="flex align-items-center gap-1 text-500 text-sm mt-1">
                            <i className="pi pi-clock" style={{ fontSize: '0.75rem' }} />
                            <span>Duración estimada: {estimatedTime} min</span>
                        </div>
                    )}
                    {currentDate && (
                        <div className="flex align-items-center gap-1 text-500 text-sm mt-1">
                            <i className="pi pi-calendar" style={{ fontSize: '0.75rem' }} />
                            <span>Fecha actual: {currentDate}</span>
                        </div>
                    )}
                </div>

                {/* Date picker */}
                <div className="flex flex-column gap-2">
                    <label className="text-sm font-semibold text-700">Nueva fecha y hora</label>
                    <InputText
                        type="datetime-local"
                        value={tentativeDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full"
                        disabled={isValidating || isSaving}
                    />
                </div>

                {/* Validating spinner */}
                {isValidating && (
                    <div
                        className="border-round p-3 flex align-items-center gap-2"
                        style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                    >
                        <i className="pi pi-spin pi-spinner text-primary" />
                        <span className="text-600 text-sm">Validando disponibilidad...</span>
                    </div>
                )}

                {/* Valid result */}
                {!isValidating && validation?.valid && !selectedSuggestion && (
                    <div
                        className="border-round p-3 flex gap-2"
                        style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }}
                    >
                        <i className="pi pi-check-circle mt-1" style={{ color: '#16A34A', fontSize: '1.1rem' }} />
                        <div>
                            <div className="font-semibold" style={{ color: '#166534' }}>Fecha disponible</div>
                            <div className="text-sm mt-1" style={{ color: '#15803D' }}>
                                Carga del día: {validation.current_load}h / {validation.limit}h máx.
                            </div>
                        </div>
                    </div>
                )}

                {/* Invalid result + suggestions */}
                {!isValidating && validation && !validation.valid && (
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
                                <div className="flex-1">
                                    <div className="font-semibold" style={{ color: '#991B1B' }}>
                                        Fecha no disponible
                                    </div>
                                    <div className="text-sm mt-1" style={{ color: '#B91C1C' }}>
                                        La carga de ese día superaría el límite configurado.
                                    </div>
                                    <div className="grid mt-2" style={{ margin: 0 }}>
                                        <div className="col-6" style={{ paddingLeft: 0 }}>
                                            <div
                                                className="border-round p-2"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.65)' }}
                                            >
                                                <div
                                                    className="text-xs font-semibold"
                                                    style={{ color: '#991B1B' }}
                                                >
                                                    Carga del día
                                                </div>
                                                <div
                                                    className="text-xl font-bold mt-1"
                                                    style={{ color: '#7F1D1D' }}
                                                >
                                                    {validation.current_load}h
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6" style={{ paddingRight: 0 }}>
                                            <div
                                                className="border-round p-2"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.65)' }}
                                            >
                                                <div
                                                    className="text-xs font-semibold"
                                                    style={{ color: '#991B1B' }}
                                                >
                                                    Límite configurado
                                                </div>
                                                <div
                                                    className="text-xl font-bold mt-1"
                                                    style={{ color: '#7F1D1D' }}
                                                >
                                                    {validation.limit}h
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Suggestions */}
                        {validation.suggestions && validation.suggestions.length > 0 && (
                            <div className="flex flex-column gap-2">
                                <div
                                    className="flex align-items-center gap-2 font-semibold text-sm"
                                    style={{ color: '#4338CA' }}
                                >
                                    <i className="pi pi-lightbulb" />
                                    <span>Fechas sugeridas</span>
                                </div>
                                <p className="text-500 text-sm m-0">
                                    Fechas cercanas con disponibilidad:
                                </p>
                                <div className="flex flex-column gap-2">
                                    {validation.suggestions.map((s, i) => {
                                        const isSelected = selectedSuggestion === s.tentative_date;
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleSuggestionSelect(s)}
                                                style={{
                                                    border: isSelected
                                                        ? '2px solid #6366F1'
                                                        : '1px solid #E2E8F0',
                                                    backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF',
                                                    borderRadius: '0.5rem',
                                                    padding: '0.75rem',
                                                    cursor: 'pointer',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    outline: 'none',
                                                    transition: 'border 0.15s, background-color 0.15s',
                                                }}
                                            >
                                                <div className="flex align-items-center justify-content-between">
                                                    <div className="flex flex-column gap-1">
                                                        <div className="flex align-items-center gap-2">
                                                            <i
                                                                className="pi pi-calendar text-500"
                                                                style={{ fontSize: '0.8rem' }}
                                                            />
                                                            <span className="font-medium text-900 text-sm">
                                                                {formatSuggestionDate(s.tentative_date)}
                                                            </span>
                                                        </div>
                                                        <div className="flex align-items-center gap-2">
                                                            <i
                                                                className="pi pi-clock text-400"
                                                                style={{ fontSize: '0.75rem' }}
                                                            />
                                                            <span className="text-sm text-500">
                                                                {formatSuggestionTime(s.tentative_date)}
                                                            </span>
                                                            <span className="text-300 text-sm">•</span>
                                                            <span
                                                                className="text-sm font-medium"
                                                                style={{ color: '#16A34A' }}
                                                            >
                                                                Carga: {s.current_load}h
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <i
                                                            className="pi pi-check-circle"
                                                            style={{ fontSize: '1.25rem', color: '#6366F1' }}
                                                        />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Selected suggestion confirmation */}
                {selectedSuggestion && (
                    <div
                        className="border-round p-3 flex gap-2"
                        style={{ backgroundColor: '#EEF2FF', border: '1px solid #A5B4FC' }}
                    >
                        <i
                            className="pi pi-check-circle mt-1"
                            style={{ color: '#6366F1', fontSize: '1.1rem' }}
                        />
                        <div>
                            <div className="font-semibold" style={{ color: '#3730A3' }}>
                                Fecha seleccionada
                            </div>
                            <div className="text-sm mt-1" style={{ color: '#4338CA' }}>
                                {formatFullDate(selectedSuggestion)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-content-end gap-2 pt-1">
                    <Button
                        type="button"
                        label="Cancelar"
                        severity="secondary"
                        outlined
                        onClick={handleClose}
                        disabled={isSaving}
                    />
                    <Button
                        type="button"
                        label="Guardar cambios"
                        icon="pi pi-check"
                        loading={isSaving}
                        disabled={!canSave}
                        onClick={handleSave}
                    />
                </div>
            </div>
        </Dialog>
    );
}
