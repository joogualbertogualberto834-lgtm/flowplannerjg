import React from 'react';
import type { Topic } from '../../services/types';

interface TopicSelectProps {
    topics: Topic[];
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}

/**
 * Seletor de temas reutilizável.
 * Substitui o <select> duplicado em FlashcardsView e ErrorsView.
 */
export function TopicSelect({ topics, value, onChange, required = true }: TopicSelectProps) {
    return (
        <select
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
            <option value="">Selecione um tema</option>
            {topics.map((t) => (
                <option key={t.id} value={t.id}>
                    {t.title}
                </option>
            ))}
        </select>
    );
}
