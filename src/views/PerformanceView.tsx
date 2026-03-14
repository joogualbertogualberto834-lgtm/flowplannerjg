import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar, Plus, Trash2, AlertTriangle, Trophy, Flame,
    BookMarked, Target, ChevronRight, Pencil, Check, X,
    Brain, BookOpen, Dumbbell, Heart
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    fetchExams, addExam, updateExam, deleteExam,
    fetchExamErrors, addExamError, deleteExamError,
    fetchDifficultSubtopics, addDifficultSubtopic, deleteDifficultSubtopic,
    fetchPersonalGoals, addPersonalGoal, updateGoalProgress, deletePersonalGoal,
    fetchExamQuestions, saveExamQuestions, saveAttempt, updateAttemptErrorOrigin, fetchExamAttempts,
    extractQuestionsFromPDF
} from '../services/api';
import type { Topic } from '../services/types';

// ─── Frases motivacionais randômicas ───────────────────────────────────────
const MOTIVATIONAL_PHRASES = [
    '💡 Cada questão errada é uma oportunidade de aprendizado.',
    '🔥 Consistência supera talento no longo prazo.',
    '🧠 Seu cérebro se fortalece com cada revisão.',
    '⚡ Um dia ruim de estudo ainda é melhor que um dia sem estudo.',
    '🎯 Foque no processo — os resultados virão.',
    '💪 Você está mais preparado hoje do que ontem.',
    '🌱 Pequenas melhorias diárias criam resultados extraordinários.',
    '📚 O médico que você será amanhã depende do estudo de hoje.',
    '🏆 Aprovação é consequência de muita preparação.',
    '🕐 Não perca tempo comparando — compare-se com o seu ontem.',
];

