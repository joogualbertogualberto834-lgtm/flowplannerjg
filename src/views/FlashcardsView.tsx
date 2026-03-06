import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    RefreshCw,
    Zap,
    Layers,
    Trash2,
    Timer,
    ChevronDown,
    Save,
    X,
    BarChart2,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Modal } from '../components/ui/Modal';
import { ModalActions } from '../components/ui/ModalActions';
import { TopicSelect } from '../components/ui/TopicSelect';
import {
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    scoreFlashcard,
    addError,
} from '../services/api';
import type { Flashcard, FlashcardStats, Topic } from '../services/types';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FlashcardsViewProps {
    flashcards: Flashcard[];
    allFlashcards: Flashcard[];
    topics: Topic[];
    groupedTopics: Record<string, Topic[]>;
    stats: FlashcardStats | null;
    onUpdate: () => void;
}

export function FlashcardsView({
    flashcards,
    allFlashcards,
    topics,
    groupedTopics,
    stats,
    onUpdate,
}: FlashcardsViewProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [newCard, setNewCard] = useState({ topic_id: '', front: '', back: '' });
    const [studySession, setStudySession] = useState<{
        cards: Flashcard[];
        index: number;
        startTime: number;
    } | null>(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
    const [expandedSpecialty, setExpandedSpecialty] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const filteredList = useMemo(() => {
        let list = allFlashcards;
        if (selectedTopicId) list = list.filter((c) => c.topic_id === selectedTopicId);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q),
            );
        }
        return list;
    }, [allFlashcards, selectedTopicId, searchQuery]);

    useEffect(() => {
        if (showAdd && selectedTopicId) {
            setNewCard((prev) => ({ ...prev, topic_id: String(selectedTopicId) }));
        }
    }, [showAdd, selectedTopicId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCard.topic_id) {
            alert('Por favor, selecione um tema.');
            return;
        }
        setIsAdding(true);
        try {
            await addFlashcard({ ...newCard, topic_id: parseInt(newCard.topic_id) });
            await onUpdate();
            setShowAdd(false);
            setNewCard({ topic_id: '', front: '', back: '' });
        } catch (err) {
            alert(`Erro ao salvar flashcard: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        } finally {
            setIsAdding(false);
        }
    };

    const handleScore = async (difficulty: number) => {
        if (!studySession) return;
        const currentCard = studySession.cards[studySession.index];
        const duration = Math.round((Date.now() - studySession.startTime) / 60000);
        await scoreFlashcard(currentCard.id, difficulty, duration);
        setIsFlipped(false);
        if (studySession.index + 1 < studySession.cards.length) {
            setStudySession({ ...studySession, index: studySession.index + 1, startTime: Date.now() });
        } else {
            setStudySession(null);
        }
        onUpdate();
    };

    const saveToNotebook = async (content: string, topicId: number) => {
        await addError({ topic_id: String(topicId), content, tags: 'Flashcard' });
        alert('Salvo no Caderno de Erros!');
    };

    const startStudy = (cards: Flashcard[]) => {
        if (cards.length === 0) {
            alert('Nenhum card pendente para este filtro!');
            return;
        }
        setStudySession({ cards, index: 0, startTime: Date.now() });
        setIsFlipped(false);
    };

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar de especialidades */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Especialidades
                        </h4>
                        <button
                            onClick={() => setShowAdd(true)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                            ＋
                        </button>
                    </div>

                    <div className="space-y-1">
                        {Object.entries(groupedTopics).map(([spec, specTopics]) => (
                            <div key={spec} className="space-y-1">
                                <div className="flex items-center justify-between group">
                                    <button
                                        onClick={() =>
                                            setExpandedSpecialty(expandedSpecialty === spec ? null : spec)
                                        }
                                        className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                                    >
                                        <ChevronDown
                                            size={14}
                                            className={cn(
                                                'transition-transform',
                                                expandedSpecialty === spec && 'rotate-180',
                                            )}
                                        />
                                        {spec}
                                    </button>
                                    <button
                                        onClick={() =>
                                            startStudy(
                                                allFlashcards.filter(
                                                    (c) => c.specialty === spec && c.last_difficulty !== null,
                                                ),
                                            )
                                        }
                                        className="opacity-0 group-hover:opacity-100 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Revisar Especialidade"
                                    >
                                        <Zap size={14} />
                                    </button>
                                </div>

                                {expandedSpecialty === spec && (
                                    <div className="pl-6 space-y-1">
                                        {specTopics.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelectedTopicId(t.id)}
                                                className={cn(
                                                    'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all',
                                                    selectedTopicId === t.id
                                                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                                                        : 'text-slate-500 hover:bg-slate-50',
                                                )}
                                            >
                                                <span className="truncate">{t.title}</span>
                                                <span className="text-[10px] opacity-50">{t.card_count || 0}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Panel */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <BarChart2 size={14} /> Estatísticas
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase">Volume Total</p>
                            <p className="text-xl font-bold">{stats?.totals.total_reviews || 0}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase">Tempo Total</p>
                            <p className="text-xl font-bold">{stats?.totals.total_minutes || 0}m</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                        <p className="text-[10px] text-slate-400 uppercase mb-1">Média por Card</p>
                        <p className="text-sm font-medium">
                            {stats?.totals.total_reviews
                                ? (stats.totals.total_minutes / stats.totals.total_reviews).toFixed(1)
                                : 0}{' '}
                            min/card
                        </p>
                    </div>
                </div>
            </div>

            {/* Conteúdo principal */}
            <div className="lg:col-span-3 space-y-6">
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="relative flex-1 w-full">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                size={18}
                            />
                            <input
                                type="text"
                                placeholder="Pesquisar nos seus cards..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => startStudy(flashcards.filter((c) => c.last_difficulty === 0))}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-sm hover:bg-rose-100 transition-all"
                            >
                                <Zap size={18} /> Estudar Difíceis
                            </button>
                            {selectedTopicId && (
                                <button
                                    onClick={() =>
                                        startStudy(allFlashcards.filter((c) => c.topic_id === selectedTopicId))
                                    }
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                                >
                                    <RefreshCw size={18} /> Estudar Tema
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() =>
                            startStudy(
                                allFlashcards.filter(
                                    (c) => !c.next_review || new Date(c.next_review) <= new Date(),
                                ),
                            )
                        }
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all group"
                    >
                        <Layers size={24} className="group-hover:scale-110 transition-transform" />
                        Estudar Pendentes (Novos + Revisões)
                    </button>
                </div>

                {/* Lista de Cards */}
                <div className="grid gap-4">
                    {filteredList.map((card) => (
                        <div
                            key={card.id}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Frente
                                    </label>
                                    <textarea
                                        className="w-full bg-transparent border-none outline-none text-sm font-medium resize-none focus:ring-1 focus:ring-blue-500 rounded p-1"
                                        defaultValue={card.front}
                                        onBlur={(e) => updateFlashcard(card.id, e.target.value, card.back)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                                        Verso
                                    </label>
                                    <textarea
                                        className="w-full bg-transparent border-none outline-none text-sm text-slate-600 resize-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                                        defaultValue={card.back}
                                        onBlur={(e) => updateFlashcard(card.id, card.front, e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        {card.topic_title}
                                    </span>
                                    {card.next_review && (
                                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                            <Timer size={10} /> {format(new Date(card.next_review), 'dd/MM')}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={async () => {
                                        if (confirm('Excluir card?')) {
                                            await deleteFlashcard(card.id);
                                            await onUpdate();
                                        }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredList.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <Layers className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500">Nenhum card encontrado.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Sessão de Estudo */}
            <AnimatePresence>
                {studySession && (
                    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[200] p-4 sm:p-8">
                        <div className="w-full max-w-2xl">
                            <div className="flex justify-between items-center mb-8 text-white">
                                <div>
                                    <h3 className="text-xl font-bold">Estudando Flashcards</h3>
                                    <p className="text-sm text-slate-400">
                                        {studySession.index + 1} de {studySession.cards.length}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setStudySession(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="relative h-96 perspective-1000 mb-8">
                                <motion.div
                                    className="w-full h-full relative preserve-3d transition-transform duration-500"
                                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                                    onClick={() => setIsFlipped(!isFlipped)}
                                >
                                    {/* Frente */}
                                    <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-12 text-center cursor-pointer">
                                        <span className="absolute top-6 left-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                            Pergunta
                                        </span>
                                        <p className="text-2xl font-bold text-slate-800 leading-relaxed">
                                            {studySession.cards[studySession.index].front}
                                        </p>
                                        <p className="absolute bottom-8 text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                                            Toque para ver a resposta
                                        </p>
                                    </div>
                                    {/* Verso */}
                                    <div className="absolute inset-0 backface-hidden bg-emerald-600 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-12 text-center rotate-y-180 text-white">
                                        <span className="absolute top-6 left-6 text-[10px] font-bold text-emerald-200 uppercase tracking-widest">
                                            Resposta
                                        </span>
                                        <p className="text-2xl font-bold leading-relaxed">
                                            {studySession.cards[studySession.index].back}
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                saveToNotebook(
                                                    studySession.cards[studySession.index].front,
                                                    studySession.cards[studySession.index].topic_id,
                                                );
                                            }}
                                            className="absolute bottom-8 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-all"
                                        >
                                            <Save size={14} /> Salvar no Caderno
                                        </button>
                                    </div>
                                </motion.div>
                            </div>

                            {isFlipped && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                                >
                                    {[
                                        { label: 'Errei', sub: 'Imediato', color: 'bg-rose-500 hover:bg-rose-600', score: 0 },
                                        { label: 'Difícil', sub: '2 dias', color: 'bg-amber-500 hover:bg-amber-600', score: 1 },
                                        { label: 'Bom', sub: 'Progressivo', color: 'bg-blue-500 hover:bg-blue-600', score: 2 },
                                        { label: 'Fácil', sub: '4 dias+', color: 'bg-emerald-500 hover:bg-emerald-600', score: 3 },
                                    ].map(({ label, sub, color, score }) => (
                                        <button
                                            key={label}
                                            onClick={() => handleScore(score)}
                                            className={`flex flex-col items-center p-4 ${color} text-white rounded-2xl font-bold transition-all`}
                                        >
                                            <span>{label}</span>
                                            <span className="text-[10px] opacity-60 font-normal">{sub}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Adicionar Card */}
            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo Flashcard">
                <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Tema
                        </label>
                        <TopicSelect
                            topics={topics}
                            value={newCard.topic_id}
                            onChange={(v) => setNewCard({ ...newCard, topic_id: v })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Pergunta (Frente)
                        </label>
                        <textarea
                            required
                            value={newCard.front}
                            onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none h-24"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Resposta (Verso)
                        </label>
                        <textarea
                            required
                            value={newCard.back}
                            onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none h-24"
                        />
                    </div>
                    <ModalActions
                        onCancel={() => setShowAdd(false)}
                        loading={isAdding}
                    />
                </form>
            </Modal>
        </div>
    );
}
