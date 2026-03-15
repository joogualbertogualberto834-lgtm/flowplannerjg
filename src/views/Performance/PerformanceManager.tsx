import React from 'react';
import { X, Settings } from 'lucide-react';

interface PerformanceManagerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function PerformanceManager({ isOpen, onClose, children }: PerformanceManagerProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl h-[90vh] sm:h-[80vh] rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-800 text-white">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Gerenciar Dados</h2>
                            <p className="text-xs text-slate-400 font-medium">Configure suas provas, erros e metas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-12">
                    {children}
                </div>
            </div>
        </div>
    );
}
