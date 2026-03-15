import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface SpacedRepetitionDashboardProps {
    cardStatusData: { name: string; value: number; color: string }[];
    consolidationRate: number;
    executionRate: number;
    difficultSubtopics: { name: string; mistakes: number }[];
}

export function SpacedRepetitionDashboard({
    cardStatusData,
    consolidationRate,
    executionRate,
    difficultSubtopics
}: SpacedRepetitionDashboardProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status dos Cards - Donut Chart */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Status dos Cards</h3>
                <p className="text-xs text-slate-500 mb-6 uppercase tracking-wider font-semibold">Distribuição Geral</p>

                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={cardStatusData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {cardStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    {cardStatusData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name}</span>
                            <span className="text-xs font-black text-slate-800 ml-auto">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Métricas de Consolidação */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-8">Consolidação</h3>
                <div className="space-y-8 flex-1">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taxa de Execução</span>
                                <HelpCircle size={12} className="text-slate-300" />
                            </div>
                            <span className="text-xl font-black text-slate-800">{executionRate}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${executionRate}%` }} />
                        </div>
                        <p className="text-[10px] mt-2 text-slate-400 font-medium">Revisões no prazo vs agendadas</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taxa de Consolidação</span>
                                <HelpCircle size={12} className="text-slate-300" />
                            </div>
                            <span className="text-xl font-black text-slate-800">{consolidationRate}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${consolidationRate}%` }} />
                        </div>
                        <p className="text-[10px] mt-2 text-slate-400 font-medium">Cards dominados ({'>'}55 dias)</p>
                    </div>
                </div>
            </div>

            {/* Subtemas Resistentes */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 mb-6 text-red-500">
                    <AlertCircle size={20} />
                    <h3 className="text-lg font-bold text-slate-800">Resistentes</h3>
                </div>
                <div className="flex-1 space-y-4">
                    {difficultSubtopics.length > 0 ? difficultSubtopics.map((item, idx) => (
                        <div key={item.name} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="text-sm font-black text-slate-300">{idx + 1}</span>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-700 line-clamp-1">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{item.mistakes}x "não lembrei"</p>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p className="text-xs text-slate-400 italic">Nenhum subtema resistente ainda.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
