import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Moon, Dumbbell } from 'lucide-react';

interface PlanHealthDashboardProps {
    statusHistory: {
        study: string[];
        health: string[];
        exercise: string[];
    };
    correlationData: {
        goodSleep: { performance: number; recovery: number };
        poorSleep: { performance: number; recovery: number };
    };
    sustainabilityIndex: number;
}

export function PlanHealthDashboard({ statusHistory, correlationData, sustainabilityIndex }: PlanHealthDashboardProps) {
    const getTrafficLight = (status: string) => {
        switch (status) {
            case 'green': return 'bg-emerald-500';
            case 'yellow': return 'bg-yellow-500';
            case 'red': return 'bg-red-500';
            default: return 'bg-slate-200';
        }
    };

    const getSustainabilityLabel = (val: number) => {
        if (val > 70) return { label: 'Ritmo Sustentável', color: 'text-emerald-500', bg: 'bg-emerald-50' };
        if (val > 50) return { label: 'Sustentável com Ajustes', color: 'text-yellow-600', bg: 'bg-yellow-50' };
        return { label: 'Risco de Burnout', color: 'text-red-500', bg: 'bg-red-50' };
    };

    const sust = getSustainabilityLabel(sustainabilityIndex);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Semáforos e Histórico */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-8">Saúde do Plano</h3>
                <div className="space-y-6 flex-1">
                    {[
                        { label: 'Estudo', history: statusHistory.study },
                        { label: 'Saúde (Sono)', history: statusHistory.health },
                        { label: 'Exercício', history: statusHistory.exercise },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                            <div className="flex gap-2">
                                {item.history.map((s, idx) => (
                                    <div key={idx} className={`w-6 h-6 rounded-full ${getTrafficLight(s)} shadow-sm border-2 border-white`} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cruzamento Saúde-Desempenho */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <Zap size={20} className="text-yellow-500" />
                    <h3 className="text-lg font-bold text-slate-800">Impacto da Saúde</h3>
                </div>
                {correlationData ? (
                    <>
                        <div className="space-y-4 flex-1">
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Moon size={14} className="text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Sono Adequado</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-black text-emerald-700">{correlationData.goodSleep.performance}%</span>
                                    <span className="text-[10px] text-emerald-600 font-bold">Aproveitamento</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Moon size={14} className="text-red-500" />
                                    <span className="text-[10px] font-bold text-red-500 uppercase">Sono Insuficiente</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-black text-red-700">{correlationData.poorSleep.performance}%</span>
                                    <span className="text-[10px] text-red-500 font-bold">Aproveitamento</span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-[10px] text-slate-400 italic text-center">
                            "Dormir bem impacta em {correlationData.goodSleep.performance - correlationData.poorSleep.performance} pontos seu desempenho."
                        </p>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <Moon size={20} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dados Insuficientes</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Precisamos de pelo menos 3 semanas com metas de saúde batidas e 3 semanas com metas falhas para calcular a correlação.
                        </p>
                    </div>
                )}
            </div>

            {/* Sustentabilidade */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-8">Sustentabilidade</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    {sustainabilityIndex !== null ? (
                        <>
                            <div className={`w-32 h-32 rounded-full border-8 border-slate-50 flex items-center justify-center relative mb-6`}>
                                <motion.div
                                    initial={{ rotate: -90 }}
                                    animate={{ rotate: (sustainabilityIndex / 100 * 360) - 90 }}
                                    className="absolute inset-x-0 top-0 flex justify-center -mt-2"
                                >
                                    <div className="w-4 h-4 rounded-full bg-white shadow-md border-2 border-slate-800" />
                                </motion.div>
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl font-black text-slate-800">{sustainabilityIndex}%</span>
                                    <ShieldCheck size={20} className={sust.color} />
                                </div>
                            </div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${sust.color}`}>{sust.label}</p>
                        </>
                    ) : (
                        <div className="p-4">
                            <p className="text-xs text-slate-400 italic">Crie metas de saúde e exercício para ver o impacto no desempenho.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
