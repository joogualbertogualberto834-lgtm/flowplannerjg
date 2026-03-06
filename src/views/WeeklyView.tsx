import React from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Topic } from '../services/types';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface WeeklyViewProps {
    topics: Topic[];
}

export function WeeklyView({ topics }: WeeklyViewProps) {
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());
    const days = eachDayOfInterval({ start, end });

    return (
        <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {days.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayTopics = topics.filter(
                        (t) =>
                            t.next_review_date &&
                            format(new Date(t.next_review_date), 'yyyy-MM-dd') === dayKey,
                    );
                    const isToday = dayKey === format(new Date(), 'yyyy-MM-dd');

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                'bg-white rounded-2xl border p-4 min-h-[200px] flex flex-col',
                                isToday ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200',
                            )}
                        >
                            <div className="mb-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    {format(day, 'EEEE')}
                                </p>
                                <p
                                    className={cn(
                                        'text-lg font-bold',
                                        isToday ? 'text-emerald-600' : 'text-slate-800',
                                    )}
                                >
                                    {format(day, 'dd')}
                                </p>
                            </div>

                            <div className="flex-1 space-y-2">
                                {dayTopics.map((topic) => (
                                    <div
                                        key={topic.id}
                                        className="text-[10px] p-2 bg-slate-50 rounded-lg border border-slate-100 font-medium text-slate-600"
                                    >
                                        {topic.title}
                                    </div>
                                ))}
                                {dayTopics.length === 0 && (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-[10px] text-slate-300 italic">Vazio</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
