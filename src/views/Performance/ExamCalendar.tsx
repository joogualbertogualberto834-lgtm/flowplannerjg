import React from 'react';
import { Calendar, Clock, ChevronRight, AlertCircle, MessageSquare, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';

interface Exam {
    id: number;
    name: string;
    date: string;
    type: string;
    specialties?: string[];
    notes?: string;
    slider_tempo?: number | null;
}

interface ExamCalendarProps {
    exams: Exam[];
    onOpenFeedback: (exam: Exam) => void;
    onAddExam: () => void;
}

export function ExamCalendar({ exams, onOpenFeedback, onAddExam }: ExamCalendarProps) {
    const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const upcomingExams = sortedExams.filter(e => !isPast(new Date(e.date)) || isToday(new Date(e.date)));
    const pastExams = sortedExams.filter(e => isPast(new Date(e.date)) && !isToday(new Date(e.date))).reverse();

    const getDDayColor = (date: string) => {
        const diff = differenceInDays(new Date(date), new Date());
        if (diff < 0) return 'text-slate-400';
        if (diff <= 1) return 'text-white bg-rose-600 px-3 py-1 rounded-full animate-pulse';
        if (diff <= 3) return 'text-rose-600 font-black';
        if (diff <= 7) return 'text-orange-600 font-black';
        if (diff <= 15) return 'text-amber-600 font-bold';
        return 'text-slate-400 font-medium';
    };

    const getCardHighlight = (date: string) => {
        const diff = differenceInDays(new Date(date), new Date());
        if (diff <= 1 && diff >= 0) return 'border-rose-200 bg-rose-50/30';
        return 'border-slate-100 bg-white';
    };

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 text-white rounded-2xl shadow-lg">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Calendário de Provas</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Seu cronograma de guerra</p>
                    </div>
                </div>
                <button
                    onClick={onAddExam}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                >
                    + Nova Prova
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Próximas Provas */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock size={16} /> Próximos Desafios
                    </h3>
                    <div className="space-y-4">
                        {upcomingExams.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                                <p className="text-slate-400 font-bold">Nenhuma prova agendada.</p>
                            </div>
                        ) : (
                            upcomingExams.map(exam => {
                                const diff = differenceInDays(new Date(exam.date), new Date());
                                return (
                                    <motion.div
                                        key={exam.id}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`p-6 rounded-[32px] border transition-all ${getCardHighlight(exam.date)} shadow-sm flex items-center justify-between`}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="text-center min-w-[60px]">
                                                <p className="text-[10px] font-black uppercase text-slate-400">
                                                    {format(new Date(exam.date), 'MMM', { locale: ptBR })}
                                                </p>
                                                <p className="text-3xl font-black text-slate-800 leading-none">
                                                    {format(new Date(exam.date), 'dd')}
                                                </p>
                                            </div>
                                            <div className="h-10 w-px bg-slate-100" />
                                            <div>
                                                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{exam.type}</p>
                                                <h4 className="text-lg font-black text-slate-800">{exam.name}</h4>
                                                {exam.specialties && exam.specialties.length > 0 && (
                                                    <p className="text-[10px] font-medium text-slate-400 mt-1">
                                                        {exam.specialties.join(' • ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs uppercase font-black tracking-tighter ${getDDayColor(exam.date)}`}>
                                                {diff === 0 ? 'HOJE!' : diff === 1 ? 'D-1' : `D-${diff}`}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Provas Realizadas */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <CheckCircle2 size={16} /> Realizadas
                    </h3>
                    <div className="space-y-3">
                        {pastExams.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                                <p className="text-slate-400 font-bold">Histórico limpo por enquanto.</p>
                            </div>
                        ) : (
                            pastExams.map(exam => (
                                <div key={exam.id} className="p-4 bg-slate-50/50 rounded-[24px] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-300 font-black text-xs shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                            {format(new Date(exam.date), 'dd/MM')}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-700">{exam.name}</h4>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{exam.type}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onOpenFeedback(exam)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${exam.slider_tempo
                                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50'
                                            }`}
                                    >
                                        <MessageSquare size={14} />
                                        {exam.slider_tempo ? 'Ver Feedback' : 'Dar Feedback'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Guia de Onboarding para Calendário (Se vazio) */}
            {exams.length === 0 && (
                <div className="p-10 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-[40px] text-center max-w-2xl mx-auto space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                        <Calendar size={32} />
                    </div>
                    <h3 className="text-xl font-black text-blue-900">Seu primeiro passo estratégico</h3>
                    <p className="text-blue-700 font-medium">Cadastre as datas dos seus simulados ou provas oficiais para que o MedFlow calcule o seu ritmo ideal de estudo.</p>
                    <button
                        onClick={onAddExam}
                        className="px-8 py-4 bg-blue-600 text-white rounded-[24px] font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                    >
                        Adicionar minha primeira prova
                    </button>
                </div>
            )}
        </div>
    );
}
