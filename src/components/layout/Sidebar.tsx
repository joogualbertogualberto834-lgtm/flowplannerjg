import React from 'react';
import {
    LayoutDashboard,
    BookOpen,
    RefreshCw,
    Layers,
    FileText,
    Calendar,
    BrainCircuit,
    X,
    MessageSquareText,
    Gamepad2,
} from 'lucide-react';
import { NavItem } from '../shared/NavItem';

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword';

interface SidebarProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    isOpen: boolean;
    onClose: () => void;
}

const NAV_ITEMS: { icon: React.ReactNode; label: string; id: TabId }[] = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <BookOpen size={20} />, label: 'Especialidades', id: 'topics' },
    { icon: <RefreshCw size={20} />, label: 'Revisões', id: 'reviews' },
    { icon: <Layers size={20} />, label: 'Flashcards', id: 'flashcards' },
    { icon: <FileText size={20} />, label: 'Caderno de Erros', id: 'errors' },
    { icon: <Gamepad2 size={20} />, label: 'Palavras Cruzadas', id: 'crossword' },
    { icon: <Calendar size={20} />, label: 'Semana', id: 'weekly' },
];

export function Sidebar({ activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
    return (
        <aside
            className={`
                fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50 
                transition-transform duration-300 ease-in-out lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
            <div className="p-6 h-full flex flex-col">
                {/* Logo & Close Button */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <BrainCircuit className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800">MED-Flow</h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 lg:hidden hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="space-y-1 flex-1">
                    {NAV_ITEMS.map((item) => (
                        <NavItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            active={activeTab === item.id}
                            onClick={() => onTabChange(item.id)}
                        />
                    ))}
                </nav>
            </div>
        </aside>
    );
}
