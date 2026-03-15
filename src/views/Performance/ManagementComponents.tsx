import React from 'react';
import { Settings, Plus, Calendar, BookMarked, Flame, Target, Trash2, X, FileUp, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Reusable Modal Overlay ---
export function ModalOverlay({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

// --- Exam Row Component ---
export function ExamRow({ exam, onEdit, onDelete, onStartQuiz, onUpload }: {
    exam: any;
    onEdit: (e: any) => void;
    onDelete: (id: number) => void;
    onStartQuiz: (e: any) => void;
    onUpload: (id: number) => void;
    key?: React.Key;
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 transition-all">
            <div className="flex items-center gap-4">
                <div className="text-center min-w-[50px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(exam.date), 'MMM', { locale: ptBR })}</p>
                    <p className="text-lg font-black text-slate-800 leading-none">{format(new Date(exam.date), 'dd')}</p>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                    <h4 className="text-sm font-bold text-slate-800">{exam.name}</h4>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{exam.type}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onUpload(exam.id)} title="Upload PDF/Texto" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <FileUp size={16} />
                </button>
                <button onClick={() => onStartQuiz(exam)} title="Iniciar Quiz" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                    <PlayCircle size={16} />
                </button>
                <button onClick={() => onEdit(exam)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <Settings size={16} />
                </button>
                <button onClick={() => onDelete(exam.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
