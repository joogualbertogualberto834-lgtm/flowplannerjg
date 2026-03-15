import React, { useState, useEffect } from 'react';
import {
    fetchExams,
    fetchExamErrors,
    fetchPersonalGoals,
    fetchAllFlashcards
} from '../services/api';

interface MentorMessage {
    text: string;       // O que o mago diz
    action?: string | null;    // Texto do botão
    tab?: string | null;       // Aba para navegar
    highlight?: string; // ID do elemento para destacar
    emoji: string;      // Emoção do mago
}

const getMessageForContext = (
    activeTab: string,
    overdueFlashcards: number,
    overdueTopics: number,
    recentErrors: number,
    daysToExam: number | null,
    nextExamName: string | null,
    dailyTarget: number | null,
    goalProgress: number
): MentorMessage => {

    // ─── ABA DASHBOARD ───
    if (activeTab === 'dashboard') {
        if (overdueFlashcards > 0) return {
            emoji: '😤',
            text: `Você tem ${overdueFlashcards} flashcard${overdueFlashcards > 1 ? 's' : ''} vencido${overdueFlashcards > 1 ? 's' : ''}. Clique em "Flashcards" na barra lateral para revisar agora.`,
            action: 'Ir para Flashcards',
            tab: 'flashcards'
        };

        if (recentErrors > 0) return {
            emoji: '📝',
            text: `Você registrou ${recentErrors} erro${recentErrors > 1 ? 's' : ''} recentemente. Vá em "Caderno de Erros" para ver os flashcards criados.`,
            action: 'Ver Caderno de Erros',
            tab: 'errors'
        };

        if (daysToExam !== null && daysToExam <= 7) return {
            emoji: '😰',
            text: `${nextExamName} em ${daysToExam} dia${daysToExam > 1 ? 's' : ''}! Priorize revisões agora. Clique em "Revisões" na barra lateral.`,
            action: 'Ir para Revisões',
            tab: 'reviews'
        };

        if (dailyTarget && goalProgress < 50)
            return {
                emoji: '💪',
                text: `Sua meta de hoje é ${dailyTarget} questões. Após resolver, volte aqui e atualize em Desempenho → Metas Pessoais.`,
                action: 'Ver Metas',
                tab: 'performance'
            };

        return {
            emoji: '😊',
            text: 'Tudo em dia! Use a barra lateral para navegar. Comece por "Especialidades" para registrar o que você estudou hoje.',
            action: 'Registrar estudo',
            tab: 'topics'
        };
    }

    // ─── ABA ESPECIALIDADES ───
    if (activeTab === 'topics') return {
        emoji: '🎓',
        text: 'Clique em uma especialidade para expandir. Depois clique no tema que você estudou e registre sua performance (0-100%). O sistema agenda a próxima revisão automaticamente.',
        action: null,
        tab: null
    };

    // ─── ABA REVISÕES ───
    if (activeTab === 'reviews') {
        if (overdueTopics > 0) return {
            emoji: '⏰',
            text: `${overdueTopics} tema${overdueTopics > 1 ? 's' : ''} com revisão atrasada. Clique no card, estude o conteúdo e registre sua performance. Faça os atrasados primeiro.`,
            action: null,
            tab: null
        };
        return {
            emoji: '✅',
            text: 'Nenhuma revisão atrasada — ótimo! Veja os temas agendados para os próximos dias e mantenha o ritmo.',
            action: null,
            tab: null
        };
    }

    // ─── ABA FLASHCARDS ───
    if (activeTab === 'flashcards') {
        if (overdueFlashcards > 0) return {
            emoji: '🔥',
            text: `${overdueFlashcards} flashcard${overdueFlashcards > 1 ? 's' : ''} vencido${overdueFlashcards > 1 ? 's' : ''} esperando. Clique em "Iniciar Revisão", leia o frente do card, tente lembrar a resposta e avalie sua dificuldade.`,
            action: null,
            tab: null
        };
        return {
            emoji: '😎',
            text: 'Todos os flashcards em dia! Você pode criar novos a partir de qualquer tema estudado.',
            action: null,
            tab: null
        };
    }

    // ─── ABA CADERNO DE ERROS ───
    if (activeTab === 'errors') return {
        emoji: '🧠',
        text: 'Clique em "Registrar Novo Erro". Selecione a especialidade → tema → subtema específico → origem (Desatenção, Falta de Contato ou Cansaço). Seja específico no subtema: ex: "Acalásia — critério manometria".',
        action: null,
        tab: null
    };

    // ─── ABA SEMANA ───
    if (activeTab === 'weekly') return {
        emoji: '📅',
        text: 'Esta é sua visão semanal. Os temas agendados para revisão aparecem em cada dia. Use para planejar sua semana de estudos.',
        action: null,
        tab: null
    };

    // ─── ABA DESEMPENHO ───
    if (activeTab === 'performance') return {
        emoji: '📊',
        text: 'Aqui você acompanha seu progresso. Atualize o progresso das suas metas diariamente. O Índice MedFlow aparece após 3 semanas de uso.',
        action: 'Como atualizar metas →',
        tab: null
    };

    // ─── ABA PALAVRAS CRUZADAS ───
    if (activeTab === 'crossword') return {
        emoji: '🎮',
        text: 'Use as palavras cruzadas para fixar conceitos de forma lúdica. Ideal para revisar após estudar um tema novo.',
        action: null,
        tab: null
    };

    return {
        emoji: '😊',
        text: 'Explore o app usando a barra lateral. Comece por Especialidades.',
        action: 'Ir para Especialidades',
        tab: 'topics'
    };
};

