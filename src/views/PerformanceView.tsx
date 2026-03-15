import React, { useState } from 'react';
import {
    Settings, Trophy, Flame, Target, BookMarked,
    CheckCircle2, Heart, Brain, BookOpen, Dumbbell,
    Thermometer, History, Zap, Trash2, X
} from 'lucide-react';
import { usePerformanceData } from '../hooks/usePerformanceData';

// Sub-componentes do Dashboard
import { MedFlowIndex } from './Performance/MedFlowIndex';
import { QuestionsDashboard } from './Performance/QuestionsDashboard';
import { SpacedRepetitionDashboard } from './Performance/SpacedRepetitionDashboard';
import { ErrorAnalysisDashboard } from './Performance/ErrorAnalysisDashboard';
import { ConsistencyDashboard } from './Performance/ConsistencyDashboard';
import { PlanHealthDashboard } from './Performance/PlanHealthDashboard';

// Gerenciamento e Modais
import { PerformanceManager } from './Performance/PerformanceManager';
import { ModalOverlay, ExamRow } from './Performance/ManagementComponents';

import {
    addExam, updateExam, deleteExam,
    addExamError, deleteExamError,
    addDifficultSubtopic,
    addPersonalGoal, deletePersonalGoal,
    fetchExamQuestions, saveAttempt, updateAttemptErrorOrigin
} from '../services/api';
import type { Topic } from '../services/types';

interface PerformanceViewProps {
    topics: Topic[];
}

