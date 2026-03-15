import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { StatusIndicator } from '../components/shared/StatusIndicator';
import { Modal } from '../components/ui/Modal';
import { ModalActions } from '../components/ui/ModalActions';
import { postStudySession, undoStudySession } from '../services/api';
import type { Topic } from '../services/types';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TopicsViewProps {
    groupedTopics: Record<string, Topic[]>;
    onUpdate: () => void;
}

export function TopicsView({ groupedTopics, onUpdate }: TopicsViewProps) {
    const [expanded, setExpanded] = useState<string[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [score, setScore] = useState('');
    const [duration, setDuration] = useState('30');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Erro inline no modal — não fecha o app, informa exatamente o que falhou
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const keys = Object.keys(groupedTopics);
        if (keys.length > 0 && expanded.length === 0) {
            setExpanded(keys);
        }
    }, [groupedTopics]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTopic) return;
        setSubmitError(null);

        // Validação antes de enviar ao banco
        const numScore = parseFloat(score);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            setSubmitError('O percentual de acertos deve estar entre 0 e 100.');
            return;
        }

        setIsSubmitting(true);
        try {
            await postStudySession(selectedTopic.id, numScore, parseInt(duration));
            setSelectedTopic(null);
            setScore('');
            setDuration('30');
            await onUpdate();
        } catch (err: any) {
            // Mantém o modal aberto e exibe o erro ao usuário
            setSubmitError(err?.message ?? 'Erro ao salvar sessão. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Zera completamente o progresso do tema — volta ao estado "não estudado"
    const handleReset = async () => {
        if (!selectedTopic) return;
        if (!confirm(`Marcar "${selectedTopic.title}" como NÃO estudado? Isso zera o score, intervalo e data de revisão.`)) return;
        setIsSubmitting(true);
        try {
            // score=0, duration=0 é o sinal de 'reset' no postStudySession
            await postStudySession(selectedTopic.id, 0, 0);
            setSelectedTopic(null);
            setScore('');
            setDuration('30');
            await onUpdate();
        } catch (err: any) {
            setSubmitError(err?.message ?? 'Erro ao zerar tema. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUndo = async (e: React.MouseEvent, topicId: number) => {
        e.stopPropagation();
        if (!confirm('Desfazer o último registro de estudo para este tema?')) return;
        try {
            await undoStudySession(topicId);
            onUpdate();
        } catch (err: any) {
            alert(`Erro ao desfazer: ${err?.message ?? 'Tente novamente.'}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            {Object.entries(groupedTopics).map(([specialty, topics]) => (
                <div
                    key={specialty}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                >
                    <button
                        onClick={() => setExpanded(prev =>
                            prev.includes(specialty)
                                ? prev.filter(s => s !== specialty)
                                : [...prev, specialty]
                        )}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                            <span className="font-semibold text-slate-800">{specialty}</span>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500">
                                {topics.filter((t) => t.last_score !== null).length} / {topics.length} vistos
                            </span>
                        </div>
                        <ChevronDown
                            className={cn(
                                'text-slate-400 transition-transform',
                                expanded.includes(specialty) && 'rotate-180',
                            )}
                        />
                    </button>

                    <AnimatePresence>
                        {expanded.includes(specialty) && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden border-t border-slate-100"
                            >
                                <div className="p-2 space-y-1">
                                    {topics.map((topic) => (
                                        <div
                                            key={topic.id}
                                            className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <StatusIndicator topic={topic} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {topic.title}
                                                    </span>
                                                    {topic.next_review_date && (
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            Revisão:{' '}
                                                            {format(new Date(topic.next_review_date), 'dd/MM/yyyy')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {topic.previous_state && (
                                                    <button
                                                        onClick={(e) => handleUndo(e, topic.id)}
                                                        title="Desfazer último registro"
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-blue-600 text-rose-500 hover:bg-rose-50 transition-all"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedTopic(topic)}
                                                    title="Registrar Estudo"
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}

            {/* Study Modal */}
            <Modal
                open={!!selectedTopic}
                onClose={() => { setSelectedTopic(null); setSubmitError(null); }}
                title="Registrar Estudo"
            >
                {selectedTopic && (
                    <>
                        <p className="text-slate-500 text-sm -mt-4 mb-6">{selectedTopic.title}</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Erro de submissão exibido inline — sem fechar o modal */}
                            {submitError && (
                                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
                                    <AlertTriangle size={14} />
                                    {submitError}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                    Percentual de Acertos (%)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={score}
                                    onChange={(e) => { setScore(e.target.value); setSubmitError(null); }}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Ex: 85"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                    Duração (minutos)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            {/* Rodapé do modal: Cancelar | Não estudado (reset) | Salvar */}
                            <div className="flex items-center justify-between gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setSelectedTopic(null); setSubmitError(null); }}
                                    className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <div className="flex gap-3">
                                    {/* Botão de reset — apenas visível se o tema já foi estudado */}
                                    {selectedTopic?.last_score !== null && (
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            disabled={isSubmitting}
                                            className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors"
                                        >
                                            Não estudado
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isSubmitting ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </>
                )}
            </Modal>
        </div>
    );
}
