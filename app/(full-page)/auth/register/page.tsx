/* eslint-disable @next/next/no-img-element */
'use client';
import { useRouter } from 'next/navigation';
import React, { useContext, useState } from 'react';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';

const RegisterPage = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { layoutConfig } = useContext(LayoutContext);

    const router = useRouter();
    const containerClassName = classNames('surface-ground flex align-items-center justify-content-center min-h-screen min-w-screen overflow-hidden', { 'p-input-filled': layoutConfig.inputStyle === 'filled' });

    const handleRegister = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        // Validaciones básicas
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            setError('Todos los campos son requeridos');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: firstName.toLowerCase() + lastName.toLowerCase(),
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.detail || 'Error en el registro');
            }

            setSuccess('¡Cuenta creada exitosamente! Redirigiendo al login...');
            setTimeout(() => {
                router.push(ROUTES.AUTH.LOGIN);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al registrar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={containerClassName}>
            <div className="flex flex-column align-items-center justify-content-center">
                <div
                    style={{
                        borderRadius: '56px',
                        padding: '0.1rem',
                        background: 'linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)'
                    }}
                >
                    <div className="w-full surface-card py-8 px-3 sm:px-5" style={{ borderRadius: '53px' }}>
                        <div className="text-center mb-1">
                            <img src="/layout/images/logo.jpg" alt="Logo" className="mb-1 w-12rem flex-shrink-0" />
                            <div className="text-900 text-3xl font-medium mb-1">Crear Cuenta</div>
                            <span className="text-600 font-medium">Únete a nosotros hoy</span>
                        </div>

                        <div>
                            <label htmlFor="firstName" className="block text-900 text-xl font-medium mb-2">
                                Nombre
                            </label>
                            <InputText
                                id="firstName"
                                type="text"
                                placeholder="Tu nombre"
                                className="w-full md:w-30rem mb-5"
                                style={{ padding: '1rem' }}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />

                            <label htmlFor="lastName" className="block text-900 text-xl font-medium mb-2">
                                Apellido
                            </label>
                            <InputText
                                id="lastName"
                                type="text"
                                placeholder="Tu apellido"
                                className="w-full md:w-30rem mb-5"
                                style={{ padding: '1rem' }}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />

                            <label htmlFor="email" className="block text-900 text-xl font-medium mb-2">
                                Email
                            </label>
                            <InputText
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                className="w-full md:w-30rem mb-5"
                                style={{ padding: '1rem' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <label htmlFor="password" className="block text-900 font-medium text-xl mb-2">
                                Contraseña
                            </label>
                            <Password
                                inputId="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                toggleMask
                                className="w-full mb-5"
                                inputClassName="w-full p-3 md:w-500rem"
                            />

                            <label htmlFor="confirmPassword" className="block text-900 font-medium text-xl mb-2">
                                Confirmar Contraseña
                            </label>
                            <Password
                                inputId="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirma tu contraseña"
                                toggleMask
                                className="w-full mb-5"
                                inputClassName="w-full p-3 md:w-500rem"
                            />

                            {error && <div className="text-red-500 mb-5 text-center font-medium">{error}</div>}
                            {success && <div className="text-green-500 mb-5 text-center font-medium">{success}</div>}

                            <Button
                                label="Crear Cuenta"
                                className="w-full p-3 text-xl"
                                onClick={handleRegister}
                                loading={loading}
                            />

                            <div className="text-center mt-5">
                                <span className="text-600">¿Ya tienes una cuenta? </span>
                                <Link href={ROUTES.AUTH.LOGIN} className="font-medium no-underline cursor-pointer" style={{ color: 'var(--primary-color)' }}>
                                    Inicia sesión
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
