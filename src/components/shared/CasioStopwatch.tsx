import React, { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { postStudyLog } from '../../services/api';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CasioStopwatchProps {
    onSave: () => void;
}

export function CasioStopwatch({ onSave }: CasioStopwatchProps) {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning) {
            interval = setInterval(() => {
                setTime((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleSave = async () => {
        if (time < 60) {
            alert('Estude pelo menos 1 minuto para registrar.');
            return;
        }
        setIsSaving(true);
        try {
            const duration_minutes = Math.floor(time / 60);
            await postStudyLog(duration_minutes);
            setTime(0);
            setIsRunning(false);
            onSave();
        } catch (err) {
            console.error('Failed to save study log', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-slate-800 p-4 rounded-3xl border-4 border-slate-700 shadow-xl max-w-sm mx-auto overflow-hidden relative group">
            {/* Casio Bezel Look */}
            <div className="absolute top-2 left-4 text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                Casio
            </div>
            <div className="absolute top-2 right-4 text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                Water Resist
            </div>

            <div className="mt-4 bg-[#94a3b8] p-4 rounded-lg border-4 border-slate-900 shadow-inner flex flex-col items-center">
                <div className="w-full flex justify-between px-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-800">ALM</span>
                    <span className="text-[10px] font-bold text-slate-800">SIG</span>
                    <span className="text-[10px] font-bold text-slate-800">PM</span>
                </div>
                <div className="font-digital text-4xl md:text-5xl text-slate-900 tracking-tighter">
                    {formatTime(time)}
                </div>
                <div className="w-full flex justify-center mt-2">
                    <div className="h-1 w-12 bg-slate-800/20 rounded-full" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={cn(
                        'py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg',
                        isRunning
                            ? 'bg-rose-600 text-white shadow-rose-900/40'
                            : 'bg-emerald-600 text-white shadow-emerald-900/40',
                    )}
                >
                    {isRunning ? 'Stop' : 'Start'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving || isRunning || time === 0}
                    className="py-3 bg-slate-200 text-slate-800 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg shadow-slate-900/40"
                >
                    {isSaving ? 'Saving...' : 'Log Time'}
                </button>
            </div>

            <div className="mt-3 flex justify-center gap-8">
                <div className="flex flex-col items-center">
                    <div className="w-4 h-1 bg-slate-600 rounded-full mb-1" />
                    <span className="text-[8px] text-slate-500 font-bold uppercase">Mode</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-4 h-1 bg-slate-600 rounded-full mb-1" />
                    <span className="text-[8px] text-slate-500 font-bold uppercase">Light</span>
                </div>
            </div>
        </div>
    );
}
