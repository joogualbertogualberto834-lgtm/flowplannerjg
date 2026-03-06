import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly';

const TAB_LABELS: Record<TabId, string> = {
    dashboard: 'Dashboard',
    topics: 'Especialidades',
    reviews: 'Revisões',
    flashcards: 'Flashcards',
    errors: 'Caderno de Erros',
    weekly: 'Semana',
};

import { RefreshCw, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
    activeTab: TabId;
    loading: boolean;
    onRefresh: () => void;
    onMenuClick: () => void;
}

export function Header({ activeTab, loading, onRefresh, onMenuClick }: HeaderProps) {
    const { signOut } = useAuth();

    return (
        <header className="mb-8 flex justify-between items-center bg-white/50 lg:bg-transparent p-4 -m-4 lg:p-0 lg:m-0 sticky top-0 z-30 lg:relative lg:z-auto backdrop-blur-md lg:backdrop-blur-none border-b border-slate-200 lg:border-none">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 lg:hidden hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                    title="Menu"
                >
                    <Menu size={24} />
                </button>
                <div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800">{TAB_LABELS[activeTab]}</h2>
                    <p className="text-slate-500 text-xs lg:text-sm hidden sm:block">Organize seus estudos médicos com eficiência.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onRefresh}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                    title="Atualizar dados"
                >
                    <RefreshCw size={20} className={cn(loading && 'animate-spin')} />
                </button>
                <button
                    onClick={signOut}
                    className="p-2 hover:bg-rose-50 rounded-full transition-colors text-rose-600"
                    title="Sair"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
}
