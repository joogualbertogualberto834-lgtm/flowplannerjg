import React from 'react';

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    className?: string;
}

/**
 * Cabeçalho de seção padronizado: ícone + título.
 * Substitui o padrão repetido de <h3 className="...flex items-center gap-2"> em todo o app.
 */
export function SectionHeader({ icon, title, className = '' }: SectionHeaderProps) {
    return (
        <h3 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${className}`}>
            {icon}
            {title}
        </h3>
    );
}
