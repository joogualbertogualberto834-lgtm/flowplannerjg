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
    TrendingUp,
    Zap,
} from 'lucide-react';
import { NavItem } from '../shared/NavItem';

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword' | 'performance' | 'medflow2';

interface SidebarProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    isOpen: boolean;
    onClose: () => void;
}

const NAV_GROUPS = [
    {
        label: 'ACOMPANHAR',
        items: [
            {
                icon: <Zap size={20} />,
                label: 'MedFlow 2.0',
                id: 'medflow2'
            },
        ]
    }
];

export function Sidebar({ activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
    return (
        <aside
            className={`
                fixed left-0 top-0 h-full z-50 
                transition-all duration-300 ease-in-out lg:translate-x-0
                hover:w-64 group/sidebar glass border-r border-white/40
                ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:w-20'}
            `}
        >
            <div className="p-4 h-full flex flex-col overflow-hidden">
                {/* Logo & Close Button */}
                <div className="flex items-center gap-3 mb-10 px-2 overflow-hidden">
                    <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-100">
                        <BrainCircuit className="text-white w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-black tracking-tighter text-slate-800 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        MED-Flow
                    </h1>
                    <button
                        onClick={onClose}
                        className="p-2 lg:hidden hover:bg-white/60 rounded-xl transition-colors text-slate-500 ml-auto"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Nav */}
                <nav className="flex-1 space-y-8 overflow-y-auto scrollbar-hide">
                    {NAV_GROUPS.map(group => (
                        <div key={group.label} className="space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 mb-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                {group.label}
                            </p>
                            <div className="space-y-1">
                                {group.items.map(item => (
                                    item.id === 'medflow2' ? (
                                        <div
                                            key="medflow2"
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-bold group/nav overflow-hidden ${activeTab === 'medflow2' ? 'bg-slate-800 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'}`}
                                            onClick={() => onTabChange('medflow2' as TabId)}
                                        >
                                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                                <Zap size={20} />
                                            </div>
                                            <span className="flex-1 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                                MedFlow 2.0
                                            </span>
                                            <span className="text-[8px] font-black bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                                                BETA
                                            </span>
                                        </div>
                                    ) : (
                                        <NavItem
                                            key={item.id}
                                            icon={item.icon}
                                            label={item.label}
                                            active={activeTab === item.id}
                                            onClick={() => onTabChange(item.id as TabId)}
                                        />
                                    )
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>
        </aside>
    );
}
