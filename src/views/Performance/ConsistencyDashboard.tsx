import React from 'react';
import { motion } from 'motion/react';
import { Zap, Trophy, History } from 'lucide-react';

interface ConsistencyDashboardProps {
    activityData: { date: string; intensity: number }[]; // intensity 0-4
    currentStreak: number;
    recordStreak: number;
    weeklyConsistency: number;
    advice?: {
        revisionVsQuestions: boolean;
    };
}

export function ConsistencyDashboard({ activityData, currentStreak, recordStreak, weeklyConsistency, advice }: ConsistencyDashboardProps) {
    return (
        <div className="space-y-6">
            {advice?.revisionVsQuestions && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-4"
                >
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Zap size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-orange-900">Alerta de Revisão vs Questões</p>
                        <p className="text-xs text-orange-700">O robô notou que você está priorizando questões em detrimento das revisões agendadas. Sem revisão, o conhecimento vaza. Equilibre mais sua rotina amanhã.</p>
                    </div>
                </motion.div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendário de Atividade */}
                <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <History size={20} className="text-slate-400" />
                            <h3 className="text-lg font-bold text-slate-800">Calendário de Atividade</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Taxa de Consistência</p>
                            <p className="text-xl font-black text-slate-800">{weeklyConsistency}%</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                        {activityData.map((day, idx) => {
                            const getColor = (intensity: number) => {
                                switch (intensity) {
                                    case 0: return 'bg-slate-50';
                                    case 1: return 'bg-emerald-100';
                                    case 2: return 'bg-emerald-300';
                                    case 3: return 'bg-emerald-500';
                                    case 4: return 'bg-emerald-700';
                                    default: return 'bg-slate-50';
                                }
                            };
                            return (
                                <div
                                    key={idx}
                                    className={`w-3 h-3 rounded-sm ${getColor(day.intensity)}`}
                                    title={day.date}
                                />
                            );
                        })}
                    </div>

                    <div className="mt-6 flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Meta Batida</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-100" />
                            <span>Alguma Atividade</span>
                        </div>
                    </div>
                </div>

                {/* Sequências */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                        <div className="p-3 rounded-2xl bg-orange-500 text-white mb-4 shadow-lg shadow-orange-500/20">
                            <Zap size={24} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sequência Atual</p>
                        <p className="text-4xl font-black text-slate-800">{currentStreak} dias</p>
                    </div>

                    <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center">
                        <div className="p-3 rounded-2xl bg-emerald-500 text-white mb-4 shadow-lg shadow-emerald-500/20">
                            <Trophy size={24} />
                        </div>
                        <p className="text-[10px] font-bold text-emerald-600/50 uppercase mb-1">Seu Recorde</p>
                        <p className="text-3xl font-black text-emerald-700">{recordStreak} dias</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
