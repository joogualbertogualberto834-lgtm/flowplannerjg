import React from 'react';
import { motion } from 'motion/react';
import { Target, TrendingUp, Calendar, CheckCircle2, Heart, ChevronRight } from 'lucide-react';

interface MedFlowIndexProps {
    index: number;
    isNewUser?: boolean;
    components: {
        gapClosure: number;
        nonRecurrence: number;
        simConsistency: number;
        goalConsistency: number;
        healthBalance: number;
    };
    historySize?: number;
}

export function MedFlowIndex({ index, components, isNewUser, historySize = 3 }: MedFlowIndexProps) {
    const isReady = historySize >= 3;

    const getStatus = (val: number) => {
        if (!isReady) return { label: 'Em Análise', color: 'text-slate-400', bg: 'bg-slate-50' };
        if (val < 40) return { label: 'Crítica', color: 'text-red-500', bg: 'bg-red-50' };
        if (val < 60) return { label: 'Em Construção', color: 'text-orange-500', bg: 'bg-orange-50' };
        if (val < 75) return { label: 'Funcional', color: 'text-yellow-600', bg: 'bg-yellow-50' };
        if (val < 90) return { label: 'Sólida', color: 'text-emerald-500', bg: 'bg-emerald-50' };
        return { label: 'Elite', color: 'text-purple-600', bg: 'bg-purple-50' };
    };

    const status = getStatus(index);

    const items = [
        { label: 'Fechamento de Lacunas', value: components.gapClosure, icon: Target, color: 'text-blue-500', weight: '30%' },
        { label: 'Não Reincidência', value: components.nonRecurrence, icon: TrendingUp, color: 'text-emerald-500', weight: '25%' },
        { label: 'Consistência Simulados', value: components.simConsistency, icon: Calendar, color: 'text-orange-500', weight: '20%' },
        { label: 'Metas de Estudo', value: components.goalConsistency, icon: CheckCircle2, color: 'text-yellow-500', weight: '15%' },
        { label: 'Equilíbrio Saúde', value: components.healthBalance, icon: Heart, color: 'text-red-500', weight: '10%' },
    ];

    return (
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="relative flex-shrink-0">
                    <svg className="w-48 h-48 transform -rotate-90">
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="#F1F5F9"
                            strokeWidth="12"
                        />
                        <motion.circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="12"
                            strokeDasharray={552.92}
                            initial={{ strokeDashoffset: 552.92 }}
                            animate={{ strokeDashoffset: isReady ? 552.92 - (552.92 * index) / 100 : 552.92 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={status.color}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        <span className="text-5xl font-black text-slate-800 tracking-tighter">
                            {isReady ? index : '--'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${status.color}`}>
                            {isReady ? status.label : 'Índice disponível após 3 semanas'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-slate-800">Índice MedFlow</h2>
                        {isNewUser && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                Novo Usuário
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mb-8">Baseado no seu histórico de preparação atual.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((item) => (
                            <div key={item.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-xl bg-white shadow-sm ${item.color}`}>
                                        <item.icon size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.weight}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="text-xs font-semibold text-slate-600 line-clamp-1">{item.label}</span>
                                    <span className="text-lg font-bold text-slate-800">{isNewUser ? 0 : item.value}%</span>
                                </div>
                                <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${isNewUser ? 0 : item.value}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className={`h-full ${item.color.replace('text', 'bg')}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isNewUser ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-8 p-8 bg-slate-900 text-white rounded-[32px] overflow-hidden relative"
                >
                    <div className="relative z-10">
                        <h3 className="text-xl font-black mb-4">Por onde começar</h3>
                        <ul className="space-y-3">
                            {[
                                'Cadastre sua prova no Calendário de Provas (aba Gerenciar)',
                                'Registre erros após simulados (aba Caderno de Oportunidades)',
                                'Crie metas semanais (aba Dashboard)',
                                'Estude temas para gerar dados de aproveitamento'
                            ].map((step, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-400 text-sm">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold">
                                        {i + 1}
                                    </div>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                </motion.div>
            ) : (
                <div className={`mt-8 p-4 rounded-2xl ${status.bg} border border-${status.color.split('-')[1]}-100 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white ${status.color}`}>
                            <TrendingUp size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ponto de melhoria</p>
                            <p className={`text-sm font-bold ${status.color}`}>
                                {items.sort((a, b) => a.value - b.value)[0].label} ({items.sort((a, b) => a.value - b.value)[0].value}%)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const weakest = items.sort((a, b) => a.value - b.value)[0];
                            const targetId = weakest.label === 'Fechamento de Lacunas' ? 'error-analysis-section' :
                                weakest.label === 'Não Reincidência' ? 'spaced-repetition-section' :
                                    weakest.label === 'Consistência Simulados' ? 'questions-panel-section' :
                                        weakest.label === 'Metas de Estudo' ? 'consistency-section' :
                                            'plan-health-section';
                            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                    >
                        Saber mais
                    </button>
                </div>
            )}
        </div>
    );
}
