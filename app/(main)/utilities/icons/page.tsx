'use client';
import React from 'react';
import Link from 'next/link';

const IconsDemo = () => {
    return (
        <div className="card">
            <h2>Icons</h2>
            <p>
                PrimeReact components internally use{' '}
                <Link href="https://github.com/primefaces/primeicons" target="_blank" className="font-medium hover:underline text-primary">
                    PrimeIcons
                </Link>
                .
            </p>

            <h4>Getting Started</h4>
            <pre className="app-code">
                <code>{`<i className="pi pi-check"></i>`}</code>
            </pre>

            <i className="pi pi-check text-2xl"></i>
        </div>
    );
};

export default IconsDemo;
