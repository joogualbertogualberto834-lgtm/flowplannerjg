import React from 'react';
import { motion } from 'motion/react';
import { Activity, Thermometer } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ErrorAnalysisDashboardProps {
    errorOrigins: { type: string; percentage: number; trend: 'up' | 'down' | 'stable' }[];
    heatmapData: { specialty: string; months: number[] }[];
    positionData?: { block: string; count: number }[];
}

export function ErrorAnalysisDashboard({ errorOrigins, heatmapData, positionData }: ErrorAnalysisDashboardProps) {
    const last6Months = Array.from({ length: 6 }, (_, i) =>
        format(subMonths(new Date(), 5 - i), 'MMM', { locale: ptBR })
    );

    const getOriginLabel = (type: string) => {
        switch (type) {
            case 'desatencao': return 'Desatenção';
            case 'falta_contato': return 'Falta de Contato';
            case 'cansaco': return 'Cansaço';
            default: return type;
        }
    };

    const getHeatmapColor = (val: number) => {
        if (val === 0) return 'bg-slate-50';
        if (val < 3) return 'bg-red-200';
        if (val < 6) return 'bg-red-400';
        return 'bg-red-600';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Distribuição de Origens */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                    <Activity size={20} className="text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800">Origens de Erro</h3>
                </div>
                <div className="space-y-6 flex-1">
                    {errorOrigins.map((origin) => (
                        <div key={origin.type}>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{getOriginLabel(origin.type)}</span>
                                <span className="text-sm font-black text-slate-800">{origin.percentage}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${origin.percentage}%` }}
                                    className="h-full bg-slate-400 rounded-full"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4">Erros por Posição</h4>
                    <div className="space-y-3">
                        {positionData?.map((block) => {
                            const max = Math.max(...(positionData?.map(d => d.count) || [1]));
                            const width = (block.count / max) * 100;
                            return (
                                <div key={block.block} className="flex items-center gap-3">
                                    <span className="text-[9px] font-bold text-slate-400 w-12">{block.block}</span>
                                    <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${width}%` }}
                                            className={`h-full ${block.count > (max * 0.7) ? 'bg-orange-400' : 'bg-slate-300'}`}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600">{block.count}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Mapa de Calor */}
            <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-8">
                    <Thermometer size={20} className="text-red-500" />
                    <h3 className="text-lg font-bold text-slate-800">Mapa de Calor Médico</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="text-left py-2 px-1 text-[10px] font-bold text-slate-400 uppercase">Especialidade</th>
                                {last6Months.map(m => (
                                    <th key={m} className="text-center py-2 px-1 text-[10px] font-bold text-slate-400 uppercase">{m}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {heatmapData.map((row) => (
                                <tr key={row.specialty}>
                                    <td className="py-3 px-1">
                                        <span className="text-[11px] font-bold text-slate-600 truncate max-w-[120px] block">{row.specialty}</span>
                                    </td>
                                    {row.months.map((val, idx) => (
                                        <td key={idx} className="py-2 px-1">
                                            <div className={`h-8 w-full rounded-lg ${getHeatmapColor(val)}`} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Menos Erros</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-slate-100" />
                        <div className="w-3 h-3 rounded-sm bg-red-200" />
                        <div className="w-3 h-3 rounded-sm bg-red-400" />
                        <div className="w-3 h-3 rounded-sm bg-red-600" />
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Mais Erros</span>
                </div>
            </div>
        </div>
    );
}
