import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NavItemProps {
    key?: React.Key;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

export function NavItem({ icon, label, active, onClick }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group/nav',
                active
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-900',
            )}
        >
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {icon}
            </div>
            <span className="truncate whitespace-nowrap opacity-0 group-hover:opacity-100 lg:group-hover/sidebar:opacity-100 transition-opacity duration-300 hidden group-hover:block lg:group-hover/sidebar:block">
                {label}
            </span>
        </button>
    );
}
