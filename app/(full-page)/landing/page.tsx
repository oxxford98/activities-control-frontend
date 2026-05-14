'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { ROUTES } from '@/lib/routes';

const features = [
    {
        icon: 'pi-calendar',
        title: 'Agenda centralizada',
        description: 'Consulta exámenes, talleres y entregas desde un solo tablero con fechas claras y priorización visual.'
    },
    {
        icon: 'pi-refresh',
        title: 'Reprograma sin perder contexto',
        description: 'Mueve actividades, conserva notas y actualiza el plan sin tener que rehacer todo desde cero.'
    },
    {
        icon: 'pi-chart-line',
        title: 'Carga y capacidad visibles',
        description: 'Detecta cuellos de botella antes de que se conviertan en atraso y reparte mejor el tiempo disponible.'
    }
];

const steps = [
    {
        number: '01',
        title: 'Ingresa tus actividades',
        description: 'Registra materias, fechas y subtareas con la información mínima que ya manejas.'
    },
    {
        number: '02',
        title: 'Prioriza según urgencia',
        description: 'Visualiza lo vencido, lo de hoy y lo próximo para tomar decisiones más rápido.'
    },
    {
        number: '03',
        title: 'Ajusta el plan en segundos',
        description: 'Reagenda cuando cambien los plazos sin perder control del avance real.'
    }
];

