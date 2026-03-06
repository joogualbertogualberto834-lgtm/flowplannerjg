import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { format, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    BookOpen,
    CheckCircle2,
    AlertCircle,
    Clock,
    TrendingUp,
    Calendar,
} from 'lucide-react';
import { StatCard } from '../components/shared/StatCard';
import { CasioStopwatch } from '../components/shared/CasioStopwatch';
import { SectionHeader } from '../components/ui/SectionHeader';
import type { DashboardStats, Topic } from '../services/types';

interface DashboardViewProps {
    data: DashboardStats | null;
    topics: Topic[];
    onUpdate: () => void;
}

export function DashboardView({ data, topics, onUpdate }: DashboardViewProps) {
    if (!data) return null;

    const projections = topics
        .filter((t) => t.next_review_date)
        .sort(
            (a, b) =>
                new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime(),
        )
        .reduce(
            (acc, topic) => {
                const dateKey = format(new Date(topic.next_review_date!), 'dd/MM');
                const existing = acc.find((p) => p.dateKey === dateKey);
                if (existing) {
                    existing.topics.push(topic);
                } else {
                    acc.push({ dateKey, topics: [topic], date: new Date(topic.next_review_date!) });
                }
                return acc;
            },
            [] as { dateKey: string; topics: Topic[]; date: Date }[],
        );

    const next24h = topics.filter(
        (t) =>
            t.next_review_date && isBefore(new Date(t.next_review_date), addDays(new Date(), 1)),
    ).length;

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total de Temas"
                    value={data.stats.total_topics}
                    icon={<BookOpen className="text-blue-600" />}
                    color="blue"
                />
                <StatCard
                    title="Alta Performance"
                    value={data.stats.high_perf}
                    icon={<CheckCircle2 className="text-emerald-600" />}
                    color="emerald"
                />
                <StatCard
                    title="Atrasados"
                    value={data.stats.overdue}
                    icon={<AlertCircle className="text-rose-600" />}
                    color="rose"
                />
                <StatCard
                    title="Próximas 24h"
                    value={next24h}
                    icon={<Clock className="text-amber-600" />}
                    color="amber"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <SectionHeader
                            icon={<TrendingUp size={20} className="text-emerald-600" />}
                            title="Esforço Diário (min)"
                        />
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.effort}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        }}
                                    />
                                    <Bar dataKey="total_minutes" fill="#10B981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <CasioStopwatch onSave={onUpdate} />
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <SectionHeader
                        icon={<Calendar size={20} className="text-blue-600" />}
                        title="Projeção de Revisões"
                    />
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {projections.length > 0 ? (
                            projections.map(({ dateKey, topics: dateTopics, date }) => (
                                <div
                                    key={dateKey}
                                    className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100 last:border-0"
                                >
                                    <div className="flex flex-col items-center justify-center min-w-[48px] h-[48px] bg-blue-50 text-blue-600 rounded-xl font-bold">
                                        <span className="text-[10px] uppercase opacity-60 leading-none">
                                            {format(date, 'MMM', { locale: ptBR })}
                                        </span>
                                        <span className="text-lg leading-none">{format(date, 'dd')}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap gap-1">
                                            {dateTopics.map((t) => (
                                                <span
                                                    key={t.id}
                                                    className="text-xs font-medium text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm"
                                                >
                                                    {t.title}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 text-sm italic text-center py-10">
                                Nenhuma revisão agendada ainda.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