export function PerformanceView({ topics }: PerformanceViewProps) {
    const { loading, metrics, refresh, exams, errors, goals } = usePerformanceData();
    const [showManager, setShowManager] = useState(false);

    // Estados de Modais
    const [showExamModal, setShowExamModal] = useState(false);
    const [editingExam, setEditingExam] = useState<any>(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [showClassificationModal, setShowClassificationModal] = useState(false);
    const [showQuizResults, setShowQuizResults] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importExamId, setImportExamId] = useState<number | null>(null);

    // Formulários
    const [examForm, setExamForm] = useState({ name: '', date: '', type: 'simulado', notes: '' });
    const [errorForm, setErrorForm] = useState({ exam_id: '', specialty: '', topic_id: '', subtopic: '', error_origin: 'desatencao', posicao_questao: '1-25', notes: '' });
    const [goalForm, setGoalForm] = useState({ category: 'estudo', title: '', unit: '', target_value: '100' });

    // Quiz State
    const [activeQuiz, setActiveQuiz] = useState<any>(null);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [lastAttemptId, setLastAttemptId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctOption: string } | null>(null);

    // --- Handlers ---
    const handleSaveExam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingExam) await updateExam(editingExam.id, examForm);
            else await addExam(examForm);
            setShowExamModal(false);
            refresh();
        } catch (err: any) { alert(err.message); }
    };

    const handleDeleteExamLocal = async (id: number) => {
        if (confirm('Excluir prova?')) {
            await deleteExam(id);
            refresh();
        }
    };

    const handleStartQuizLocal = async (exam: any) => {
        const questions = await fetchExamQuestions(exam.id);
        if (questions.length === 0) return alert('Sem questões. Faça upload primeiro.');
        setActiveQuiz(exam);
        setQuizQuestions(questions);
        setCurrentQuestionIdx(0);
        setShowQuizModal(true);
        setShowQuizResults(false);
    };

    const handleAnswerQuestion = async (option: string) => {
        if (!activeQuiz || feedback) return;
        const question = quizQuestions[currentQuestionIdx];
        const isCorrect = option === question.correct_option;
        const attempt = await saveAttempt({
            exam_id: activeQuiz.id,
            question_id: question.id,
            selected_option: option,
            is_correct: isCorrect,
        });
        setFeedback({ isCorrect, correctOption: question.correct_option });
        setLastAttemptId(attempt.id);
        if (isCorrect) setTimeout(() => handleNextQuestion(), 1500);
        else setShowClassificationModal(true);
    };

    const handleNextQuestion = () => {
        setFeedback(null);
        if (currentQuestionIdx + 1 < quizQuestions.length) setCurrentQuestionIdx(prev => prev + 1);
        else setShowQuizResults(true);
    };

    const handleClassifyError = async (origin: string) => {
        if (!lastAttemptId) return;
        await updateAttemptErrorOrigin(lastAttemptId, origin);
        setShowClassificationModal(false);
        handleNextQuestion();
    };

    if (loading || !metrics) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse">Sintetizando seus dados...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-24 px-4 sm:px-6">

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">Desempenho</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel de Analytics em Tempo Real</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowManager(true)}
                    className="flex items-center gap-3 px-6 py-4 bg-slate-800 text-white rounded-[24px] font-bold hover:bg-slate-900 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-slate-200"
                >
                    <Settings size={20} />
                    Gerenciar Provas & Metas
                </button>
            </div>

            <MedFlowIndex
                index={metrics.index}
                components={metrics.components}
                historySize={metrics.charts.historySize}
            />

            <div id="questions-panel-section" className="space-y-4">
                <div className="flex items-center gap-2">
                    <Brain className="text-emerald-500" size={24} />
                    <h2 className="text-2xl font-black text-slate-800">Painel de Questões</h2>
                </div>
                <QuestionsDashboard
                    weeklyData={metrics.charts.weeklyData}
                    specialtyData={metrics.charts.specialtyData}
                    stats={{
                        total: errors.length * 10, // Approximation
                        avgRecent: metrics.charts.weeklyData.slice(-4).reduce((acc, d) => acc + d.count, 0) / 4,
                        avgPrevious: metrics.charts.weeklyData.slice(-8, -4).reduce((acc, d) => acc + d.count, 0) / 4 || 1,
                        idealVolume: metrics.charts.idealVolume,
                        monthsToExam: metrics.charts.monthsToExam
                    }}
                />
            </div>

            <div id="spaced-repetition-section" className="space-y-4">
                <div className="flex items-center gap-2">
                    <History className="text-blue-500" size={24} />
                    <h2 className="text-2xl font-black text-slate-800">Repetição Espaçada</h2>
                </div>
                <SpacedRepetitionDashboard
                    cardStatusData={metrics.charts.cardStatusData}
                    consolidationRate={metrics.components.gapClosure}
                    executionRate={metrics.components.simConsistency}
                    difficultSubtopics={[
                        { name: 'Insuficiência Cardíaca', mistakes: 12 },
                        { name: 'Pré-eclâmpsia', mistakes: 8 },
                        { name: 'Código de Ética Médica', mistakes: 7 },
                    ]}
                />
            </div>

            <div id="error-analysis-section" className="space-y-4">
                <div className="flex items-center gap-2">
                    <Thermometer className="text-red-500" size={24} />
                    <h2 className="text-2xl font-black text-slate-800">Análise de Erros</h2>
                </div>
                <ErrorAnalysisDashboard
                    errorOrigins={metrics.charts.errorOrigins}
                    heatmapData={metrics.charts.heatmapData}
                    positionData={metrics.charts.positionData}
                />
            </div>

            <div id="consistency-section" className="space-y-4">
                <div className="flex items-center gap-2">
                    <Zap className="text-yellow-500" size={24} />
                    <h2 className="text-2xl font-black text-slate-800">Consistência</h2>
                </div>
                <ConsistencyDashboard
                    activityData={metrics.charts.activityData}
                    currentStreak={metrics.charts.activityData.filter(d => d.intensity >= 3).length} // Placeholder for real streak logic
                    recordStreak={15}
                    weeklyConsistency={metrics.charts.goalConsistency}
                    advice={metrics.charts.advice}
                />
            </div>

            <div id="plan-health-section" className="space-y-4">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-purple-500" size={24} />
                    <h2 className="text-2xl font-black text-slate-800">Saúde do Plano</h2>
                </div>
                <PlanHealthDashboard
                    statusHistory={metrics.charts.statusHistory}
                    correlationData={metrics.charts.correlation}
                    sustainabilityIndex={metrics.charts.sustainability}
                />
            </div>

            <PerformanceManager isOpen={showManager} onClose={() => setShowManager(false)}>
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Calendário de Provas</h3>
                        <button onClick={() => { setEditingExam(null); setExamForm({ name: '', date: '', type: 'simulado', notes: '' }); setShowExamModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">+ Prova</button>
                    </div>
                    <div className="grid gap-3">
                        {exams.map(exam => (
                            <ExamRow
                                key={exam.id}
                                exam={exam}
                                onEdit={(e: any) => { setEditingExam(e); setExamForm({ name: e.name, date: e.date, type: e.type, notes: e.notes || '' }); setShowExamModal(true); }}
                                onDelete={(id: number) => { handleDeleteExamLocal(id); }}
                                onStartQuiz={(e: any) => { handleStartQuizLocal(e); }}
                                onUpload={(id: number) => { setImportExamId(id); setShowImportModal(true); }}
                            />
                        ))}
                    </div>
                </section>
                <hr className="border-slate-100" />
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Erros Registrados</h3>
                        <button onClick={() => setShowErrorModal(true)} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700">+ Erro</button>
                    </div>
                    <div className="grid gap-3">
                        {errors.map(err => (
                            <div key={err.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group relative">
                                <button onClick={() => deleteExamError(err.id).then(refresh)} className="absolute top-3 right-3 text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                                <p className="text-xs font-bold text-emerald-700">{err.specialty}</p>
                                <p className="text-sm font-semibold text-slate-800">{err.subtopic}</p>
                            </div>
                        ))}
                    </div>
                </section>
                <hr className="border-slate-100" />
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Metas Diárias</h3>
                        <button onClick={() => setShowGoalModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">+ Meta</button>
                    </div>
                    <div className="grid gap-3">
                        {goals.map(g => (
                            <div key={g.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{g.title}</p>
                                    <p className="text-xs text-slate-400 capitalize">{g.category}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold">{g.current_value}/{g.target_value}</span>
                                    <button onClick={() => deletePersonalGoal(g.id).then(refresh)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </PerformanceManager>

            {showExamModal && (
                <ModalOverlay onClose={() => setShowExamModal(false)} title={editingExam ? 'Editar Prova' : 'Nova Prova'}>
                    <form onSubmit={handleSaveExam} className="space-y-4">
                        <input required placeholder="Nome" className="w-full p-3 rounded-xl border border-slate-200" value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))} />
                        <input required type="date" className="w-full p-3 rounded-xl border border-slate-200" value={examForm.date} onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))} />
                        <select className="w-full p-3 rounded-xl border border-slate-200 bg-white" value={examForm.type} onChange={e => setExamForm(f => ({ ...f, type: e.target.value }))}>
                            <option value="simulado">Simulado</option>
                            <option value="prova_integra">Prova na Íntegra</option>
                        </select>
                        <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Salvar</button>
                    </form>
                </ModalOverlay>
            )}

            {showErrorModal && (
                <ModalOverlay onClose={() => setShowErrorModal(false)} title="Registrar Erro">
                    <form onSubmit={async (e) => { e.preventDefault(); await addExamError(errorForm as any); setShowErrorModal(false); refresh(); }} className="space-y-4">
                        <input required placeholder="Especialidade" className="w-full p-3 rounded-xl border border-slate-200" value={errorForm.specialty} onChange={e => setErrorForm(f => ({ ...f, specialty: e.target.value }))} />
                        <input required placeholder="Subtema" className="w-full p-3 rounded-xl border border-slate-200" value={errorForm.subtopic} onChange={e => setErrorForm(f => ({ ...f, subtopic: e.target.value }))} />
                        <select className="w-full p-3 rounded-xl border border-slate-200 bg-white" value={errorForm.error_origin} onChange={e => setErrorForm(f => ({ ...f, error_origin: e.target.value }))}>
                            <option value="desatencao">Desatenção</option>
                            <option value="falta_contato">Falta de Contato</option>
                            <option value="cansaco">Cansaço</option>
                        </select>
                        <select className="w-full p-3 rounded-xl border border-slate-200 bg-white" value={errorForm.posicao_questao} onChange={e => setErrorForm(f => ({ ...f, posicao_questao: e.target.value }))}>
                            <option value="1-25">Bloco 1-25</option>
                            <option value="26-50">Bloco 26-50</option>
                            <option value="51-75">Bloco 51-75</option>
                            <option value="76-100">Bloco 76-100</option>
                        </select>
                        <button type="submit" className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold">Salvar</button>
                    </form>
                </ModalOverlay>
            )}

            {showGoalModal && (
                <ModalOverlay onClose={() => setShowGoalModal(false)} title="Nova Meta">
                    <form onSubmit={async (e) => { e.preventDefault(); await addPersonalGoal(goalForm as any); setShowGoalModal(false); refresh(); }} className="space-y-4">
                        <input required placeholder="Título (Ex: KM Nadados)" className="w-full p-3 rounded-xl border border-slate-200" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} />
                        <select className="w-full p-3 rounded-xl border border-slate-200 bg-white" value={goalForm.category} onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))}>
                            <option value="estudo">Estudo</option>
                            <option value="saude">Saúde</option>
                            <option value="exercicio">Exercício</option>
                        </select>
                        <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">Salvar</button>
                    </form>
                </ModalOverlay>
            )}

            {showQuizModal && activeQuiz && (
                <ModalOverlay onClose={() => setShowQuizModal(false)} title={`Quiz: ${activeQuiz.name}`}>
                    {!showQuizResults ? (
                        <div className="space-y-6">
                            <p className="text-sm italic text-slate-600">{quizQuestions[currentQuestionIdx]?.question_text}</p>
                            <div className="grid gap-2">
                                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => handleAnswerQuestion(opt)}
                                        className="p-4 text-left border rounded-xl hover:bg-blue-50 transition-all font-medium"
                                    >
                                        {opt}) {quizQuestions[currentQuestionIdx]?.[`option_${opt.toLowerCase()}`]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-6 space-y-4">
                            <Trophy size={48} className="mx-auto text-yellow-500" />
                            <h2 className="text-2xl font-black">Finalizado!</h2>
                            <button onClick={() => setShowQuizModal(false)} className="w-full py-3 bg-slate-800 text-white rounded-xl">Fechar</button>
                        </div>
                    )}
                </ModalOverlay>
            )}

            {showClassificationModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center">
                        <h4 className="text-lg font-bold mb-6">Mapeamento de Erro</h4>
                        <div className="grid gap-3">
                            <button onClick={() => handleClassifyError('desatencao')} className="p-4 bg-purple-50 rounded-2xl font-bold text-purple-700">🧠 Desatenção</button>
                            <button onClick={() => handleClassifyError('falta_contato')} className="p-4 bg-amber-50 rounded-2xl font-bold text-amber-700">📚 Falta de Contato</button>
                            <button onClick={() => handleClassifyError('cansaco')} className="p-4 bg-blue-50 rounded-2xl font-bold text-blue-700">😴 Cansaço</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
