import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword' | 'medflow2';

const TAB_LABELS: Record<string, string> = {
    dashboard: 'Início',
    topics: 'Especialidades',
    reviews: 'Revisões',
    flashcards: 'Flashcards',
    errors: 'Caderno de Erros',
    weekly: 'Semana',
    crossword: 'Palavras Cruzadas',
    performance: 'Desempenho',
    medflow2: 'MedFlow 2.0',
};

const TAB_SUBTITLES: Record<string, string> = {
    dashboard: 'Seu painel de comando diário',
    topics: 'Organize seus estudos médicos',
    reviews: 'Revisão espaçada baseada em evidência',
    flashcards: 'Memorização ativa e eficiente',
    errors: 'Transforme erros em aprovação',
    weekly: 'Visão da sua semana',
    crossword: 'Fixe conceitos jogando',
    performance: 'Acompanhe sua preparação',
    medflow2: 'Motor adaptativo de revisão espaçada',
};

import { RefreshCw, LogOut, Menu, HelpCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
    activeTab: string;
    loading: boolean;
    onRefresh: () => void;
    onMenuClick: () => void;
    onShowReset: () => void;
    onShowTutorial: () => void;
}

export function Header({ activeTab, loading, onRefresh, onMenuClick, onShowReset, onShowTutorial }: HeaderProps) {
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
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800">{TAB_LABELS[activeTab] || 'MedFlow'}</h2>
                    <p className="text-slate-500 text-xs lg:text-sm hidden sm:block">
                        {TAB_SUBTITLES[activeTab] || 'Organize seus estudos médicos com eficiência.'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onShowTutorial}
                    title="Tutorial"
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-500"
                >
                    <HelpCircle size={20} />
                </button>
                <button
                    onClick={onShowReset}
                    title="Recomeçar do zero"
                    className="p-2 rounded-full hover:bg-red-50 transition-colors text-slate-400 hover:text-red-400"
                >
                    <RotateCcw size={20} />
                </button>
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
