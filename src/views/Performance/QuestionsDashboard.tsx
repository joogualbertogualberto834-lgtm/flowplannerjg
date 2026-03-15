import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface QuestionsDashboardProps {
    weeklyData: { week: string; count: number; target: number }[];
    specialtyData: { name: string; percentage: number; trend: 'up' | 'down' | 'stable' }[];
    stats: {
        total: number;
        avgRecent: number;
        avgPrevious: number;
        idealVolume?: number;
        monthsToExam?: number;
    };
}

export function QuestionsDashboard({ weeklyData, specialtyData, stats }: QuestionsDashboardProps) {
    const trend = stats.avgRecent - stats.avgPrevious;
    const isPositive = trend >= 0;

    // ALERTA AUTOMÁTICO — divergência volume/aproveitamento
    const showDivergenceAlert = trend > (stats.avgPrevious * 0.2) && specialtyData.every(s => s.trend === 'down');

    return (
        <div className="space-y-6">
            {showDivergenceAlert && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4"
                >
                    <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700">
                        <TrendingDown size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-900">Alerta de Divergência</p>
                        <p className="text-xs text-amber-700">Seu volume subiu mas seu aproveitamento caiu. Você pode estar priorizando quantidade em vez de fechar lacunas.</p>
                    </div>
                </motion.div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Métrica Central - Volume Semanal */}
                <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Volume Semanal</h3>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Últimas 8 semanas</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Geral</p>
                                <p className="text-xl font-black text-slate-800">{stats.total.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Media (4 sem)</p>
                                <div className="flex items-center gap-1 justify-end">
                                    <p className="text-xl font-black text-slate-800">{Math.round(stats.avgRecent)}</p>
                                    <div className={`flex items-center text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {Math.abs(Math.round(trend))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="week"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F8FAFC' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#10B981"
                                    radius={[6, 6, 0, 0]}
                                    barSize={32}
                                />
                                <Bar
                                    dataKey="target"
                                    fill="#E2E8F0"
                                    radius={[6, 6, 0, 0]}
                                    barSize={32}
                                    opacity={0.3}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Aproveitamento por Especialidade */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Aproveitamento</h3>
                    <div className="flex-1 space-y-5">
                        {specialtyData.map((spec) => {
                            const getColors = (val: number) => {
                                if (val < 60) return 'bg-red-500';
                                if (val < 70) return 'bg-yellow-500';
                                return 'bg-emerald-500';
                            };
                            const barColor = getColors(spec.percentage);

                            return (
                                <div key={spec.name}>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{spec.name}</span>
                                        <div className="flex items-center gap-2">
                                            {spec.trend === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
                                            {spec.trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
                                            <span className="text-sm font-black text-slate-800">{spec.percentage}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${spec.percentage}%` }}
                                            className={`h-full ${barColor} rounded-full`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                            <div className="p-2 rounded-lg bg-blue-500 text-white">
                                <Target size={14} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-blue-400 uppercase">Fase de Preparação</p>
                                <p className="text-xs font-bold text-blue-800">
                                    {stats.monthsToExam ?? '?'} meses para a prova. Ideal: {stats.idealVolume ?? '---'} questões/sem.
                                </p>
                                <p className="text-[10px] text-blue-500 font-medium">Sua média: {Math.round(stats.avgRecent)} questões/sem.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
