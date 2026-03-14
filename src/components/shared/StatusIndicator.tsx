import React from 'react';
import { addDays, isBefore } from 'date-fns';
import type { Topic } from '../../services/types';

interface StatusIndicatorProps {
    topic: Topic;
}

/**
 * Bolinha colorida que indica o estado da revisão de um tópico:
 * - Cinza: nunca estudado (sem last_score)
 * - Verde sólido: estudado, sem próxima revisão agendada
 * - Vermelho pulsante: revisão atrasada
 * - Âmbar: revisão nos próximos 3 dias
 * - Verde: revisão agendada no futuro
 */
export function StatusIndicator({ topic }: StatusIndicatorProps) {
    const hasBeenStudied = topic.last_score !== null;
    const isOverdue =
        topic.next_review_date && isBefore(new Date(topic.next_review_date), new Date());
    const isSoon =
        topic.next_review_date &&
        isBefore(new Date(topic.next_review_date), addDays(new Date(), 3));

    // Nunca estudado — cinza
    if (!hasBeenStudied) return <div className="w-2 h-2 rounded-full bg-slate-200" />;

    // Estudado mas sem revisão agendada — verde mais claro (em manutenção)
    if (!topic.next_review_date) return <div className="w-2 h-2 rounded-full bg-emerald-400" title="Estudado" />;

    // Revisão atrasada
    if (isOverdue) return <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />;

    // Revisão nos próximos 3 dias
    if (isSoon) return <div className="w-2 h-2 rounded-full bg-amber-500" />;

    // Revisão agendada futuramente
    return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
}
