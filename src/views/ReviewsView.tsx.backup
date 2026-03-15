import React, { useMemo } from 'react';
import { AlertCircle, Clock, Calendar } from 'lucide-react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReviewCard } from '../components/shared/ReviewCard';
import type { Topic } from '../services/types';

interface ReviewsViewProps {
    topics: Topic[];
    onUpdate: () => void;
}

export function ReviewsView({ topics, onUpdate }: ReviewsViewProps) {
    const overdue = topics
        .filter((t) => t.next_review_date && isBefore(new Date(t.next_review_date), new Date()))
        .sort(
            (a, b) =>
                new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime(),
        );

    const upcoming = topics
        .filter(
            (t) =>
                t.next_review_date &&
                isAfter(new Date(t.next_review_date), new Date()) &&
                isBefore(new Date(t.next_review_date), addDays(new Date(), 7)),
        )
        .sort(
            (a, b) =>
                new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime(),
        );

    const nextMonths = topics
        .filter(
            (t) =>
                t.next_review_date && isAfter(new Date(t.next_review_date), addDays(new Date(), 7)),
        )
        .sort(
            (a, b) =>
                new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime(),
        );

    const groupedByMonth: Record<string, Topic[]> = useMemo(() => {
        const result: Record<string, Topic[]> = {};
        for (const topic of nextMonths) {
            const date = new Date(topic.next_review_date!);
            const monthYear = format(date, 'MMMM yyyy', { locale: ptBR });
            if (!result[monthYear]) result[monthYear] = [];
            result[monthYear].push(topic);
        }
        return result;
    }, [nextMonths]);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Atrasados */}
            <section>
                <h3 className="text-lg font-bold text-rose-600 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Atrasados ({overdue.length})
                </h3>
                <div className="grid gap-3">
                    {overdue.map((topic) => (
                        <ReviewCard key={topic.id} topic={topic} onUpdate={onUpdate} />
                    ))}
                    {overdue.length === 0 && (
                        <p className="text-slate-400 text-sm italic">Nenhuma revisão atrasada. Bom trabalho!</p>
                    )}
                </div>
            </section>

            {/* Próximos 7 dias */}
            <section>
                <h3 className="text-lg font-bold text-amber-600 mb-4 flex items-center gap-2">
                    <Clock size={20} />
                    Próximos 7 dias ({upcoming.length})
                </h3>
                <div className="grid gap-3">
                    {upcoming.map((topic) => (
                        <ReviewCard key={topic.id} topic={topic} onUpdate={onUpdate} />
                    ))}
                    {upcoming.length === 0 && (
                        <p className="text-slate-400 text-sm italic">
                            Nada agendado para os próximos 7 dias.
                        </p>
                    )}
                </div>
            </section>

            {/* Próximos meses */}
            <section className="space-y-6">
                <h3 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
                    <Calendar size={20} />
                    Próximos meses ({nextMonths.length})
                </h3>
                {Object.entries(groupedByMonth).map(([month, monthTopics]) => (
                    <div key={month} className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                            {month}
                        </h4>
                        <div className="grid gap-3">
                            {monthTopics.map((topic) => (
                                <ReviewCard key={topic.id} topic={topic} onUpdate={onUpdate} />
                            ))}
                        </div>
                    </div>
                ))}
                {nextMonths.length === 0 && (
                    <p className="text-slate-400 text-sm italic">
                        Nenhuma revisão agendada para os próximos meses.
                    </p>
                )}
            </section>
        </div>
    );
}