// ─── Helpers de cor por origem de erro ─────────────────────────────────────
const ORIGIN_CONFIG = {
    desatencao: { label: '🧠 Desatenção', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    falta_contato: { label: '📚 Falta de Contato', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    cansaco: { label: '😴 Cansaço', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const GOAL_CONFIG = {
    estudo: { label: 'Estudo', icon: <BookOpen size={16} />, color: 'emerald' },
    saude: { label: 'Saúde', icon: <Heart size={16} />, color: 'rose' },
    exercicio: { label: 'Exercício', icon: <Dumbbell size={16} />, color: 'blue' },
};

// ─── Props ──────────────────────────────────────────────────────────────────
interface PerformanceViewProps {
    topics: Topic[];
}

// ─── Componente principal ───────────────────────────────────────────────────
export function PerformanceView({ topics }: PerformanceViewProps) {
    // ── State de dados ──
    const [exams, setExams] = useState<any[]>([]);
    const [examErrors, setExamErrors] = useState<any[]>([]);
    const [subtopics, setSubtopics] = useState<any[]>([]);
    const [goals, setGoals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Frase motivacional ──
    const [phraseIdx, setPhraseIdx] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length));

    // ── Modais ──
    const [showExamModal, setShowExamModal] = useState(false);
    const [editingExam, setEditingExam] = useState<any>(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSubtopicModal, setShowSubtopicModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [showClassificationModal, setShowClassificationModal] = useState(false);
    const [showQuizResults, setShowQuizResults] = useState(false);

    // ── Formulários ──
    const [examForm, setExamForm] = useState({ name: '', date: '', type: 'simulado', notes: '' });
    const [errorForm, setErrorForm] = useState({ exam_id: '', specialty: '', topic_id: '', subtopic: '', error_origin: 'desatencao', notes: '' });
    const [subtopicForm, setSubtopicForm] = useState({ specialty: '', topic: '', subtopic: '', notes: '' });
    const [goalForm, setGoalForm] = useState({ category: 'estudo', title: '', unit: '', target_value: '100' });

    // ── Quiz State ──
    const [activeQuiz, setActiveQuiz] = useState<any>(null);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
    const [lastAttemptId, setLastAttemptId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctOption: string } | null>(null);

    // ── Filtros ──
    const [errorFilter, setErrorFilter] = useState<string>('all');

    // ── Carregamento ──
    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [e, ee, ds, pg] = await Promise.all([
                fetchExams(), fetchExamErrors(), fetchDifficultSubtopics(), fetchPersonalGoals(),
            ]);
            setExams(e);
            setExamErrors(ee);
            setSubtopics(ds);
            setGoals(pg);
        } catch (err) {
            console.error('[PerformanceView] Erro ao carregar:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Frases ciclam a cada 5 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            setPhraseIdx(i => (i + 1) % MOTIVATIONAL_PHRASES.length);
        }, 15 * 60 * 1000); // 15 minutos
        return () => clearInterval(interval);
    }, []);

    // ── Handlers de Exams ──
    const handleSaveExam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingExam) {
                await updateExam(editingExam.id, {
                    name: examForm.name, date: examForm.date,
                    type: examForm.type, notes: examForm.notes || undefined,
                });
            } else {
                await addExam({
                    name: examForm.name, date: examForm.date,
                    type: examForm.type, notes: examForm.notes || undefined,
                });
            }
            setShowExamModal(false);
            setEditingExam(null);
            setExamForm({ name: '', date: '', type: 'simulado', notes: '' });
            loadAll();
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        }
    };

    const openEditExam = (exam: any) => {
        setEditingExam(exam);
        setExamForm({ name: exam.name, date: exam.date, type: exam.type, notes: exam.notes || '' });
        setShowExamModal(true);
    };

    const handleDeleteExam = async (id: number) => {
        if (!confirm('Excluir esta prova? Os erros vinculados a ela não serão excluídos.')) return;
        try { await deleteExam(id); loadAll(); } catch (err: any) { alert(err.message); }
    };

    // ── Handlers de Quiz & PDF ─────────────────────────────────────────────

    const handleFileUpload = async (examId: number, file: File, specialty: string, subtopic: string) => {
        setIsExtracting(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const questions = await extractQuestionsFromPDF(base64, specialty, subtopic);
                await saveExamQuestions(examId, questions);
                alert(`Sucesso! ${questions.length} questões extraídas.`);
                loadAll();
            };
        } catch (err: any) {
            alert('Erro na extração: ' + err.message);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleStartQuiz = async (exam: any) => {
        try {
            const questions = await fetchExamQuestions(exam.id);
            if (questions.length === 0) {
                alert('Este exame não possui questões extraídas. Faça o upload de um PDF primeiro.');
                return;
            }
            setActiveQuiz(exam);
            setQuizQuestions(questions);
            setCurrentQuestionIdx(0);
            setQuizAttempts([]);
            setShowQuizModal(true);
            setShowQuizResults(false);
        } catch (err: any) {
            alert('Erro ao carregar questões: ' + err.message);
        }
    };

    const handleAnswerQuestion = async (option: string) => {
        if (!activeQuiz || feedback) return;
        const question = quizQuestions[currentQuestionIdx];
        const isCorrect = option === question.correct_option;

        try {
            const attempt = await saveAttempt({
                exam_id: activeQuiz.id,
                question_id: question.id,
                selected_option: option,
                is_correct: isCorrect,
            });

            setFeedback({ isCorrect, correctOption: question.correct_option });
            setLastAttemptId(attempt.id);

            if (isCorrect) {
                // Se acertou, avança após breve delay
                setTimeout(() => {
                    handleNextQuestion();
                }, 1500);
            } else {
                // Se errou, abre o modal de classificação
                setShowClassificationModal(true);
            }
        } catch (err: any) {
            alert('Erro ao salvar resposta: ' + err.message);
        }
    };

    const handleClassifyError = async (origin: string) => {
        if (!lastAttemptId || !activeQuiz) return;
        const question = quizQuestions[currentQuestionIdx];

        try {
            await updateAttemptErrorOrigin(lastAttemptId, origin);

            // AUTO-ROUTING conforme o plano aprovado:
            // 📚 Falta de Contato ou 😴 Cansaço -> Caderno de Oportunidades (Seção 2)
            if (origin === 'falta_contato' || origin === 'cansaco') {
                await addExamError({
                    exam_id: activeQuiz.id,
                    specialty: question.specialty || 'Geral',
                    topic_id: question.topic_id || null,
                    subtopic: question.subtopic || question.question_text.slice(0, 50) + '...',
                    error_origin: origin,
                    notes: `Erro automático do Quiz: ${activeQuiz.name}`
                });

                // Se houver 2+ erros de Falta de Contato no mesmo subtema -> Seção 3 (Foco)
                const sameSubtopicErrors = examErrors.filter(e =>
                    e.subtopic === (question.subtopic || question.question_text.slice(0, 50) + '...') &&
                    e.error_origin === 'falta_contato'
                );

                if (origin === 'falta_contato' && sameSubtopicErrors.length >= 1) { // >=1 porque o atual ainda não está no state 'examErrors' local
                    await addDifficultSubtopic({
                        specialty: question.specialty || 'Geral',
                        topic: question.subtopic || 'Geral',
                        subtopic: question.subtopic || 'Verificar questão',
                        notes: 'Subtema recorrente com falta de contato.'
                    });
                }
            }

            setShowClassificationModal(false);
            handleNextQuestion();
            loadAll(); // Atualiza as seções 2 e 3
        } catch (err: any) {
            alert('Erro ao classificar: ' + err.message);
        }
    };

    const handleNextQuestion = () => {
        setFeedback(null);
        if (currentQuestionIdx + 1 < quizQuestions.length) {
            setCurrentQuestionIdx(prev => prev + 1);
        } else {
            setShowQuizResults(true);
        }
    };

    // ── Handlers de Erros ──────────────────────────────────────────────────
    const handleSaveError = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addExamError({
                exam_id: errorForm.exam_id ? parseInt(errorForm.exam_id) : null,
                specialty: errorForm.specialty,
                topic_id: errorForm.topic_id ? parseInt(errorForm.topic_id) : null,
                subtopic: errorForm.subtopic,
                error_origin: errorForm.error_origin,
                notes: errorForm.notes || undefined,
            });
            setShowErrorModal(false);
            setErrorForm({ exam_id: '', specialty: '', topic_id: '', subtopic: '', error_origin: 'desatencao', notes: '' });
            loadAll();
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        }
    };

    // ── Handlers de Subtemas ──
    const handleSaveSubtopic = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDifficultSubtopic(subtopicForm);
            setShowSubtopicModal(false);
            setSubtopicForm({ specialty: '', topic: '', subtopic: '', notes: '' });
            loadAll();
        } catch (err: any) { alert(err.message); }
    };

    // ── Handlers de Metas ──
    const handleSaveGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addPersonalGoal({
                category: goalForm.category,
                title: goalForm.title,
                unit: goalForm.unit,
                target_value: parseFloat(goalForm.target_value),
            });
            setShowGoalModal(false);
            setGoalForm({ category: 'estudo', title: '', unit: '', target_value: '100' });
            loadAll();
        } catch (err: any) { alert(err.message); }
    };

    const handleUpdateProgress = async (goal: any, delta: number) => {
        const next = Math.min(goal.target_value, Math.max(0, goal.current_value + delta));
        try { await updateGoalProgress(goal.id, next); loadAll(); } catch (err: any) { alert(err.message); }
    };

    // ── Agrupamentos ──
    const futureExams = exams.filter(e => e.date >= new Date().toISOString().split('T')[0]);
    const pastExams = exams.filter(e => e.date < new Date().toISOString().split('T')[0]);
    const filteredErrors = errorFilter === 'all'
        ? examErrors
        : examErrors.filter((e: any) => e.error_origin === errorFilter);

    const specialties = [...new Set(topics.map(t => t.specialty))].sort();

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* ── Frase motivacional ───────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-emerald-100">
                <Trophy className="text-white shrink-0" size={24} />
                <p
                    key={phraseIdx}
                    className="text-white font-medium text-sm leading-relaxed transition-all duration-500"
                    style={{ animation: 'fadeIn 0.5s ease' }}
                >
                    {MOTIVATIONAL_PHRASES[phraseIdx]}
                </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════  */}
            {/* SEÇÃO 1 — Calendário de Provas                                */}
            {/* ══════════════════════════════════════════════════════════════  */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Calendar size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Calendário de Provas</h2>
                            <p className="text-xs text-slate-400">Provas na íntegra e simulados</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setEditingExam(null); setExamForm({ name: '', date: '', type: 'simulado', notes: '' }); setShowExamModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} /> Adicionar
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Próximas */}
                    {futureExams.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Próximas</p>
                            <div className="space-y-2">
                                {futureExams.map(exam => (
                                    <ExamRow key={exam.id} exam={exam} onEdit={openEditExam} onDelete={handleDeleteExam} onStartQuiz={handleStartQuiz} onUpload={handleFileUpload} />
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Realizadas */}
                    {pastExams.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Realizadas</p>
                            <div className="space-y-2 opacity-60">
                                {pastExams.map(exam => (
                                    <ExamRow key={exam.id} exam={exam} onEdit={openEditExam} onDelete={handleDeleteExam} onStartQuiz={handleStartQuiz} onUpload={handleFileUpload} />
                                ))}
                            </div>
                        </div>
                    )}
                    {exams.length === 0 && !loading && (
                        <p className="text-sm text-slate-400 italic text-center py-8">Nenhuma prova adicionada ainda.</p>
                    )}
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════  */}
            {/* SEÇÃO 2 — Caderno de Oportunidades                           */}
            {/* ══════════════════════════════════════════════════════════════  */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                            <BookMarked size={18} className="text-rose-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Caderno de Oportunidades</h2>
                            <p className="text-xs text-slate-400">Mapeie o que errou e por quê</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowErrorModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors"
                    >
                        <Plus size={16} /> Registrar Erro
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Filtros por origem */}
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'desatencao', 'falta_contato', 'cansaco'].map(f => (
                            <button
                                key={f}
                                onClick={() => setErrorFilter(f)}
                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${errorFilter === f
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : ORIGIN_CONFIG[f as keyof typeof ORIGIN_CONFIG].label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-3">
                        {filteredErrors.map((err: any) => (
                            <div key={err.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group relative">
                                <button
                                    onClick={() => { if (confirm('Excluir este erro?')) deleteExamError(err.id).then(loadAll); }}
                                    className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <div className="flex items-start gap-3 pr-6">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${ORIGIN_CONFIG[err.error_origin as keyof typeof ORIGIN_CONFIG].color}`}>
                                        {ORIGIN_CONFIG[err.error_origin as keyof typeof ORIGIN_CONFIG].label}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-emerald-700">{err.specialty}</p>
                                        <p className="text-sm font-semibold text-slate-800">{err.subtopic}</p>
                                        {err.exam_name && (
                                            <p className="text-xs text-slate-400 mt-0.5">📝 {err.exam_name}</p>
                                        )}
                                        {err.notes && <p className="text-xs text-slate-500 mt-1">{err.notes}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredErrors.length === 0 && !loading && (
                            <p className="text-sm text-slate-400 italic text-center py-8">Nenhum erro registrado.</p>
                        )}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════  */}
            {/* SEÇÃO 3 — Subtemas Difíceis + Metas Pessoais                 */}
            {/* ══════════════════════════════════════════════════════════════  */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subtemas Difíceis */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                <Flame size={18} className="text-amber-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800 text-sm">Subtemas para Focar</h2>
                                <p className="text-[10px] text-slate-400">Revisão frequente necessária</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSubtopicModal(true)}
                            className="w-8 h-8 flex items-center justify-center bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="p-4 space-y-2">
                        {subtopics.map((s: any) => (
                            <div key={s.id} className="flex items-start justify-between gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 group">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-amber-700 uppercase">{s.specialty} › {s.topic}</p>
                                    <p className="text-sm font-semibold text-slate-800">{s.subtopic}</p>
                                    {s.notes && <p className="text-xs text-slate-500">{s.notes}</p>}
                                </div>
                                <button
                                    onClick={() => { if (confirm('Remover?')) deleteDifficultSubtopic(s.id).then(loadAll); }}
                                    className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 mt-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {subtopics.length === 0 && !loading && (
                            <p className="text-xs text-slate-400 italic text-center py-6">Nenhum subtema adicionado.</p>
                        )}
                    </div>
                </section>

                {/* Metas Pessoais */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <Target size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800 text-sm">Metas Pessoais</h2>
                                <p className="text-[10px] text-slate-400">Estudo, saúde e exercício</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowGoalModal(true)}
                            className="w-8 h-8 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="p-4 space-y-3">
                        {goals.map((g: any) => {
                            const cfg = GOAL_CONFIG[g.category as keyof typeof GOAL_CONFIG];
                            const pct = Math.min(100, Math.round((g.current_value / g.target_value) * 100));
                            const barColor = g.category === 'saude' ? 'bg-rose-500' : g.category === 'exercicio' ? 'bg-blue-500' : 'bg-emerald-500';
                            return (
                                <div key={g.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">{cfg.icon}</span>
                                            <p className="text-sm font-semibold text-slate-800">{g.title}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-slate-600">
                                                {g.current_value}/{g.target_value} {g.unit}
                                            </span>
                                            <button onClick={() => handleUpdateProgress(g, -1)} className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 text-xs font-bold">−</button>
                                            <button onClick={() => handleUpdateProgress(g, 1)} className="w-5 h-5 flex items-center justify-center rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">+</button>
                                            <button onClick={() => { if (confirm('Excluir meta?')) deletePersonalGoal(g.id).then(loadAll); }} className="text-slate-300 hover:text-rose-500 transition-colors ml-1">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">{pct}% concluído</p>
                                </div>
                            );
                        })}
                        {goals.length === 0 && !loading && (
                            <p className="text-xs text-slate-400 italic text-center py-6">Nenhuma meta criada ainda.</p>
                        )}
                    </div>
                </section>
            </div>

            {/* ══════════ MODAIS DE QUIZ ══════════════════════════════════════ */}

            {/* Modal: Quiz Principal */}
            {showQuizModal && activeQuiz && (
                <ModalOverlay onClose={() => setShowQuizModal(false)} title={`Quiz: ${activeQuiz.name}`}>
                    {!showQuizResults ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                                <span className="text-xs font-bold text-slate-500">Questão {currentQuestionIdx + 1} de {quizQuestions.length}</span>
                                <div className="h-1.5 w-32 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }} />
                                </div>
                            </div>

                            <p className="text-sm font-medium text-slate-800 leading-relaxed italic border-l-4 border-slate-200 pl-4 py-1">
                                {quizQuestions[currentQuestionIdx].question_text}
                            </p>

                            <div className="space-y-2">
                                {['a', 'b', 'c', 'd', 'e'].map(opt => {
                                    const key = `option_${opt}`;
                                    const text = quizQuestions[currentQuestionIdx][key];
                                    if (!text) return null;

                                    let btnClass = "w-full text-left p-4 rounded-xl border text-sm transition-all ";
                                    if (feedback) {
                                        if (opt.toUpperCase() === feedback.correctOption) btnClass += "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-200";
                                        else if (opt.toUpperCase() !== feedback.correctOption && feedback.isCorrect === false) btnClass += "bg-slate-50 border-slate-200 opacity-50";
                                        else btnClass += "bg-white border-slate-100 opacity-50";
                                    } else {
                                        btnClass += "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30";
                                    }

                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => handleAnswerQuestion(opt.toUpperCase())}
                                            disabled={!!feedback}
                                            className={btnClass}
                                        >
                                            <div className="flex gap-3">
                                                <span className="font-bold text-slate-400 uppercase">{opt})</span>
                                                <span className="text-slate-700">{text}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {feedback && (
                                <div className={`p-4 rounded-xl text-center font-bold text-sm ${feedback.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {feedback.isCorrect ? '✨ Resposta Correta!' : '❌ Ops, não foi dessa vez.'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <Trophy size={40} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-800">Quiz Finalizado!</h4>
                                <p className="text-slate-500 text-sm">Seus erros foram mapeados no Caderno de Oportunidades.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Acertos</p>
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {quizAttempts.filter(a => a.is_correct).length} / {quizQuestions.length}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Nota</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {Math.round((quizAttempts.filter(a => a.is_correct).length / quizQuestions.length) * 100)}%
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowQuizModal(false)}
                                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
                            >
                                Concluir
                            </button>
                        </div>
                    )}
                </ModalOverlay>
            )}

            {/* Modal: Classificação do Erro (Abre automático após errar) */}
            {showClassificationModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-6 transform animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800">O que causou este erro?</h4>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Classificação da Mentoria</p>
                        </div>
                        <div className="grid gap-3">
                            <button
                                onClick={() => handleClassifyError('desatencao')}
                                className="flex flex-col items-center bg-purple-50 hover:bg-purple-100 border border-purple-200 p-4 rounded-2xl transition-all group"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">🧠</span>
                                <span className="text-sm font-bold text-purple-700 mt-1">Desatenção</span>
                                <span className="text-[10px] text-purple-400">Eu sabia mas li errado</span>
                            </button>
                            <button
                                onClick={() => handleClassifyError('falta_contato')}
                                className="flex flex-col items-center bg-amber-50 hover:bg-amber-100 border border-amber-200 p-4 rounded-2xl transition-all group"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">📚</span>
                                <span className="text-sm font-bold text-amber-700 mt-1">Falta de Contato</span>
                                <span className="text-[10px] text-amber-400">Assunto novo ou desconhecido</span>
                            </button>
                            <button
                                onClick={() => handleClassifyError('cansaco')}
                                className="flex flex-col items-center bg-blue-50 hover:bg-blue-100 border border-blue-200 p-4 rounded-2xl transition-all group"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">😴</span>
                                <span className="text-sm font-bold text-blue-700 mt-1">Cansaço</span>
                                <span className="text-[10px] text-blue-400">Exaustão física ou mental</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spinner Global de Extração de PDF */}
            {isExtracting && (
                <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md">
                    <div className="w-20 h-20 border-4 border-blue-500 border-t-white rounded-full animate-spin mb-4" />
                    <p className="text-white font-bold text-lg">IA processando seu PDF...</p>
                    <p className="text-white/60 text-sm">Fatiando questões e temas...</p>
                </div>
            )}

            {/* ══════════ MODAIS LEGADOS ══════════════════════════════════════ */}

            {/* Modal: Exame */}
            {showExamModal && (
                <ModalOverlay onClose={() => { setShowExamModal(false); setEditingExam(null); }} title={editingExam ? 'Editar Prova' : 'Adicionar Prova/Simulado'}>
                    <form onSubmit={handleSaveExam} className="space-y-4">
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Nome</span>
                            <input required value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Ex: Simulado Revalida 2025 — Bloco 1" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Data</span>
                            <input required type="date" value={examForm.date} onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Tipo</span>
                            <select value={examForm.type} onChange={e => setExamForm(f => ({ ...f, type: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                                <option value="simulado">Simulado</option>
                                <option value="prova_integra">Prova na Íntegra</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Notas (opcional)</span>
                            <textarea value={examForm.notes} onChange={e => setExamForm(f => ({ ...f, notes: e.target.value }))}
                                className="mt-1 w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm h-20 resize-none"
                                placeholder="Observações, local, etc." />
                        </label>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowExamModal(false); setEditingExam(null); }} className="text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Salvar</button>
                        </div>
                    </form>
                </ModalOverlay>
            )}

            {/* Modal: Erro de prova */}
            {showErrorModal && (
                <ModalOverlay onClose={() => setShowErrorModal(false)} title="Registrar Erro">
                    <form onSubmit={handleSaveError} className="space-y-4">
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Prova/Simulado (opcional)</span>
                            <select value={errorForm.exam_id} onChange={e => setErrorForm(f => ({ ...f, exam_id: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white">
                                <option value="">— Sem prova vinculada —</option>
                                {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Especialidade</span>
                            <select required value={errorForm.specialty} onChange={e => setErrorForm(f => ({ ...f, specialty: e.target.value, topic_id: '' }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white">
                                <option value="">Selecione...</option>
                                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Tema (opcional)</span>
                            <select value={errorForm.topic_id} onChange={e => setErrorForm(f => ({ ...f, topic_id: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white">
                                <option value="">— Selecione o tema —</option>
                                {topics.filter(t => t.specialty === errorForm.specialty).map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Subtema / Questão</span>
                            <input required value={errorForm.subtopic} onChange={e => setErrorForm(f => ({ ...f, subtopic: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-400 text-sm"
                                placeholder="Ex: Critérios de Ranson na pancreatite" />
                        </label>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase">Origem do Erro</span>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {(['desatencao', 'falta_contato', 'cansaco'] as const).map(o => (
                                    <button
                                        key={o}
                                        type="button"
                                        onClick={() => setErrorForm(f => ({ ...f, error_origin: o }))}
                                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${errorForm.error_origin === o
                                            ? 'ring-2 ring-offset-1 ring-slate-400 ' + ORIGIN_CONFIG[o].color
                                            : ORIGIN_CONFIG[o].color + ' opacity-50'
                                            }`}
                                    >
                                        {ORIGIN_CONFIG[o].label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Notas (opcional)</span>
                            <textarea value={errorForm.notes} onChange={e => setErrorForm(f => ({ ...f, notes: e.target.value }))}
                                className="mt-1 w-full px-4 py-2 rounded-xl border border-slate-200 outline-none text-sm h-20 resize-none"
                                placeholder="O que você precisa rever sobre este tema?" />
                        </label>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowErrorModal(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                            <button type="submit" className="px-5 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700">Salvar</button>
                        </div>
                    </form>
                </ModalOverlay>
            )}

            {/* Modal: Subtema difícil */}
            {showSubtopicModal && (
                <ModalOverlay onClose={() => setShowSubtopicModal(false)} title="Adicionar Subtema Difícil">
                    <form onSubmit={handleSaveSubtopic} className="space-y-4">
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Especialidade</span>
                            <select required value={subtopicForm.specialty} onChange={e => setSubtopicForm(f => ({ ...f, specialty: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white">
                                <option value="">Selecione...</option>
                                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Tema</span>
                            <input required value={subtopicForm.topic} onChange={e => setSubtopicForm(f => ({ ...f, topic: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm"
                                placeholder="Ex: Pancreatite Aguda" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Subtema</span>
                            <input required value={subtopicForm.subtopic} onChange={e => setSubtopicForm(f => ({ ...f, subtopic: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm"
                                placeholder="Ex: Critérios de Ranson" />
                        </label>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Notas (opcional)</span>
                            <textarea value={subtopicForm.notes} onChange={e => setSubtopicForm(f => ({ ...f, notes: e.target.value }))}
                                className="mt-1 w-full px-4 py-2 rounded-xl border border-slate-200 outline-none text-sm h-16 resize-none" />
                        </label>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowSubtopicModal(false)} className="text-sm text-slate-500">Cancelar</button>
                            <button type="submit" className="px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600">Salvar</button>
                        </div>
                    </form>
                </ModalOverlay>
            )}

            {/* Modal: Meta pessoal */}
            {showGoalModal && (
                <ModalOverlay onClose={() => setShowGoalModal(false)} title="Nova Meta Pessoal">
                    <form onSubmit={handleSaveGoal} className="space-y-4">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase">Categoria</span>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {(['estudo', 'saude', 'exercicio'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setGoalForm(f => ({ ...f, category: cat }))}
                                        className={`py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${goalForm.category === cat ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
                                            }`}
                                    >
                                        {GOAL_CONFIG[cat].icon}
                                        {GOAL_CONFIG[cat].label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label className="block">
                            <span className="text-xs font-bold text-slate-400 uppercase">Título da Meta</span>
                            <input required value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm"
                                placeholder="Ex: Horas de estudo na semana" />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="text-xs font-bold text-slate-400 uppercase">Meta</span>
                                <input required type="number" min="1" value={goalForm.target_value} onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))}
                                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm" />
                            </label>
                            <label className="block">
                                <span className="text-xs font-bold text-slate-400 uppercase">Unidade</span>
                                <input value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))}
                                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm"
                                    placeholder="h, km, dias…" />
                            </label>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowGoalModal(false)} className="text-sm text-slate-500">Cancelar</button>
                            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700">Criar Meta</button>
                        </div>
                    </form>
                </ModalOverlay>
            )}
        </div>
    );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function ExamRow({ exam, onEdit, onDelete, onStartQuiz, onUpload }: {
    key?: React.Key;
    exam: any;
    onEdit: (e: any) => void;
    onDelete: (id: number) => void | Promise<void>;
    onStartQuiz: (exam: any) => void;
    onUpload: (examId: number, file: File, specialty: string, subtopic: string) => void;
}) {
    const typeLabel = exam.type === 'simulado' ? 'Simulado' : 'Prova na Íntegra';
    const typeColor = exam.type === 'simulado' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
    const isPast = exam.date < new Date().toISOString().split('T')[0];

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
            <div className={`min-w-[48px] h-12 flex flex-col items-center justify-center rounded-xl font-bold text-sm ${isPast ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
                <span className="text-[10px] uppercase opacity-60 leading-none">
                    {format(parseISO(exam.date), 'MMM', { locale: ptBR })}
                </span>
                <span className="text-base leading-none">{format(parseISO(exam.date), 'dd')}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">{exam.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
                    <button
                        onClick={() => onStartQuiz(exam)}
                        className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full hover:bg-emerald-200 transition-colors flex items-center gap-1"
                    >
                        <Brain size={10} /> Iniciar Quiz
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full hover:bg-slate-200 transition-colors"
                    >
                        📁 Subir PDF
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUpload(exam.id, file, 'Geral', exam.name);
                        }}
                    />
                </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(exam)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                    <Pencil size={13} />
                </button>
                <button onClick={() => onDelete(exam.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500">
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

function ModalOverlay({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
