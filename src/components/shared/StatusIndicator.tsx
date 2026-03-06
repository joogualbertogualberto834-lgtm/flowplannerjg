import React from 'react';
import { addDays, isBefore } from 'date-fns';
import type { Topic } from '../../services/types';

interface StatusIndicatorProps {
    topic: Topic;
}

/**
 * Bolinha colorida que indica o estado da revisão de um tópico:
 * - Cinza: nunca estudado
 * - Vermelho pulsante: atrasado
 * - Âmbar: próximos 3 dias
 * - Verde: em dia
 */
export function StatusIndicator({ topic }: StatusIndicatorProps) {
    const isOverdue =
        topic.next_review_date && isBefore(new Date(topic.next_review_date), new Date());
    const isSoon =
        topic.next_review_date &&
        isBefore(new Date(topic.next_review_date), addDays(new Date(), 3));

    if (!topic.next_review_date) return <div className="w-2 h-2 rounded-full bg-slate-200" />;
    if (isOverdue) return <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />;
    if (isSoon) return <div className="w-2 h-2 rounded-full bg-amber-500" />;
    return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
}