export function MentorGuide({ activeTab }: { activeTab: string }) {
    const [minimized, setMinimized] = useState(false);
    const [message, setMessage] = useState<MentorMessage | null>(null);
    const [prevTab, setPrevTab] = useState('');

    // Dados do mentor
    const [overdueFlashcards, setOverdueFlashcards] = useState(0);
    const [overdueTopics, setOverdueTopics] = useState(0);
    const [recentErrors, setRecentErrors] = useState(0);
    const [daysToExam, setDaysToExam] = useState<number | null>(null);
    const [nextExamName, setNextExamName] = useState<string | null>(null);
    const [dailyTarget, setDailyTarget] = useState<number | null>(null);
    const [goalProgress, setGoalProgress] = useState(0);

    // Quando muda de aba: reexpande e atualiza mensagem
    useEffect(() => {
        if (activeTab !== prevTab) {
            setMinimized(false);
            setPrevTab(activeTab);
        }
    }, [activeTab, prevTab]);

    // Buscar dados
    useEffect(() => {
        const loadData = async () => {
            try {
                const [exams, errors, goals, cards] = await Promise.all([
                    fetchExams(),
                    fetchExamErrors(),
                    fetchPersonalGoals(),
                    fetchAllFlashcards()
                ]);

                const now = new Date();

                // Flashcards vencidos
                const overdue = cards.filter(
                    (f: any) => f.next_review &&
                        new Date(f.next_review) < now &&
                        (f.repetition_level || 0) < 5
                ).length;
                setOverdueFlashcards(overdue);

                // Erros recentes (24h)
                const recent = errors.filter(
                    (e: any) =>
                        new Date(e.created_at) >
                        new Date(Date.now() - 86400000)
                ).length;
                setRecentErrors(recent);

                // Próxima prova
                const future = (exams as any[])
                    .filter((e: any) => new Date(e.date) >= now)
                    .sort((a: any, b: any) =>
                        new Date(a.date).getTime() -
                        new Date(b.date).getTime()
                    );

                if (future.length > 0) {
                    const diff = Math.ceil(
                        (new Date(future[0].date).getTime() - now.getTime()) / 86400000
                    );
                    setDaysToExam(diff);
                    setNextExamName(future[0].name);
                }

                // Meta do dia
                const studyGoal = goals.find(
                    (g: any) => g.category === 'estudo'
                );
                if (studyGoal) {
                    const target = Math.ceil(
                        (studyGoal.target_value - studyGoal.current_value) / 7
                    );
                    setDailyTarget(target);
                    setGoalProgress(
                        Math.round(
                            (studyGoal.current_value / studyGoal.target_value) * 100
                        ) || 0
                    );
                }
            } catch (e) {
                console.error('MentorGuide:', e);
            }
        };

        loadData();
        const interval = setInterval(loadData, 60000);
        return () => clearInterval(interval);
    }, []);

    // Calcular mensagem quando dados ou aba mudar
    useEffect(() => {
        const msg = getMessageForContext(
            activeTab,
            overdueFlashcards,
            overdueTopics,
            recentErrors,
            daysToExam,
            nextExamName,
            dailyTarget,
            goalProgress
        );
        setMessage(msg);
    }, [activeTab, overdueFlashcards, overdueTopics, recentErrors, daysToExam, nextExamName, dailyTarget, goalProgress]);

    const navigate = (tab: string) => {
        window.dispatchEvent(
            new CustomEvent('navigate', { detail: tab })
        );
    };

    if (!message) return null;

    // ESTADO MINIMIZADO
    if (minimized) {
        return (
            <div
                className="fixed bottom-6 right-6 z-[150] cursor-pointer hover:scale-110 transition-transform"
                onClick={() => setMinimized(false)}
                title="Ver orientação do mentor"
            >
                <div className="w-14 h-14 bg-white rounded-full shadow-xl border-2 border-emerald-200 flex items-center justify-center text-2xl animate-bounce">
                    🧙
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-[8px] font-black">!</span>
                </div>
            </div>
        );
    }

    // ESTADO EXPANDIDO
    return (
        <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3 max-w-xs pointer-events-none">
            {/* Balão de fala */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 relative w-72 pointer-events-auto">
                {/* Seta do balão apontando para o personagem */}
                <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-slate-100 rotate-45" />

                {/* Botão fechar/minimizar */}
                <button
                    onClick={() => setMinimized(true)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors text-xs flex items-center justify-center font-bold"
                >
                    ×
                </button>

                {/* Texto da mensagem */}
                <div className="pr-4">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {message.text}
                    </p>
                </div>

                {/* Botão de ação */}
                {message.action && message.tab && (
                    <button
                        onClick={() => navigate(message.tab!)}
                        className="mt-3 w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {message.action} →
                    </button>
                )}
            </div>

            {/* Personagem */}
            <div className="flex items-end gap-2 pointer-events-auto">
                {/* Emoção atual */}
                <div
                    className="w-16 h-16 bg-white rounded-full shadow-xl border-2 border-emerald-200 flex items-center justify-center text-3xl cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setMinimized(true)}
                    title="Minimizar mentor"
                >
                    🧙
                </div>

                {/* Nome */}
                <div className="mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        Mentor
                    </p>
                    <p className="text-xs font-black text-slate-600 mt-0.5">
                        {message.emoji}
                    </p>
                </div>
            </div>
        </div>
    );
}
