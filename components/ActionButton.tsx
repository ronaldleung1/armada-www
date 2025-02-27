'use client';

import React from 'react';
import Link from 'next/link';

type ActionButtonProps = {
    children: React.ReactNode;
    className?: string;
    href?: string;
    isEmail?: boolean;
    emailTo?: string;
    emailSubject?: string;
    onClick?: () => void;
};

const ActionButton = ({
    children,
    className = '',
    href,
    isEmail = false,
    emailTo = '',
    emailSubject = '',
    onClick,
}: ActionButtonProps) => {
    // NOTE: mailto does not work on Arc!
    if (isEmail && emailTo) {
        const mailtoLink = `mailto:${emailTo}?subject=${encodeURIComponent(
            emailSubject || ''
        )}`;

        return (
            <a
                href={mailtoLink}
                className={`bg-black text-white px-6 py-3 rounded-full hover:bg-black/80 transition-colors font-medium ${className}`}
                target='_blank'
                rel='noopener noreferrer'
            >
                {children}
            </a>
        );
    }

    if (href) {
        if (href.startsWith('http')) {
            return (
                <a
                    href={href}
                    className={`bg-black text-white px-6 py-3 rounded-full hover:bg-black/80 transition-colors font-medium ${className}`}
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    {children}
                </a>
            );
        }

        return (
            <Link
                href={href}
                className={`bg-black text-white px-6 py-3 rounded-full hover:bg-black/80 transition-colors font-medium ${className}`}
            >
                {children}
            </Link>
        );
    }

    return (
        <button
            onClick={onClick}
            className={`bg-black text-white px-6 py-3 rounded-full hover:bg-black/80 transition-colors font-medium ${className}`}
        >
            {children}
        </button>
    );
};

export default ActionButton;
