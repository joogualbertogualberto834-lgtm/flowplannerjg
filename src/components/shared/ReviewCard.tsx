import React, { useState } from 'react';
import { Calendar, RotateCcw, CalendarX, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { postStudySession, undoStudySession, clearReview } from '../../services/api';
import type { Topic } from '../../services/types';

interface ReviewCardProps {
    key?: React.Key;
    topic: Topic;
    onUpdate: () => void;
}

export function ReviewCard({ topic, onUpdate }: ReviewCardProps) {
    const [showForm, setShowForm] = useState(false);
    const [score, setScore] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // Msg de erro inline — não interrompe o app, apenas informa o usuário
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        // Validação de input para garantir integridade do algoritmo de revisão
        const numScore = parseFloat(score);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            setErrorMsg('Insira um valor entre 0 e 100.');
            return;
        }

        setSubmitting(true);
        try {
            await postStudySession(topic.id, numScore, 20, 'Review');
            setShowForm(false);
            setScore('');
            onUpdate();
        } catch (err: any) {
            // Exibe o erro sem fechar o card — usuário pode tentar novamente
            setErrorMsg(err?.message ?? 'Erro ao salvar. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUndo = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Desfazer o último registro de estudo?')) return;
        try {
            await undoStudySession(topic.id);
            onUpdate();
        } catch (err: any) {
            alert(`Erro ao desfazer: ${err?.message ?? 'Tente novamente.'}`);
        }
    };

    const handleClearReview = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Remover este card das revisões? (O tema continuará existindo, mas a data de próxima revisão será limpa)'))
            return;
        try {
            await clearReview(topic.id);
            onUpdate();
        } catch (err: any) {
            alert(`Erro ao remover revisão: ${err?.message ?? 'Tente novamente.'}`);
        }
    };

    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">
                        {topic.specialty}
                    </p>
                    <h4 className="font-semibold text-slate-800">{topic.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                            Último rendimento:{' '}
                            <span className="font-bold">
                                {topic.last_score !== null ? `${topic.last_score}%` : 'Não visto'}
                            </span>
                        </span>
                        <span>•</span>
                        <span>
                            Intervalo: <span className="font-bold">{topic.current_interval || 0} dias</span>
                        </span>
                        {topic.next_review_date && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                    <Calendar size={12} />
                                    Revisão: {format(new Date(topic.next_review_date), 'dd/MM/yyyy')}
                                </span>
                            </>
                        )}
                        {topic.urgency_count > 0 && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                                Urgência Nível {topic.urgency_count}
                                <span className="opacity-50">•</span>
                                {topic.study_count} revisões
                            </span>
                        )}
                        {topic.urgency_count === 0 && topic.study_count > 0 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase">
                                {topic.study_count} revisões
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {topic.previous_state && (
                        <button
                            onClick={handleUndo}
                            title="Desfazer último registro"
                            className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all"
                        >
                            <RotateCcw size={20} />
                        </button>
                    )}
                    <button
                        onClick={handleClearReview}
                        title="Remover das revisões"
                        className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all"
                    >
                        <CalendarX size={20} />
                    </button>
                    <button
                        onClick={() => { setShowForm(!showForm); setErrorMsg(null); }}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                        Revisar
                    </button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    {/* Msg de erro não-bloqueante — app não fecha */}
                    {errorMsg && (
                        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
                            <AlertTriangle size={14} />
                            {errorMsg}
                        </div>
                    )}
                    <div className="flex gap-3">
                        <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="% Acertos (0–100)"
                            value={score}
                            onChange={(e) => { setScore(e.target.value); setErrorMsg(null); }}
                            disabled={submitting}
                            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
                        >
                            {submitting ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