const LandingPage = () => {
    const router = useRouter();

    const goToLogin = () => router.push(ROUTES.AUTH.LOGIN);
    const goToRegister = () => router.push(ROUTES.AUTH.REGISTER);

    return (
        <div className="surface-0 text-900 landing-wrapper overflow-hidden">
            <div
                className="relative"
                style={{
                    background: 'radial-gradient(circle at top left, rgba(69, 104, 220, 0.16), transparent 36%), radial-gradient(circle at top right, rgba(15, 118, 110, 0.14), transparent 30%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)'
                }}
            >
                <header className="flex align-items-center justify-content-between px-4 py-4 md:px-6 lg:px-8">
                    <div className="flex align-items-center gap-3">
                        <img
                            src="/layout/images/logo.jpg"
                            alt="PlanificaUni"
                            height="64"
                            className="w-auto"
                            style={{ borderRadius: '14px', objectFit: 'cover' }}
                        />
                        <div>
                            <div className="font-bold text-xl line-height-1">PlanificaUni</div>
                            <div className="text-600 text-sm">Organización académica clara</div>
                        </div>
                    </div>

                    <div className="hidden md:flex align-items-center gap-4 text-700">
                        <a href="#features" className="no-underline text-700 font-medium">
                            Funcionalidades
                        </a>
                        <a href="#how-it-works" className="no-underline text-700 font-medium">
                            Cómo funciona
                        </a>
                        <a href="#contact" className="no-underline text-700 font-medium">
                            Empezar
                        </a>
                    </div>

                    <div className="flex align-items-center gap-2">
                        <Button label="Iniciar sesión" text onClick={goToLogin} className="hidden sm:inline-flex" />
                        <Button label="Crear cuenta" onClick={goToRegister} />
                    </div>
                </header>

                <main className="px-4 pb-8 md:px-6 lg:px-8">
                    <section className="grid align-items-center py-6 lg:py-8">
                        <div className="col-12 lg:col-6 xl:col-5">
                            <div className="inline-flex align-items-center gap-2 border-round-3xl px-3 py-2 mb-4 surface-card shadow-2">
                                <i className="pi pi-bolt text-primary" />
                                <span className="font-medium text-700">Planificación académica sin ruido visual</span>
                            </div>

                            <h1 className="text-5xl md:text-6xl line-height-1 font-bold mt-0 mb-4" style={{ letterSpacing: '-0.04em' }}>
                                Controla tus actividades antes de que te controlen a ti.
                            </h1>

                            <p className="text-xl text-700 line-height-3 mb-5" style={{ maxWidth: '42rem' }}>
                                Centraliza tareas, exámenes y entregas en una experiencia pensada para estudiantes que necesitan ver qué hacer, cuándo hacerlo y cómo reprogramarlo sin perder contexto.
                            </p>

                            <div className="flex flex-column sm:flex-row gap-3 mb-5">
                                <Button label="Entrar a la app" icon="pi pi-arrow-right" iconPos="right" size="large" onClick={goToLogin} />
                                <Button label="Crear cuenta" severity="secondary" outlined size="large" onClick={goToRegister} />
                            </div>

                            <div className="grid">
                                <div className="col-12 sm:col-4">
                                    <div className="surface-card border-round-3xl p-4 shadow-1 h-full">
                                        <div className="text-3xl font-bold text-primary mb-1">3 vistas</div>
                                        <div className="text-600">vencidas, hoy y próximas</div>
                                    </div>
                                </div>
                                <div className="col-12 sm:col-4">
                                    <div className="surface-card border-round-3xl p-4 shadow-1 h-full">
                                        <div className="text-3xl font-bold text-primary mb-1">1 clic</div>
                                        <div className="text-600">para reagendar o posponer</div>
                                    </div>
                                </div>
                                <div className="col-12 sm:col-4">
                                    <div className="surface-card border-round-3xl p-4 shadow-1 h-full">
                                        <div className="text-3xl font-bold text-primary mb-1">Tiempo</div>
                                        <div className="text-600">para enfocarte en ejecutar</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 lg:col-6 xl:col-7">
                            <div className="relative ml-auto" style={{ maxWidth: '760px' }}>
                                <div
                                    className="absolute"
                                    style={{
                                        inset: '12% 10% 16% 14%',
                                        borderRadius: '2rem',
                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(16, 185, 129, 0.14))',
                                        filter: 'blur(28px)'
                                    }}
                                />

                                <div className="relative surface-card border-round-3xl shadow-6 p-4 md:p-5 overflow-hidden">
                                    <div className="flex align-items-center justify-content-between mb-4">
                                        <div>
                                            <div className="text-900 font-bold text-xl">Tablero de hoy</div>
                                            <div className="text-600">Estado general de actividades y carga</div>
                                        </div>
                                        <Tag severity="success" value="Sincronizado" />
                                    </div>

                                    <div className="grid">
                                        <div className="col-12 md:col-7">
                                            <div className="surface-ground border-round-2xl p-4 h-full">
                                                <div className="flex align-items-center justify-content-between mb-3">
                                                    <span className="font-semibold">Hoy</span>
                                                    <span className="text-600 text-sm">4 actividades</span>
                                                </div>
                                                <div className="flex flex-column gap-3">
                                                    <div className="surface-card border-round-2xl p-3 flex align-items-center justify-content-between">
                                                        <div>
                                                            <div className="font-medium">Revisión de proyecto</div>
                                                            <div className="text-600 text-sm">Entrega hoy a las 4:00 p. m.</div>
                                                        </div>
                                                        <Tag severity="danger" value="Urgente" />
                                                    </div>
                                                    <div className="surface-card border-round-2xl p-3 flex align-items-center justify-content-between">
                                                        <div>
                                                            <div className="font-medium">Lectura de investigación</div>
                                                            <div className="text-600 text-sm">2 horas estimadas</div>
                                                        </div>
                                                        <Tag severity="info" value="En curso" />
                                                    </div>
                                                    <div className="surface-card border-round-2xl p-3 flex align-items-center justify-content-between">
                                                        <div>
                                                            <div className="font-medium">Quiz de cálculo</div>
                                                            <div className="text-600 text-sm">Mañana temprano</div>
                                                        </div>
                                                        <Tag severity="warning" value="Próximo" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12 md:col-5">
                                            <div className="grid h-full">
                                                <div className="col-12">
                                                    <div className="surface-ground border-round-2xl p-4 h-full">
                                                        <div className="text-600 text-sm mb-2">Capacidad semanal</div>
                                                        <div className="text-3xl font-bold mb-2">78%</div>
                                                        <div className="text-700 line-height-3">Visualiza el esfuerzo antes de aceptar otra carga.</div>
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="surface-ground border-round-2xl p-4 h-full">
                                                        <div className="text-600 text-sm mb-2">Reprogramaciones</div>
                                                        <div className="text-3xl font-bold mb-2">12</div>
                                                        <div className="text-700 line-height-3">Ajustes hechos sin perder historial ni notas.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <Divider id="features" align="center" className="my-6">
                        <span className="text-600 font-medium">Funcionalidades</span>
                    </Divider>

                    <section className="grid">
                        {features.map((feature) => (
                            <div key={feature.title} className="col-12 md:col-4">
                                <div className="surface-card border-round-3xl p-5 shadow-1 h-full">
                                    <div className="w-4rem h-4rem border-round-2xl flex align-items-center justify-content-center mb-4" style={{ background: 'linear-gradient(135deg, #dbeafe, #ecfeff)' }}>
                                        <i className={`pi ${feature.icon} text-2xl text-primary`} />
                                    </div>
                                    <h3 className="text-2xl font-semibold mt-0 mb-3">{feature.title}</h3>
                                    <p className="text-700 line-height-3 mb-0">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </section>

                    <section id="how-it-works" className="py-6">
                        <Divider align="center" className="mb-6">
                            <span className="text-600 font-medium">Cómo funciona</span>
                        </Divider>

                        <div className="grid">
                            {steps.map((step) => (
                                <div key={step.number} className="col-12 lg:col-4">
                                    <div className="surface-card border-round-3xl p-5 shadow-1 h-full">
                                        <div className="text-5xl font-bold mb-3" style={{ color: '#94a3b8' }}>
                                            {step.number}
                                        </div>
                                        <h3 className="text-2xl font-semibold mt-0 mb-3">{step.title}</h3>
                                        <p className="text-700 line-height-3 mb-0">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="contact" className="py-4 pb-7">
                        <div className="surface-card border-round-3xl p-5 md:p-6 shadow-3 flex flex-column lg:flex-row align-items-start lg:align-items-center justify-content-between gap-4">
                            <div>
                                <div className="text-primary font-semibold mb-2">Listo para empezar</div>
                                <h2 className="text-3xl md:text-4xl font-bold mt-0 mb-3">Crea tu cuenta y organiza tu semana en minutos.</h2>
                                <p className="text-700 line-height-3 m-0" style={{ maxWidth: '44rem' }}>
                                    Entra a la aplicación, carga tus actividades y empieza a tomar decisiones con una vista clara de lo que viene.
                                </p>
                            </div>

                            <div className="flex flex-column sm:flex-row gap-3">
                                <Button label="Iniciar sesión" severity="secondary" outlined onClick={goToLogin} />
                                <Button label="Crear cuenta" onClick={goToRegister} />
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default LandingPage;
