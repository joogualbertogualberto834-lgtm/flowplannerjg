# MEDFLOW_SNAPSHOT

## 1. src/App.tsx
```tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { TopicsView } from './views/TopicsView';
import { ReviewsView } from './views/ReviewsView';
import { FlashcardsView } from './views/FlashcardsView';
import { ErrorsView } from './views/ErrorsView';
import { WeeklyView } from './views/WeeklyView';
import { CrosswordView } from './views/CrosswordView';
import { PerformanceView } from './views/PerformanceView';
import { useData } from './hooks/useData';
import { ResetModal } from './components/ResetModal';
import { TutorialModal } from './components/TutorialModal';
import { resetAllUserData } from './services/api';
import { useEffect } from 'react';

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword' | 'performance';

import { useAuth } from './hooks/useAuth';
import { AuthView } from './views/AuthView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const {
    topics,
    dashboardData,
    flashcards,
    allFlashcards,
    flashcardStats,
    errors,
    loading: dataLoading,
    groupedTopics,
    refresh,
  } = useData();

  useEffect(() => {
    if (!localStorage.getItem('medflow_tutorial_seen')) {
      setShowTutorial(true);
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const renderTabContent = () => {
    // ... rest of switch
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView data={dashboardData} topics={topics} onUpdate={refresh} />;
      case 'topics':
        return <TopicsView groupedTopics={groupedTopics} onUpdate={refresh} />;
      case 'reviews':
        return <ReviewsView topics={topics} onUpdate={refresh} />;
      case 'flashcards':
        return (
          <FlashcardsView
            flashcards={flashcards}
            allFlashcards={allFlashcards}
            topics={topics}
            groupedTopics={groupedTopics}
            stats={flashcardStats}
            onUpdate={refresh}
          />
        );
      case 'errors':
        return <ErrorsView errors={errors} topics={topics} onUpdate={refresh} />;
      case 'weekly':
        return <WeeklyView topics={topics} />;
      case 'crossword':
        return <CrosswordView />;
      case 'performance':
        return <PerformanceView topics={topics} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsMenuOpen(false);
        }}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />

      {/* Backdrop for mobile */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <main className="lg:ml-64 p-4 md:p-8">
        <Header
          activeTab={activeTab}
          loading={dataLoading}
          onRefresh={refresh}
          onMenuClick={() => setIsMenuOpen(!isMenuOpen)}
          onShowReset={() => setShowReset(true)}
          onShowTutorial={() => setShowTutorial(true)}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <ResetModal
        isOpen={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={async () => {
          await resetAllUserData();
          await refresh();
          setShowReset(false);
          localStorage.removeItem('medflow_tutorial_seen');
          setShowTutorial(true);
        }}
      />
    </div>
  );
}

```

## 2. src/services/api.ts
```ts
import { supabase } from './supabase';
import type {
    Topic,
    DashboardStats,
    Flashcard,
    FlashcardStats,
    ErrorNote,
} from './types';

// ============================================================
// Camada de serviço — comunicação direta com Supabase
// Substitui o servidor local Express/SQLite para deploy serverless
// ============================================================

// --- Leitura ---

export const fetchTopics = async (): Promise<Topic[]> => {
    const { data, error } = await supabase
        .from('topics')
        .select(`
      *,
      user_progress!left(*),
      study_count: study_log(count),
      card_count: flashcards(count)
    `)
        .order('specialty')
        .order('order_index');

    if (error) throw error;

    // NOTA: user_progress é relação 1:1 — Supabase retorna objeto, não array.
    // Usar indexação ?.[0] causaria que todos os campos ficassem null (bug crítico).
    return (data || []).map(t => ({
        ...t,
        current_interval: (t.user_progress as any)?.current_interval ?? 0,
        last_score: (t.user_progress as any)?.last_score ?? null,
        next_review_date: (t.user_progress as any)?.next_review_date ?? null,
        urgency_count: (t.user_progress as any)?.urgency_count ?? 0,
        previous_state: (t.user_progress as any)?.previous_state ?? null,
        study_count: t.study_count?.[0]?.count ?? 0,
        card_count: t.card_count?.[0]?.count ?? 0
    })) as any;
};

export const fetchFlashcardsDue = async (): Promise<Flashcard[]> => {
    const { data, error } = await supabase
        .from('flashcards')
        .select('*, topics(title, specialty)')
        .or(`next_review.lte.${new Date().toISOString()},next_review.is.null`);
    if (error) throw error;
    return (data || []).map(f => ({
        ...f,
        topic_title: f.topics?.title,
        specialty: f.topics?.specialty
    })) as any;
};

export const fetchAllFlashcards = async (): Promise<Flashcard[]> => {
    const { data, error } = await supabase
        .from('flashcards')
        .select('*, topics(title, specialty)');
    if (error) throw error;
    return (data || []).map(f => ({
        ...f,
        topic_title: f.topics?.title,
        specialty: f.topics?.specialty
    })) as any;
};

// --- Dashboard ---

export const fetchDashboard = async (): Promise<DashboardStats> => {
    const effort = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const { data } = await supabase
            .from('study_log')
            .select('duration_minutes, score')
            .eq('date', dateStr);

        const total_minutes = data?.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) || 0;
        const avg_score = data?.length ? data.reduce((acc, curr) => acc + (curr.score || 0), 0) / data.length : 0;

        effort.push({ date: dateStr, total_minutes, avg_score });
    }

    const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('last_score, next_review_date');

    if (progressError) throw progressError;

    const stats = {
        total_topics: progressData?.filter(p => p.last_score !== null).length || 0,
        high_perf: progressData?.filter(p => p.last_score > 79).length || 0,
        overdue: progressData?.filter(p => p.next_review_date && new Date(p.next_review_date) < new Date()).length || 0,
    };

    return { effort, stats };
};

export const fetchFlashcardStats = async (): Promise<FlashcardStats> => {
    const { data: logs } = await supabase
        .from('study_log')
        .select('date, duration_minutes')
        .eq('activity_type', 'Flashcard')
        .order('date', { ascending: false })
        .limit(7);

    const { data: totalsData } = await supabase
        .from('study_log')
        .select('duration_minutes')
        .eq('activity_type', 'Flashcard');

    const totals = {
        total_reviews: totalsData?.length || 0,
        total_minutes: totalsData?.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) || 0
    };

    return { dailyVolume: (logs || []).map(l => ({ ...l, count: 1 })), totals } as any;
};

export const fetchErrors = async (): Promise<ErrorNote[]> => {
    const { data, error } = await supabase
        .from('error_notebook')
        .select('*, topics(title)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(e => ({
        ...e,
        topic_title: e.topics?.title
    })) as any;
};

// --- Sessões de estudo ---

export const postStudySession = async (topicId: number, score: number, durationMinutes: number, activityType: string = 'Study') => {
    try {
        const { data: progress, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('topic_id', topicId)
            .maybeSingle();

        if (progressError) throw new Error(`Erro ao buscar progresso: ${progressError.message}`);

        let currentInterval = progress?.current_interval ?? 0;
        let currentUrgency = progress?.urgency_count ?? 0;
        // Guarda estado anterior para permitir desfazer a operação
        const previousState = progress ? JSON.stringify(progress) : null;

        let nextInterval: number;
        let newUrgencyCount = currentUrgency;
        let nextReviewDateStr: string | null = null;
        let finalScore: number | null = score;

        if (score === 0 && durationMinutes === 0) {
            // Registro de 'limpeza' — remove a sessão do dia
            nextInterval = 0;
            newUrgencyCount = 0;
            nextReviewDateStr = null;
            finalScore = null;
            await supabase.from('study_log').delete().eq('topic_id', topicId).eq('date', new Date().toISOString().split('T')[0]);
        } else {
            // Algoritmo de repetição espaçada baseado em % de acertos:
            // > 79%  → próximo intervalo maior (alta performance)
            // < 65%  → urgência: revisão muito em breve (1, 3 ou 7 dias)
            // 65–79% → mantém ou inicia intervalo de 7 dias (performance média)
            if (score > 79) {
                const intervals = [15, 30, 60, 90, 120, 180];
                nextInterval = intervals.find(i => i > currentInterval) || 180;
                newUrgencyCount = 0;
            } else if (score < 65) {
                const urgencyIntervals = [1, 3, 7];
                nextInterval = urgencyIntervals[Math.min(newUrgencyCount, urgencyIntervals.length - 1)] ?? 1;
                newUrgencyCount = Math.min(newUrgencyCount + 1, 3);
            } else {
                nextInterval = Math.max(7, currentInterval || 7);
                newUrgencyCount = 0;
            }
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + nextInterval);
            nextReviewDateStr = nextReview.toISOString();
        }

        const { error: upsertError } = await supabase.from('user_progress').upsert({
            topic_id: topicId,
            current_interval: nextInterval,
            last_score: finalScore,
            next_review_date: nextReviewDateStr,
            urgency_count: newUrgencyCount,
            previous_state: previousState as any
        }, { onConflict: 'topic_id' });

        if (upsertError) throw new Error(`Erro ao salvar progresso: ${upsertError.message}`);

        if (score !== 0 || durationMinutes !== 0) {
            const { error: logError } = await supabase.from('study_log').insert({
                activity_type: activityType,
                duration_minutes: durationMinutes,
                score: score,
                topic_id: topicId
            });
            if (logError) console.warn('[postStudySession] Falha ao inserir study_log:', logError.message);
        }
    } catch (err) {
        console.error('[postStudySession] Falha crítica:', err);
        throw err; // Re-lança para que as views possam exibir o erro ao usuário
    }
};

export const undoStudySession = async (topicId: number) => {
    try {
        const { data: progress, error } = await supabase
            .from('user_progress')
            .select('previous_state')
            .eq('topic_id', topicId)
            .maybeSingle();

        if (error) throw new Error(`Erro ao buscar estado anterior: ${error.message}`);

        if (progress && progress.previous_state) {
            const prev = typeof progress.previous_state === 'string'
                ? JSON.parse(progress.previous_state)
                : progress.previous_state;

            const { error: updateError } = await supabase.from('user_progress').update({
                current_interval: prev.current_interval,
                last_score: prev.last_score,
                next_review_date: prev.next_review_date,
                urgency_count: prev.urgency_count,
                previous_state: null
            }).eq('topic_id', topicId);

            if (updateError) throw new Error(`Erro ao restaurar progresso: ${updateError.message}`);

            const { data: lastLog } = await supabase
                .from('study_log')
                .select('id')
                .eq('topic_id', topicId)
                .order('id', { ascending: false })
                .limit(1);

            if (lastLog?.length) {
                await supabase.from('study_log').delete().eq('id', lastLog[0].id);
            }
        }
    } catch (err) {
        console.error('[undoStudySession] Falha:', err);
        throw err;
    }
};

export const clearReview = async (topicId: number) => {
    try {
        const { error } = await supabase
            .from('user_progress')
            .update({ next_review_date: null })
            .eq('topic_id', topicId);
        if (error) throw new Error(`Erro ao limpar revisão: ${error.message}`);
    } catch (err) {
        console.error('[clearReview] Falha:', err);
        throw err;
    }
};

export const postStudyLog = async (durationMinutes: number) => {
    await supabase.from('study_log').insert({
        activity_type: 'Stopwatch',
        duration_minutes: durationMinutes,
        date: new Date().toISOString().split('T')[0]
    });
};

// --- Flashcards Ops ---

export const addFlashcard = async (data: { topic_id: number; front: string; back: string }) => {
    const { data: res, error } = await supabase.from('flashcards').insert(data).select().single();
    if (error) throw error;
    return res as any;
};

export const updateFlashcard = async (id: number, front: string, back: string) => {
    await supabase.from('flashcards').update({ front, back }).eq('id', id);
};

export const deleteFlashcard = async (id: number) => {
    await supabase.from('flashcards').delete().eq('id', id);
};

export const scoreFlashcard = async (id: number, difficulty: number, durationMinutes: number) => {
    const { data: card } = await supabase.from('flashcards').select('*').eq('id', id).single();
    if (!card) return;

    let newInterval = card.current_interval || 0;
    let newLevel = card.repetition_level || 0;

    if (difficulty === 0) {
        newInterval = card.last_difficulty === 0 ? 1 : 0;
        newLevel = 0;
    } else if (difficulty === 1) {
        newInterval = 2;
    } else if (difficulty === 2) {
        const intervals = [1, 5, 8, 15, 30, 90];
        newInterval = intervals[newLevel] || 90;
        newLevel++;
    } else if (difficulty === 3) {
        newInterval = card.current_interval === 0 ? 4 : 30;
        newLevel = 0;
    }

    const nextReview = new Date();
    if (newInterval > 0) nextReview.setDate(nextReview.getDate() + newInterval);
    else nextReview.setMinutes(nextReview.getMinutes() + 1);

    await supabase.from('flashcards').update({
        next_review: nextReview.toISOString(),
        last_difficulty: difficulty,
        current_interval: newInterval,
        repetition_level: newLevel
    }).eq('id', id);

    await supabase.from('study_log').insert({
        activity_type: 'Flashcard',
        duration_minutes: durationMinutes,
        topic_id: card.topic_id
    });
};

// --- Errors Ops ---

export const addError = async (data: { topic_id: string; content: string; tags: string }) => {
    await supabase.from('error_notebook').insert({
        topic_id: parseInt(data.topic_id),
        content: data.content,
        tags: data.tags
    });
};

export const deleteError = async (id: number) => {
    await supabase.from('error_notebook').delete().eq('id', id);
};

export const convertErrorToFlashcard = async (error: ErrorNote) => {
    await addFlashcard({
        topic_id: error.topic_id,
        front: `Revisão de Erro: ${error.topic_title}`,
        back: error.content,
    });
};

// ============================================================
// Desempenho — Provas & Simulados
// ============================================================

export const fetchExams = async () => {
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('date', { ascending: true });
    if (error) throw error;
    return (data || []) as any[];
};

export const addExam = async (payload: { name: string; date: string; type: string; notes?: string }) => {
    const { error } = await supabase.from('exams').insert(payload);
    if (error) throw error;
};

export async function saveExam(data: {
    name: string;
    date: string;
    type: 'simulado' | 'prova_integra';
    specialties: string[];
    notes: string | null;
}): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const { error } = await supabase
        .from('exams')
        .insert({
            ...data,
            user_id: userId
        });
    if (error) throw new Error(error.message);
}

export const updateExam = async (id: number, payload: { name: string; date: string; type: string; notes?: string }) => {
    const { error } = await supabase.from('exams').update(payload).eq('id', id);
    if (error) throw error;
};

export const deleteExam = async (id: number) => {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) throw error;
};

// ============================================================
// Desempenho — Caderno de Oportunidades
// ============================================================

export const fetchExamErrors = async () => {
    const { data, error } = await supabase
        .from('exam_errors')
        .select('*, exams(name)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((e: any) => ({ ...e, exam_name: e.exams?.name ?? null })) as any[];
};

export const fetchAllExamAttempts = async () => {
    const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, exam_questions(specialty, subtopic)');
    if (error) throw error;
    return (data || []) as any[];
};

export const fetchWeeklyAttempts = async () => {
    const { data, error } = await supabase
        .from('exam_attempts')
        .select('created_at, is_correct')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as any[];
};

export const addExamError = async (payload: {
    exam_id?: number | null;
    specialty: string;
    topic_id?: number | null;
    subtopic: string;
    error_origin: string;
    notes?: string;
}) => {
    const { error } = await supabase.from('exam_errors').insert(payload);
    if (error) throw error;
};

export const deleteExamError = async (id: number) => {
    const { error } = await supabase.from('exam_errors').delete().eq('id', id);
    if (error) throw error;
};

export async function saveExamError(data: {
    specialty: string;
    topic: string;
    subtopic: string;
    error_origin: 'desatencao' | 'falta_contato' | 'cansaco';
    posicao_questao: '1-25' | '26-50' | '51-75' | '76-100' | null;
    notes: string | null;
    exam_id: number | null;
}): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const { error } = await supabase
        .from('exam_errors')
        .insert({
            ...data,
            user_id: userId
        });
    if (error) throw new Error(error.message);
}

// ============================================================
// Desempenho — Subtemas Difíceis
// ============================================================

export const fetchDifficultSubtopics = async () => {
    const { data, error } = await supabase
        .from('difficult_subtopics')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as any[];
};

export const addDifficultSubtopic = async (payload: { specialty: string; topic: string; subtopic: string; notes?: string }) => {
    const { error } = await supabase.from('difficult_subtopics').insert(payload);
    if (error) throw error;
};

export const deleteDifficultSubtopic = async (id: number) => {
    const { error } = await supabase.from('difficult_subtopics').delete().eq('id', id);
    if (error) throw error;
};

// ============================================================
// Desempenho — Metas Pessoais
// ============================================================

export const fetchPersonalGoals = async () => {
    const { data, error } = await supabase
        .from('personal_goals')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as any[];
};

export const addPersonalGoal = async (payload: {
    category: string;
    title: string;
    unit: string;
    target_value: number;
}) => {
    const { error } = await supabase.from('personal_goals').insert({ ...payload, current_value: 0 });
    if (error) throw error;
};

export const updateGoalProgress = async (id: number, current_value: number) => {
    const { error } = await supabase.from('personal_goals').update({ current_value }).eq('id', id);
    if (error) throw error;
};

export const deletePersonalGoal = async (id: number) => {
    const { error } = await supabase.from('personal_goals').delete().eq('id', id);
    if (error) throw error;
};

// ============================================================
// Desempenho — Motor de Quiz (Questões & Tentativas)
// ============================================================

export const fetchExamQuestions = async (examId: number) => {
    const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_number', { ascending: true });
    if (error) throw error;
    return (data || []) as any[];
};

export const saveExamQuestions = async (examId: number, questions: any[]) => {
    const payload = questions.map((q, idx) => ({
        exam_id: examId,
        question_number: idx + 1,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        option_e: q.option_e || null,
        correct_option: q.correct_option,
        specialty: q.specialty || null,
        subtopic: q.subtopic || null,
        explanation: q.explanation || null
    }));
    const { error } = await supabase.from('exam_questions').insert(payload);
    if (error) throw error;
};

export const saveAttempt = async (payload: {
    exam_id: number;
    question_id: number;
    selected_option: string;
    is_correct: boolean;
    error_origin?: string | null;
}) => {
    const { data, error } = await supabase
        .from('exam_attempts')
        .insert(payload)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateAttemptErrorOrigin = async (attemptId: number, errorOrigin: string) => {
    const { error } = await supabase
        .from('exam_attempts')
        .update({ error_origin: errorOrigin })
        .eq('id', attemptId);
    if (error) throw error;
};

export const fetchExamAttempts = async (examId: number) => {
    const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId);
    if (error) throw error;
    return (data || []) as any[];
};

// (Edge Function call removed in favor of direct client-side extraction in geminiService.ts)
// ============================================================
// Reset de Dados
// ============================================================

export async function resetAllUserData(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const tables = [
        'exam_errors',
        'exams',
        'difficult_subtopics',
        'personal_goals',
        'flashcards',
        'exam_attempts',
        'study_log',
        'user_progress'
    ];

    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id);
        if (error) throw new Error(`Erro ao apagar ${table}: ${error.message}`);
    }
}

```

## 3. src/services/types.ts
```ts
// ============================================================
// Tipos centralizados do MED-Flow
// Extraídos de App.tsx durante a refatoração de março/2026
// ============================================================

export interface Topic {
  id: number;
  specialty: string;
  title: string;
  current_interval: number;
  last_score: number | null;
  next_review_date: string | null;
  urgency_count: number;
  previous_state: string | null;
  study_count: number;
  card_count: number;
}

export interface DashboardStats {
  effort: { date: string; total_minutes: number; avg_score: number }[];
  stats: { total_topics: number; high_perf: number; overdue: number };
}

export interface Flashcard {
  id: number;
  topic_id: number;
  topic_title?: string;
  specialty?: string;
  front: string;
  back: string;
  next_review: string | null;
  last_difficulty: number | null;
  current_interval: number;
  repetition_level: number;
}

export interface FlashcardStats {
  dailyVolume: { date: string; count: number; total_minutes: number }[];
  totals: { total_reviews: number; total_minutes: number };
}

export interface ErrorNote {
  id: number;
  topic_id: number;
  topic_title: string;
  content: string;
  tags: string;
  created_at: string;
}

// ============================================================
// Tipos da aba Desempenho (adicionados em março/2026)
// ============================================================

export interface Exam {
  id: number;
  name: string;
  date: string;
  type: 'simulado' | 'prova_integra';
  specialties?: string[];
  notes: string | null;
  created_at: string;
}

export type ErrorOrigin = 'desatencao' | 'falta_contato' | 'cansaco';

export interface ExamError {
  id: number;
  exam_id: number | null;
  exam_name?: string;
  specialty: string;
  topic: string;
  topic_id: number | null;
  subtopic: string;
  error_origin: ErrorOrigin;
  posicao_questao: '1-25' | '26-50' | '51-75' | '76-100' | null;
  notes: string | null;
  created_at: string;
}

export interface DifficultSubtopic {
  id: number;
  specialty: string;
  topic: string;
  subtopic: string;
  notes: string | null;
  created_at: string;
}

export type GoalCategory = 'estudo' | 'saude' | 'exercicio';

export interface PersonalGoal {
  id: number;
  category: GoalCategory;
  title: string;
  unit: string;
  target_value: number;
  current_value: number;
  created_at: string;
}

export interface ExamQuestion {
  id: number;
  exam_id: number;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string | null;
  correct_option: string;
  specialty: string | null;
  subtopic: string | null;
  explanation: string | null;
  created_at: string;
}

export interface ExamAttempt {
  id: number;
  exam_id: number;
  question_id: number;
  selected_option: string;
  is_correct: boolean;
  error_origin: ErrorOrigin | null;
  created_at: string;
}

```

## 4. src/hooks/useData.ts
```ts
import { useState, useEffect, useMemo } from 'react';
import {
    fetchTopics,
    fetchDashboard,
    fetchFlashcardsDue,
    fetchAllFlashcards,
    fetchFlashcardStats,
    fetchErrors,
} from '../services/api';
import type {
    Topic,
    DashboardStats,
    Flashcard,
    FlashcardStats,
    ErrorNote,
} from '../services/types';

export interface AppData {
    topics: Topic[];
    dashboardData: DashboardStats | null;
    flashcards: Flashcard[];
    allFlashcards: Flashcard[];
    flashcardStats: FlashcardStats | null;
    errors: ErrorNote[];
    loading: boolean;
    // Erro de carregamento — exibido na UI sem travar o app
    fetchError: string | null;
    groupedTopics: Record<string, Topic[]>;
    refresh: () => Promise<void>;
}

/**
 * Hook central que gerencia todos os dados do app.
 * Substitui o fetchData() e os useState() espalhados em App.tsx.
 */
export function useData(): AppData {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [allFlashcards, setAllFlashcards] = useState<Flashcard[]>([]);
    const [flashcardStats, setFlashcardStats] = useState<FlashcardStats | null>(null);
    const [errors, setErrors] = useState<ErrorNote[]>([]);
    const [loading, setLoading] = useState(true);
    // Captura erros de rede e de Supabase sem derrubar o app
    const [fetchError, setFetchError] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const [
                topicsData,
                dashData,
                flashcardsData,
                allFlashcardsData,
                statsData,
                errorsData,
            ] = await Promise.all([
                fetchTopics(),
                fetchDashboard(),
                fetchFlashcardsDue(),
                fetchAllFlashcards(),
                fetchFlashcardStats(),
                fetchErrors(),
            ]);

            if (topicsData) setTopics(topicsData);
            if (dashData) setDashboardData(dashData);
            if (flashcardsData) setFlashcards(flashcardsData);
            if (allFlashcardsData) setAllFlashcards(allFlashcardsData);
            if (statsData) setFlashcardStats(statsData);
            if (errorsData) setErrors(errorsData);
        } catch (err: any) {
            const msg = err?.message ?? 'Erro desconhecido ao carregar dados.';
            console.error('[useData] Erro ao buscar dados:', msg);
            // Exposto para a UI poder exibir ao usuário sem travar o app
            setFetchError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const groupedTopics = useMemo(() => {
        return topics.reduce(
            (acc, topic) => {
                if (!acc[topic.specialty]) acc[topic.specialty] = [];
                acc[topic.specialty].push(topic);
                return acc;
            },
            {} as Record<string, Topic[]>,
        );
    }, [topics]);

    return {
        topics,
        dashboardData,
        flashcards,
        allFlashcards,
        flashcardStats,
        errors,
        loading,
        fetchError,
        groupedTopics,
        refresh,
    };
}

```

## 5. src/hooks/usePerformanceData.ts
```ts
import { useState, useEffect, useMemo } from 'react';
import {
    fetchExams,
    fetchExamErrors,
    fetchDifficultSubtopics,
    fetchPersonalGoals,
    fetchAllFlashcards,
    fetchDashboard,
    fetchAllExamAttempts
} from '../services/api';
import {
    Exam,
    ExamError,
    DifficultSubtopic,
    PersonalGoal,
    Flashcard,
    DashboardStats
} from '../services/types';
import { subDays, isAfter, startOfWeek, endOfWeek, eachWeekOfInterval, format, isSameWeek, parseISO, subMonths, isSameMonth } from 'date-fns';

export function usePerformanceData() {
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState<Exam[]>([]);
    const [errors, setErrors] = useState<ExamError[]>([]);
    const [subtopics, setSubtopics] = useState<DifficultSubtopic[]>([]); // Note: We use the local calculation now as per Problem 7
    const [goals, setGoals] = useState<PersonalGoal[]>([]);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
    const [attempts, setAttempts] = useState<any[]>([]);

    const loadData = async () => {
        try {
            const [e, err, s, g, f, d, att] = await Promise.all([
                fetchExams(),
                fetchExamErrors(),
                fetchDifficultSubtopics(),
                fetchPersonalGoals(),
                fetchAllFlashcards(),
                fetchDashboard(),
                fetchAllExamAttempts()
            ]);
            setExams(e);
            setErrors(err);
            setSubtopics(s);
            setGoals(g);
            setFlashcards(f);
            setDashboard(d);
            setAttempts(att);
        } catch (err) {
            console.error('Error loading performance data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const metrics = useMemo(() => {
        if (loading) return null;

        const now = new Date();

        // --- CORREÇÃO 1 — generateWeeklyData ---
        const generateWeeklyData = (errorsList: ExamError[], goalsList: PersonalGoal[]) => {
            const studyGoal = goalsList.find(g => g.category === 'estudo');
            const weeklyTarget = studyGoal ? studyGoal.target_value : 80;

            return Array.from({ length: 8 }, (_, i) => {
                const weekStart = startOfWeek(subDays(now, (7 - i) * 7));
                const weekEnd = endOfWeek(weekStart);
                const count = errorsList.filter(e => {
                    const d = new Date(e.created_at);
                    return d >= weekStart && d <= weekEnd;
                }).length;
                return {
                    week: format(weekStart, 'dd/MM'),
                    count,
                    target: weeklyTarget
                };
            });
        };

        // --- CORREÇÃO 2 — generateSpecialtyData ---
        const generateSpecialtyData = (topicsList: any[], errorsList: ExamError[]) => {
            const specialtiesList = [
                'Clínica Médica',
                'Cirurgia',
                'Pediatria',
                'Ginecologia',
                'Obstetrícia',
                'Preventiva',
                'Outras Especialidades'
            ];

            return specialtiesList.map(specialty => {
                const topicsInSpec = topicsList.filter(
                    t => t.specialty === specialty && t.last_score !== null
                );

                if (topicsInSpec.length === 0) {
                    return {
                        name: specialty,
                        percentage: 0,
                        trend: 'stable' as const,
                        noData: true
                    };
                }

                const avgScore = topicsInSpec.reduce(
                    (acc, t) => acc + (t.last_score || 0), 0
                ) / topicsInSpec.length;

                const oneWeekAgo = subDays(now, 7);
                const twoWeeksAgo = subDays(now, 14);

                const recentTopics = topicsInSpec.filter(t => {
                    const d = new Date(t.last_study_date || '');
                    return d >= oneWeekAgo;
                });
                const prevTopics = topicsInSpec.filter(t => {
                    const d = new Date(t.last_study_date || '');
                    return d >= twoWeeksAgo && d < oneWeekAgo;
                });

                const recentAvg = recentTopics.length
                    ? recentTopics.reduce((a, t) => a + (t.last_score || 0), 0) / recentTopics.length
                    : avgScore;
                const prevAvg = prevTopics.length
                    ? prevTopics.reduce((a, t) => a + (t.last_score || 0), 0) / prevTopics.length
                    : avgScore;

                const trendVal = recentAvg > prevAvg + 3
                    ? 'up'
                    : recentAvg < prevAvg - 3
                        ? 'down'
                        : 'stable';

                return {
                    name: specialty,
                    percentage: Math.round(avgScore),
                    trend: trendVal as 'up' | 'down' | 'stable',
                    noData: false
                };
            }).filter(s => !s.noData || topicsList.some(t => t.specialty === s.name));
        };

        // --- CORREÇÃO 3 — generateCardStatusData ---
        const generateCardStatusData = (flashcardsList: Flashcard[]) => {
            const dominated = flashcardsList.filter(f => (f.repetition_level || 0) >= 5).length;
            const learning = flashcardsList.filter(f => (f.repetition_level || 0) > 0 && (f.repetition_level || 0) < 5).length;
            const overdue = flashcardsList.filter(f =>
                f.next_review &&
                new Date(f.next_review) < now &&
                (f.repetition_level || 0) < 5
            ).length;
            const pending = flashcardsList.length - dominated - learning - overdue;

            return [
                { name: 'Dominado', value: dominated, color: '#10B981' },
                { name: 'Aprendendo', value: learning, color: '#3B82F6' },
                { name: 'Atrasado', value: overdue, color: '#EF4444' },
                { name: 'Pendente', value: Math.max(0, pending), color: '#94A3B8' }
            ];
        };

        // --- CORREÇÃO 4 — generateErrorOrigins ---
        const generateErrorOrigins = (errorsList: ExamError[]) => {
            if (errorsList.length === 0) return [];

            const total = errorsList.length;
            const origins = ['desatencao', 'falta_contato', 'cansaco'];

            const oneWeekAgo = subDays(now, 7);
            const twoWeeksAgo = subDays(now, 14);

            return origins.map(origin => {
                const count = errorsList.filter(e => e.error_origin === origin).length;
                const thisWeek = errorsList.filter(e =>
                    e.error_origin === origin &&
                    new Date(e.created_at) >= oneWeekAgo
                ).length;
                const lastWeek = errorsList.filter(e =>
                    e.error_origin === origin &&
                    new Date(e.created_at) >= twoWeeksAgo &&
                    new Date(e.created_at) < oneWeekAgo
                ).length;

                const trendVal = thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'stable';

                return {
                    type: origin as any,
                    percentage: Math.round((count / total) * 100),
                    trend: trendVal as any
                };
            });
        };

        // --- CORREÇÃO 5 — generatePositionData ---
        const generatePositionData = (errorsList: ExamError[]) => {
            const blocks = ['1-25', '26-50', '51-75', '76-100'];
            return blocks.map(block => ({
                block,
                count: errorsList.filter(e => e.posicao_questao === block).length
            }));
        };

        // --- CORREÇÃO 6 — generateHeatmapData ---
        const generateHeatmapData = (errorsList: ExamError[]) => {
            const specialtiesList = [
                'Clínica Médica',
                'Cirurgia',
                'Pediatria',
                'Ginecologia',
                'Obstetrícia',
                'Preventiva',
                'Outras Especialidades'
            ];
            return specialtiesList.map(specialty => {
                const months = Array.from({ length: 6 }, (_, i) => {
                    const targetMonth = subMonths(now, 5 - i);
                    return errorsList.filter(e => {
                        const d = new Date(e.created_at);
                        return e.specialty === specialty && isSameMonth(d, targetMonth);
                    }).length;
                });
                return { specialty, months };
            });
        };

        // --- CORREÇÃO 7 — generateActivityData ---
        const generateActivityData = (errorsList: ExamError[], examsList: Exam[]) => {
            return Array.from({ length: 56 }, (_, i) => {
                const date = subDays(now, 55 - i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const errorsOnDay = errorsList.filter(e => format(new Date(e.created_at), 'yyyy-MM-dd') === dateStr).length;
                const examsOnDay = examsList.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === dateStr).length;
                const activity = errorsOnDay + (examsOnDay * 3);
                const intensity = activity === 0 ? 0 : activity < 3 ? 1 : activity < 6 ? 2 : activity < 10 ? 3 : 4;
                return { date: dateStr, intensity };
            });
        };

        // --- CORREÇÃO 8 — generateStatusHistory ---
        const generateStatusHistory = (goalsList: PersonalGoal[]) => {
            const getStatus = (weekStart: Date, category: string): string => {
                const weekGoals = goalsList.filter(g =>
                    g.category === category && isSameWeek(new Date(g.created_at), weekStart)
                );
                if (weekGoals.length === 0) return 'gray';
                const avg = weekGoals.reduce((acc, g) => acc + (g.current_value / (g.target_value || 1)), 0) / weekGoals.length;
                if (avg >= 0.85) return 'green';
                if (avg >= 0.50) return 'yellow';
                return 'red';
            };

            const weeks = Array.from({ length: 4 }, (_, i) => startOfWeek(subDays(now, i * 7))).reverse();
            return {
                study: weeks.map(w => getStatus(w, 'estudo')),
                health: weeks.map(w => getStatus(w, 'saude')),
                exercise: weeks.map(w => getStatus(w, 'exercicio')),
            };
        };

        // --- CORREÇÃO 9 — calculateCorrelation ---
        const calculateCorrelation = (goalsList: PersonalGoal[], topicsList: any[]) => {
            const healthGoals = goalsList.filter(g => g.category === 'saude');
            const goodSleepGoals = healthGoals.filter(g => (g.current_value / (g.target_value || 1)) >= 0.8);
            const poorSleepGoals = healthGoals.filter(g => (g.current_value / (g.target_value || 1)) < 0.5);

            if (goodSleepGoals.length < 2 || poorSleepGoals.length < 2) return null;

            const avgScore = (list: any[]) =>
                list.length === 0 ? 0 : Math.round(list.reduce((a, t) => a + (t.last_score || 0), 0) / list.length);

            return {
                goodSleep: {
                    performance: avgScore(topicsList.filter(t => (t.last_score || 0) >= 70)),
                    recovery: goodSleepGoals.length
                },
                poorSleep: {
                    performance: avgScore(topicsList.filter(t => (t.last_score || 0) < 70)),
                    recovery: poorSleepGoals.length
                }
            };
        };

        // --- CORREÇÃO 10 — calculateSustainability ---
        const calculateSustainability = (goalsList: PersonalGoal[]) => {
            if (goalsList.length === 0) return null;
            const rate = (list: any[]) =>
                list.length === 0 ? 0 : Math.min(1, list.reduce((a, g) => a + (g.current_value / (g.target_value || 1)), 0) / list.length);

            const sus = Math.round(
                (rate(goalsList.filter(g => g.category === 'estudo')) * 50) +
                (rate(goalsList.filter(g => g.category === 'saude')) * 30) +
                (rate(goalsList.filter(g => g.category === 'exercicio')) * 20)
            );
            return Math.min(100, sus);
        };

        // --- CORREÇÃO 11 — calculateNonRecurrence ---
        const calculateNonRecurrence = (errorsList: ExamError[]) => {
            if (errorsList.length === 0) return 100;
            const counts: Record<string, number> = {};
            errorsList.forEach(e => {
                const key = `${e.specialty}-${e.subtopic}`;
                counts[key] = (counts[key] || 0) + 1;
            });
            const total = Object.keys(counts).length;
            const recurrent = Object.values(counts).filter(c => c >= 2).length;
            return Math.round(((total - recurrent) / total) * 100);
        };

        // --- CORREÇÃO 12 — calculateSimConsistency ---
        const calculateSimConsistency = (examsList: Exam[]) => {
            if (examsList.length === 0) return 0;
            const withFeedback = examsList.filter(e => (e as any).slider_tempo !== null && (e as any).slider_tempo !== undefined).length;
            return Math.round((withFeedback / examsList.length) * 100);
        };

        // --- CORREÇÃO 15 — calculateStreaks ---
        const calculateStreaks = (errorsList: ExamError[], examsList: Exam[]) => {
            const activeDays = new Set<string>();
            errorsList.forEach(e => {
                activeDays.add(format(new Date(e.created_at), 'yyyy-MM-dd'));
            });
            examsList.forEach(e => {
                if (new Date(e.date) <= now) {
                    activeDays.add(format(new Date(e.date), 'yyyy-MM-dd'));
                }
            });

            const sortedDays = Array.from(activeDays).sort();
            if (sortedDays.length === 0) return { current: 0, record: 0 };

            let currentStreak = 0;
            const todayStr = format(now, 'yyyy-MM-dd');
            const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');

            let checkDate = activeDays.has(todayStr) ? todayStr : yesterdayStr;

            while (activeDays.has(checkDate)) {
                currentStreak++;
                checkDate = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd');
            }

            let record = 0;
            let tempStreak = 1;
            for (let i = 1; i < sortedDays.length; i++) {
                const prev = parseISO(sortedDays[i - 1]);
                const curr = parseISO(sortedDays[i]);
                const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);

                if (diff === 1) {
                    tempStreak++;
                    record = Math.max(record, tempStreak);
                } else {
                    tempStreak = 1;
                }
            }
            record = Math.max(record, currentStreak);
            return { current: currentStreak, record };
        };

        // --- CORREÇÃO 16 — calculateWeakestDay ---
        const calculateWeakestDay = (errorsList: ExamError[], examsList: Exam[]) => {
            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const counts = new Array(7).fill(0);

            errorsList.forEach(e => {
                const day = new Date(e.created_at).getDay();
                counts[day]++;
            });
            examsList.forEach(e => {
                if (new Date(e.date) <= now) {
                    const day = new Date(e.date).getDay();
                    counts[day] += 3;
                }
            });

            if (counts.every(c => c === 0)) return null;
            const minCount = Math.min(...counts);
            const weakestDayIndex = counts.indexOf(minCount);
            return dayNames[weakestDayIndex];
        };

        // --- CORREÇÃO 14 — Fase sem prova cadastrada ---
        const futureExams = exams.filter(e => new Date(e.date) > now);
        const nextExam = futureExams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        let monthsToExam: number | null = null;
        let idealVolume: number | null = null;

        if (nextExam) {
            const diffMs = new Date(nextExam.date).getTime() - now.getTime();
            monthsToExam = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
            idealVolume = monthsToExam < 3 ? 450 : monthsToExam <= 6 ? 250 : 100;
        }

        // --- Cálculos Finais do Hook ---
        const topics = dashboard?.topics || [];
        const isNewUser = errors.length === 0 && exams.length === 0 && goals.length === 0 && flashcards.length === 0;

        const gapClosure = flashcards.length > 0 ? (flashcards.filter(f => (f.repetition_level || 0) >= 5).length / flashcards.length) * 100 : 100;
        const goalConsistency = goals.filter(g => g.category === 'estudo').length > 0
            ? (goals.filter(g => g.category === 'estudo' && (g.current_value / g.target_value) >= 0.7).length / goals.filter(g => g.category === 'estudo').length) * 100
            : 0;
        const healthBalance = goals.filter(g => g.category !== 'estudo').length > 0
            ? (goals.filter(g => g.category !== 'estudo').reduce((acc, g) => acc + (g.current_value / g.target_value), 0) / goals.filter(g => g.category !== 'estudo').length) * 100
            : 100;

        const medFlowIndex = Math.min(100,
            (gapClosure * 0.30) +
            (calculateNonRecurrence(errors) * 0.25) +
            (calculateSimConsistency(exams) * 0.20) +
            (goalConsistency * 0.15) +
            (healthBalance * 0.10)
        );

        const streaks = calculateStreaks(errors, exams);
        const weakestDay = calculateWeakestDay(errors, exams);

        return {
            isNewUser,
            index: Math.round(medFlowIndex),
            components: {
                gapClosure: Math.round(gapClosure),
                nonRecurrence: calculateNonRecurrence(errors),
                simConsistency: calculateSimConsistency(exams),
                goalConsistency: Math.round(goalConsistency),
                healthBalance: Math.round(healthBalance)
            },
            charts: {
                weeklyData: generateWeeklyData(errors, goals),
                specialtyData: generateSpecialtyData(topics, errors),
                cardStatusData: generateCardStatusData(flashcards),
                errorOrigins: generateErrorOrigins(errors),
                positionData: generatePositionData(errors),
                heatmapData: generateHeatmapData(errors),
                activityData: generateActivityData(errors, exams),
                statusHistory: generateStatusHistory(goals),
                correlation: calculateCorrelation(goals, topics),
                sustainability: calculateSustainability(goals),
                monthsToExam,
                idealVolume,
                currentStreak: streaks.current,
                recordStreak: streaks.record,
                weakestDay
            }
        };
    }, [loading, exams, errors, goals, flashcards, dashboard, attempts]);

    return {
        loading,
        exams,
        errors,
        subtopics, // This is technically redundant now but keeping it for compatibility
        goals,
        flashcards,
        dashboard,
        metrics,
        refresh: loadData
    };
}

```

## 6. src/views/DashboardView.tsx
```tsx
import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { format, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    BookOpen,
    CheckCircle2,
    AlertCircle,
    Clock,
    TrendingUp,
    Calendar,
} from 'lucide-react';
import { StatCard } from '../components/shared/StatCard';
import { CasioStopwatch } from '../components/shared/CasioStopwatch';
import { SectionHeader } from '../components/ui/SectionHeader';
import type { DashboardStats, Topic } from '../services/types';

interface DashboardViewProps {
    data: DashboardStats | null;
    topics: Topic[];
    onUpdate: () => void;
}

export function DashboardView({ data, topics, onUpdate }: DashboardViewProps) {
    if (!data) return null;

    const projections = topics
        .filter((t) => t.next_review_date)
        .sort(
            (a, b) =>
                new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime(),
        )
        .reduce(
            (acc, topic) => {
                const dateKey = format(new Date(topic.next_review_date!), 'dd/MM');
                const existing = acc.find((p) => p.dateKey === dateKey);
                if (existing) {
                    existing.topics.push(topic);
                } else {
                    acc.push({ dateKey, topics: [topic], date: new Date(topic.next_review_date!) });
                }
                return acc;
            },
            [] as { dateKey: string; topics: Topic[]; date: Date }[],
        );

    const next24h = topics.filter(
        (t) =>
            t.next_review_date && isBefore(new Date(t.next_review_date), addDays(new Date(), 1)),
    ).length;

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total de Temas"
                    value={data.stats.total_topics}
                    icon={<BookOpen className="text-blue-600" />}
                    color="blue"
                />
                <StatCard
                    title="Alta Performance"
                    value={data.stats.high_perf}
                    icon={<CheckCircle2 className="text-emerald-600" />}
                    color="emerald"
                />
                <StatCard
                    title="Atrasados"
                    value={data.stats.overdue}
                    icon={<AlertCircle className="text-rose-600" />}
                    color="rose"
                />
                <StatCard
                    title="Próximas 24h"
                    value={next24h}
                    icon={<Clock className="text-amber-600" />}
                    color="amber"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <SectionHeader
                            icon={<TrendingUp size={20} className="text-emerald-600" />}
                            title="Esforço Diário (min)"
                        />
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.effort}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        }}
                                    />
                                    <Bar dataKey="total_minutes" fill="#10B981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <CasioStopwatch onSave={onUpdate} />
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <SectionHeader
                        icon={<Calendar size={20} className="text-blue-600" />}
                        title="Projeção de Revisões"
                    />
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {projections.length > 0 ? (
                            projections.map(({ dateKey, topics: dateTopics, date }) => (
                                <div
                                    key={dateKey}
                                    className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100 last:border-0"
                                >
                                    <div className="flex flex-col items-center justify-center min-w-[48px] h-[48px] bg-blue-50 text-blue-600 rounded-xl font-bold">
                                        <span className="text-[10px] uppercase opacity-60 leading-none">
                                            {format(date, 'MMM', { locale: ptBR })}
                                        </span>
                                        <span className="text-lg leading-none">{format(date, 'dd')}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap gap-1">
                                            {dateTopics.map((t) => (
                                                <span
                                                    key={t.id}
                                                    className="text-xs font-medium text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm"
                                                >
                                                    {t.title}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 text-sm italic text-center py-10">
                                Nenhuma revisão agendada ainda.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

```

## 7. src/views/WeeklyView.tsx
```tsx
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

```

## 8. src/views/TopicsView.tsx
```tsx
import React, { useState } from 'react';
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
    const [expanded, setExpanded] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [score, setScore] = useState('');
    const [duration, setDuration] = useState('30');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Erro inline no modal — não fecha o app, informa exatamente o que falhou
    const [submitError, setSubmitError] = useState<string | null>(null);

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
                        onClick={() => setExpanded(expanded === specialty ? null : specialty)}
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
                                expanded === specialty && 'rotate-180',
                            )}
                        />
                    </button>

                    <AnimatePresence>
                        {expanded === specialty && (
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

```

## 9. src/views/ReviewsView.tsx
```tsx
import React, { useMemo } from 'react';
import { AlertCircle, Clock, Calendar } from 'lucide-react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReviewCard } from '../components/shared/ReviewCard';
import type { Topic } from '../services/types';

interface ReviewsViewProps {
    topics: Topic[];
    onUpdate: () => void;
}

export function ReviewsView({ topics, onUpdate }: ReviewsViewProps) {
    const overdue = topics
        .filter((t) => t.next_review_date && isBefore(new Date(t.next_review_date), new Date()))
        .sort(
            (a, b) =>
                new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime(),
        );

    const upcoming = topics
        .filter(
            (t) =>
                t.next_review_date &&
                isAfter(new Date(t.next_review_date), new Date()) &&
                isBefore(new Date(t.next_review_date), addDays(new Date(), 7)),
        )
        .sort(
            (a, b) =>
                new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime(),
        );

    const nextMonths = topics
        .filter(
            (t) =>
                t.next_review_date && isAfter(new Date(t.next_review_date), addDays(new Date(), 7)),
        )
        .sort(
            (a, b) =>
                new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime(),
        );

    const groupedByMonth: Record<string, Topic[]> = useMemo(() => {
        const result: Record<string, Topic[]> = {};
        for (const topic of nextMonths) {
            const date = new Date(topic.next_review_date!);
            const monthYear = format(date, 'MMMM yyyy', { locale: ptBR });
            if (!result[monthYear]) result[monthYear] = [];
            result[monthYear].push(topic);
        }
        return result;
    }, [nextMonths]);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Atrasados */}
            <section>
                <h3 className="text-lg font-bold text-rose-600 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Atrasados ({overdue.length})
                </h3>
                <div className="grid gap-3">
                    {overdue.map((topic) => (
                        <ReviewCard key={topic.id} topic={topic} onUpdate={onUpdate} />
                    ))}
                    {overdue.length === 0 && (
                        <p className="text-slate-400 text-sm italic">Nenhuma revisão atrasada. Bom trabalho!</p>
                    )}
                </div>
            </section>

            {/* Próximos 7 dias */}
            <section>
                <h3 className="text-lg font-bold text-amber-600 mb-4 flex items-center gap-2">
                    <Clock size={20} />
                    Próximos 7 dias ({upcoming.length})
                </h3>
                <div className="grid gap-3">
                    {upcoming.map((topic) => (
                        <ReviewCard key={topic.id} topic={topic} onUpdate={onUpdate} />
                    ))}
                    {upcoming.length === 0 && (
                        <p className="text-slate-400 text-sm italic">
                            Nada agendado para os próximos 7 dias.
                        </p>
                    )}
                </div>
            </section>

            {/* Próximos meses */}
            <section className="space-y-6">
                <h3 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
                    <Calendar size={20} />
                    Próximos meses ({nextMonths.length})
                </h3>
                {Object.entries(groupedByMonth).map(([month, monthTopics]) => (
                    <div key={month} className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                            {month}
                        </h4>
                        <div className="grid gap-3">
                            {monthTopics.map((topic) => (
                                <ReviewCard key={topic.id} topic={topic} onUpdate={onUpdate} />
                            ))}
                        </div>
                    </div>
                ))}
                {nextMonths.length === 0 && (
                    <p className="text-slate-400 text-sm italic">
                        Nenhuma revisão agendada para os próximos meses.
                    </p>
                )}
            </section>
        </div>
    );
}

```

## 10. src/views/PerformanceView.tsx
```tsx
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
    fetchExamQuestions, saveAttempt, updateAttemptErrorOrigin,
    saveExam
} from '../services/api';
import { SPECIALTIES } from '../constants';
import { ExamCalendar } from './Performance/ExamCalendar';
import { ExamFeedbackModal } from './Performance/ExamFeedbackModal';
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
    const [examForm, setExamForm] = useState({
        name: '',
        date: '',
        type: 'simulado' as 'simulado' | 'prova_integra',
        specialties: [] as string[],
        notes: ''
    });
    const [errorForm, setErrorForm] = useState({ exam_id: '', specialty: '', topic_id: '', subtopic: '', error_origin: 'desatencao', posicao_questao: '1-25', notes: '' });
    const [goalForm, setGoalForm] = useState({ category: 'estudo', title: '', unit: '', target_value: '100' });

    // Feedback State
    const [feedbackExam, setFeedbackExam] = useState<any>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [activeQuiz, setActiveQuiz] = useState<any>(null);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [lastAttemptId, setLastAttemptId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctOption: string } | null>(null);

    // --- Handlers ---
    const handleSaveExam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingExam) {
                await updateExam(editingExam.id, examForm as any);
            } else {
                await saveExam(examForm as any); // Usando a nova função saveExam
            }
            setShowExamModal(false);
            refresh();
            setExamForm({ name: '', date: '', type: 'simulado', specialties: [], notes: '' });
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
                isNewUser={metrics.isNewUser}
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
                    isNewUser={metrics.isNewUser}
                    stats={{
                        total: errors.length * 10, // Approximation
                        avgRecent: metrics.charts.weeklyData.slice(-4).reduce((acc, d) => acc + d.count, 0) / 4 || 0,
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
                    currentStreak={metrics.charts.currentStreak}
                    recordStreak={metrics.charts.recordStreak}
                    weeklyConsistency={metrics.charts.goalConsistency}
                    weakestDay={metrics.charts.weakestDay}
                    advice={metrics.charts.advice}
                />
            </div>

            <PlanHealthDashboard
                statusHistory={metrics.charts.statusHistory}
                correlationData={metrics.charts.correlation}
                sustainabilityIndex={metrics.charts.sustainability}
            />

            {/* TAB DE CALENDÁRIO */}
            <div id="exam-calendar-section" className="pt-12 border-t border-slate-100">
                <ExamCalendar
                    exams={exams}
                    onOpenFeedback={(exam) => {
                        setFeedbackExam(exam);
                        setShowFeedbackModal(true);
                    }}
                    onAddExam={() => {
                        setEditingExam(null);
                        setExamForm({ name: '', date: '', type: 'simulado', specialties: [], notes: '' });
                        setShowExamModal(true);
                    }}
                />
            </div>

            <ExamFeedbackModal
                isOpen={showFeedbackModal}
                exam={feedbackExam}
                onClose={() => setShowFeedbackModal(false)}
                onUpdate={refresh}
            />

            <PerformanceManager isOpen={showManager} onClose={() => setShowManager(false)}>
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Calendário de Provas</h3>
                        <button onClick={() => { setEditingExam(null); setExamForm({ name: '', date: '', type: 'simulado', specialties: [], notes: '' }); setShowExamModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">+ Prova</button>
                    </div>
                    <div className="grid gap-3">
                        {exams.map(exam => (
                            <ExamRow
                                key={exam.id}
                                exam={exam}
                                onEdit={(e: any) => { setEditingExam(e); setExamForm({ name: e.name, date: e.date, type: e.type, specialties: e.specialties || [], notes: e.notes || '' }); setShowExamModal(true); }}
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
                    <form onSubmit={handleSaveExam} className="space-y-6">
                        <section className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações Básicas</label>
                            <input required placeholder="Nome do Simulado ou Prova" className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:border-slate-800" value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))} />
                            <div className="grid grid-cols-2 gap-4">
                                <input required type="date" className="p-4 rounded-2xl border border-slate-200 outline-none focus:border-slate-800" value={examForm.date} onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))} />
                                <select className="p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:border-slate-800" value={examForm.type} onChange={e => setExamForm(f => ({ ...f, type: e.target.value as any }))}>
                                    <option value="simulado">Simulado</option>
                                    <option value="prova_integra">Prova na Íntegra</option>
                                </select>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidades Foco (Opcional)</label>
                            <div className="flex flex-wrap gap-2">
                                {SPECIALTIES.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                            const current = examForm.specialties || [];
                                            const updated = current.includes(s.name)
                                                ? current.filter(x => x !== s.name)
                                                : [...current, s.name];
                                            setExamForm(f => ({ ...f, specialties: updated }));
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${(examForm.specialties || []).includes(s.name)
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <button type="submit" className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black shadow-xl shadow-slate-200 active:scale-[0.98] transition-all">
                            {editingExam ? 'Atualizar Prova' : 'Agendar Prova'}
                        </button>
                    </form>
                </ModalOverlay>
            )}
            {/* ... rest of the file ... */}

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

```

## 11. src/views/Performance/MedFlowIndex.tsx
```tsx
import React from 'react';
import { motion } from 'motion/react';
import { Target, TrendingUp, Calendar, CheckCircle2, Heart, ChevronRight } from 'lucide-react';

interface MedFlowIndexProps {
    index: number;
    isNewUser?: boolean;
    components: {
        gapClosure: number;
        nonRecurrence: number;
        simConsistency: number;
        goalConsistency: number;
        healthBalance: number;
    };
    historySize?: number;
}

export function MedFlowIndex({ index, components, isNewUser, historySize = 3 }: MedFlowIndexProps) {
    const isReady = historySize >= 3;

    const getStatus = (val: number) => {
        if (!isReady) return { label: 'Em Análise', color: 'text-slate-400', bg: 'bg-slate-50' };
        if (val < 40) return { label: 'Crítica', color: 'text-red-500', bg: 'bg-red-50' };
        if (val < 60) return { label: 'Em Construção', color: 'text-orange-500', bg: 'bg-orange-50' };
        if (val < 75) return { label: 'Funcional', color: 'text-yellow-600', bg: 'bg-yellow-50' };
        if (val < 90) return { label: 'Sólida', color: 'text-emerald-500', bg: 'bg-emerald-50' };
        return { label: 'Elite', color: 'text-purple-600', bg: 'bg-purple-50' };
    };

    const status = getStatus(index);

    const items = [
        { label: 'Fechamento de Lacunas', value: components.gapClosure, icon: Target, color: 'text-blue-500', weight: '30%' },
        { label: 'Não Reincidência', value: components.nonRecurrence, icon: TrendingUp, color: 'text-emerald-500', weight: '25%' },
        { label: 'Consistência Simulados', value: components.simConsistency, icon: Calendar, color: 'text-orange-500', weight: '20%' },
        { label: 'Metas de Estudo', value: components.goalConsistency, icon: CheckCircle2, color: 'text-yellow-500', weight: '15%' },
        { label: 'Equilíbrio Saúde', value: components.healthBalance, icon: Heart, color: 'text-red-500', weight: '10%' },
    ];

    return (
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="relative flex-shrink-0">
                    <svg className="w-48 h-48 transform -rotate-90">
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="#F1F5F9"
                            strokeWidth="12"
                        />
                        <motion.circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="12"
                            strokeDasharray={552.92}
                            initial={{ strokeDashoffset: 552.92 }}
                            animate={{ strokeDashoffset: isReady ? 552.92 - (552.92 * index) / 100 : 552.92 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={status.color}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        <span className="text-5xl font-black text-slate-800 tracking-tighter">
                            {isReady ? index : '--'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${status.color}`}>
                            {isReady ? status.label : 'Índice disponível após 3 semanas'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-slate-800">Índice MedFlow</h2>
                        {isNewUser && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                Novo Usuário
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mb-8">Baseado no seu histórico de preparação atual.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((item) => (
                            <div key={item.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-xl bg-white shadow-sm ${item.color}`}>
                                        <item.icon size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.weight}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="text-xs font-semibold text-slate-600 line-clamp-1">{item.label}</span>
                                    <span className="text-lg font-bold text-slate-800">{isNewUser ? 0 : item.value}%</span>
                                </div>
                                <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${isNewUser ? 0 : item.value}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className={`h-full ${item.color.replace('text', 'bg')}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isNewUser ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-8 p-8 bg-slate-900 text-white rounded-[32px] overflow-hidden relative"
                >
                    <div className="relative z-10">
                        <h3 className="text-xl font-black mb-4">Por onde começar</h3>
                        <ul className="space-y-3">
                            {[
                                'Cadastre sua prova no Calendário de Provas (aba Gerenciar)',
                                'Registre erros após simulados (aba Caderno de Oportunidades)',
                                'Crie metas semanais (aba Dashboard)',
                                'Estude temas para gerar dados de aproveitamento'
                            ].map((step, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-400 text-sm">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold">
                                        {i + 1}
                                    </div>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                </motion.div>
            ) : (
                <div className={`mt-8 p-4 rounded-2xl ${status.bg} border border-${status.color.split('-')[1]}-100 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white ${status.color}`}>
                            <TrendingUp size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ponto de melhoria</p>
                            <p className={`text-sm font-bold ${status.color}`}>
                                {items.sort((a, b) => a.value - b.value)[0].label} ({items.sort((a, b) => a.value - b.value)[0].value}%)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const weakest = items.sort((a, b) => a.value - b.value)[0];
                            const targetId = weakest.label === 'Fechamento de Lacunas' ? 'error-analysis-section' :
                                weakest.label === 'Não Reincidência' ? 'spaced-repetition-section' :
                                    weakest.label === 'Consistência Simulados' ? 'questions-panel-section' :
                                        weakest.label === 'Metas de Estudo' ? 'consistency-section' :
                                            'plan-health-section';
                            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                    >
                        Saber mais
                    </button>
                </div>
            )}
        </div>
    );
}

```

## 12. src/views/Performance/ConsistencyDashboard.tsx
```tsx
import React from 'react';
import { motion } from 'motion/react';
import { Zap, Trophy, History } from 'lucide-react';

interface ConsistencyDashboardProps {
    activityData: { date: string; intensity: number }[]; // intensity 0-4
    currentStreak: number;
    recordStreak: number;
    weeklyConsistency: number;
    weakestDay?: string | null;
    advice?: {
        revisionVsQuestions: boolean;
    };
}

export function ConsistencyDashboard({ activityData, currentStreak, recordStreak, weeklyConsistency, weakestDay, advice }: ConsistencyDashboardProps) {
    return (
        <div className="space-y-6">
            {advice?.revisionVsQuestions && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-4"
                >
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Zap size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-orange-900">Alerta de Revisão vs Questões</p>
                        <p className="text-xs text-orange-700">O robô notou que você está priorizando questões em detrimento das revisões agendadas. Sem revisão, o conhecimento vaza. Equilibre mais sua rotina amanhã.</p>
                    </div>
                </motion.div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendário de Atividade */}
                <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <History size={20} className="text-slate-400" />
                            <h3 className="text-lg font-bold text-slate-800">Calendário de Atividade</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Taxa de Consistência</p>
                            <p className="text-xl font-black text-slate-800">{weeklyConsistency}%</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                        {activityData.length > 0 ? activityData.map((day, idx) => {
                            const getColor = (intensity: number) => {
                                switch (intensity) {
                                    case 0: return 'bg-slate-50';
                                    case 1: return 'bg-emerald-100';
                                    case 2: return 'bg-emerald-300';
                                    case 3: return 'bg-emerald-500';
                                    case 4: return 'bg-emerald-700';
                                    default: return 'bg-slate-50';
                                }
                            };
                            return (
                                <div
                                    key={idx}
                                    className={`w-3 h-3 rounded-sm ${getColor(day.intensity)}`}
                                    title={day.date}
                                />
                            );
                        }) : (
                            <p className="text-xs text-slate-400 italic py-4">Seu calendário começa a partir de hoje. Continue registrando para ver seu histórico.</p>
                        )}
                    </div>

                    <div className="mt-6 flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Meta Batida</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-100" />
                            <span>Alguma Atividade</span>
                        </div>
                    </div>
                </div>

                {/* Sequências */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                        <div className="p-3 rounded-2xl bg-orange-500 text-white mb-4 shadow-lg shadow-orange-500/20">
                            <Zap size={24} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sequência Atual</p>
                        <p className="text-4xl font-black text-slate-800">{currentStreak} dias</p>
                    </div>

                    <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center">
                        <div className="p-3 rounded-2xl bg-emerald-500 text-white mb-4 shadow-lg shadow-emerald-500/20">
                            <Trophy size={24} />
                        </div>
                        <p className="text-[10px] font-bold text-emerald-600/50 uppercase mb-1">Seu Recorde</p>
                        <p className="text-3xl font-black text-emerald-700">{recordStreak} dias</p>
                    </div>

                    <div className="p-4">
                        {weakestDay ? (
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {weakestDay} costuma ser seu dia com menos atividade registrada. Tente registrar pelo menos 1 erro ou revisão nesse dia para manter a consistência.
                            </p>
                        ) : (
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Continue registrando atividades para ver insights personalizados sobre seus padrões de estudo.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

```

## 13. src/views/Performance/PlanHealthDashboard.tsx
```tsx
import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Moon, Dumbbell } from 'lucide-react';

interface PlanHealthDashboardProps {
    statusHistory: {
        study: string[];
        health: string[];
        exercise: string[];
    };
    correlationData: {
        goodSleep: { performance: number; recovery: number };
        poorSleep: { performance: number; recovery: number };
    };
    sustainabilityIndex: number;
}

export function PlanHealthDashboard({ statusHistory, correlationData, sustainabilityIndex }: PlanHealthDashboardProps) {
    const getTrafficLight = (status: string) => {
        switch (status) {
            case 'green': return 'bg-emerald-500';
            case 'yellow': return 'bg-yellow-500';
            case 'red': return 'bg-red-500';
            default: return 'bg-slate-200';
        }
    };

    const getSustainabilityLabel = (val: number) => {
        if (val > 70) return { label: 'Ritmo Sustentável', color: 'text-emerald-500', bg: 'bg-emerald-50' };
        if (val > 50) return { label: 'Sustentável com Ajustes', color: 'text-yellow-600', bg: 'bg-yellow-50' };
        return { label: 'Risco de Burnout', color: 'text-red-500', bg: 'bg-red-50' };
    };

    const sust = getSustainabilityLabel(sustainabilityIndex);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Semáforos e Histórico */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-8">Saúde do Plano</h3>
                <div className="space-y-6 flex-1">
                    {[
                        { label: 'Estudo', history: statusHistory.study },
                        { label: 'Saúde (Sono)', history: statusHistory.health },
                        { label: 'Exercício', history: statusHistory.exercise },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                            <div className="flex gap-2">
                                {item.history.map((s, idx) => (
                                    <div key={idx} className={`w-6 h-6 rounded-full ${getTrafficLight(s)} shadow-sm border-2 border-white`} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cruzamento Saúde-Desempenho */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <Zap size={20} className="text-yellow-500" />
                    <h3 className="text-lg font-bold text-slate-800">Impacto da Saúde</h3>
                </div>
                {correlationData ? (
                    <>
                        <div className="space-y-4 flex-1">
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Moon size={14} className="text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Sono Adequado</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-black text-emerald-700">{correlationData.goodSleep.performance}%</span>
                                    <span className="text-[10px] text-emerald-600 font-bold">Aproveitamento</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Moon size={14} className="text-red-500" />
                                    <span className="text-[10px] font-bold text-red-500 uppercase">Sono Insuficiente</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-black text-red-700">{correlationData.poorSleep.performance}%</span>
                                    <span className="text-[10px] text-red-500 font-bold">Aproveitamento</span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-[10px] text-slate-400 italic text-center">
                            "Dormir bem impacta em {correlationData.goodSleep.performance - correlationData.poorSleep.performance} pontos seu desempenho."
                        </p>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <Moon size={20} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dados Insuficientes</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Precisamos de pelo menos 3 semanas com metas de saúde batidas e 3 semanas com metas falhas para calcular a correlação.
                        </p>
                    </div>
                )}
            </div>

            {/* Sustentabilidade */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-8">Sustentabilidade</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    {sustainabilityIndex !== null ? (
                        <>
                            <div className={`w-32 h-32 rounded-full border-8 border-slate-50 flex items-center justify-center relative mb-6`}>
                                <motion.div
                                    initial={{ rotate: -90 }}
                                    animate={{ rotate: (sustainabilityIndex / 100 * 360) - 90 }}
                                    className="absolute inset-x-0 top-0 flex justify-center -mt-2"
                                >
                                    <div className="w-4 h-4 rounded-full bg-white shadow-md border-2 border-slate-800" />
                                </motion.div>
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl font-black text-slate-800">{sustainabilityIndex}%</span>
                                    <ShieldCheck size={20} className={sust.color} />
                                </div>
                            </div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${sust.color}`}>{sust.label}</p>
                        </>
                    ) : (
                        <div className="p-4">
                            <p className="text-xs text-slate-400 italic">Crie metas de saúde e exercício para ver o impacto no desempenho.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

```

## 14. src/components/layout/Sidebar.tsx
```tsx
import React from 'react';
import {
    LayoutDashboard,
    BookOpen,
    RefreshCw,
    Layers,
    FileText,
    Calendar,
    BrainCircuit,
    X,
    MessageSquareText,
    Gamepad2,
    TrendingUp,
} from 'lucide-react';
import { NavItem } from '../shared/NavItem';

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword' | 'performance';

interface SidebarProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    isOpen: boolean;
    onClose: () => void;
}

const NAV_ITEMS: { icon: React.ReactNode; label: string; id: TabId }[] = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <BookOpen size={20} />, label: 'Especialidades', id: 'topics' },
    { icon: <RefreshCw size={20} />, label: 'Revisões', id: 'reviews' },
    { icon: <Layers size={20} />, label: 'Flashcards', id: 'flashcards' },
    { icon: <FileText size={20} />, label: 'Caderno de Erros', id: 'errors' },
    { icon: <Gamepad2 size={20} />, label: 'Palavras Cruzadas', id: 'crossword' },
    { icon: <TrendingUp size={20} />, label: 'Desempenho', id: 'performance' },
    { icon: <Calendar size={20} />, label: 'Semana', id: 'weekly' },
];

export function Sidebar({ activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
    return (
        <aside
            className={`
                fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50 
                transition-transform duration-300 ease-in-out lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
            <div className="p-6 h-full flex flex-col">
                {/* Logo & Close Button */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <BrainCircuit className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800">MED-Flow</h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 lg:hidden hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="space-y-1 flex-1">
                    {NAV_ITEMS.map((item) => (
                        <NavItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            active={activeTab === item.id}
                            onClick={() => onTabChange(item.id)}
                        />
                    ))}
                </nav>
            </div>
        </aside>
    );
}

```

## 15. src/components/layout/Header.tsx
```tsx
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword';

const TAB_LABELS: Record<TabId, string> = {
    dashboard: 'Dashboard',
    topics: 'Especialidades',
    reviews: 'Revisões',
    flashcards: 'Flashcards',
    errors: 'Caderno de Erros',
    weekly: 'Semana',
    crossword: 'Palavras Cruzadas',
};

import { RefreshCw, LogOut, Menu, HelpCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
    activeTab: TabId;
    loading: boolean;
    onRefresh: () => void;
    onMenuClick: () => void;
    onShowReset: () => void;
    onShowTutorial: () => void;
}

export function Header({ activeTab, loading, onRefresh, onMenuClick, onShowReset, onShowTutorial }: HeaderProps) {
    const { signOut } = useAuth();

    return (
        <header className="mb-8 flex justify-between items-center bg-white/50 lg:bg-transparent p-4 -m-4 lg:p-0 lg:m-0 sticky top-0 z-30 lg:relative lg:z-auto backdrop-blur-md lg:backdrop-blur-none border-b border-slate-200 lg:border-none">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 lg:hidden hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                    title="Menu"
                >
                    <Menu size={24} />
                </button>
                <div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800">{TAB_LABELS[activeTab]}</h2>
                    <p className="text-slate-500 text-xs lg:text-sm hidden sm:block">Organize seus estudos médicos com eficiência.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onShowTutorial}
                    title="Tutorial"
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-500"
                >
                    <HelpCircle size={20} />
                </button>
                <button
                    onClick={onShowReset}
                    title="Recomeçar do zero"
                    className="p-2 rounded-full hover:bg-red-50 transition-colors text-slate-400 hover:text-red-400"
                >
                    <RotateCcw size={20} />
                </button>
                <button
                    onClick={onRefresh}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                    title="Atualizar dados"
                >
                    <RefreshCw size={20} className={cn(loading && 'animate-spin')} />
                </button>
                <button
                    onClick={signOut}
                    className="p-2 hover:bg-rose-50 rounded-full transition-colors text-rose-600"
                    title="Sair"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
}

```

## 16. src/components/TutorialModal.tsx
```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    CheckCircle2, ArrowLeft, ArrowRight,
    Target, Zap, PlayCircle, AlertCircle,
    X, Trophy, BookOpen
} from 'lucide-react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const steps = [
    {
        title: "Bem-vindo ao MedFlow",
        text: "Seu segundo cérebro para a residência médica. Você insere os dados — erros, provas, metas — e o sistema organiza tudo automaticamente. Sem IA. Sem adivinhação. Só seus dados.",
        icon: <PlayCircle size={32} className="text-emerald-500" />,
        color: "bg-emerald-50"
    },
    {
        title: "Caderno de Oportunidades",
        text: "Após cada simulado, registre cada erro em 3 passos: escolha a especialidade e o tema do seu cronograma, escreva o subtema específico (ex: 'Acalásia — critério manometria') e selecione a origem — Desatenção, Falta de Contato ou Cansaço. Erros de Falta de Contato viram flashcards automaticamente.",
        icon: <BookOpen size={32} className="text-rose-500" />,
        color: "bg-rose-50"
    },
    {
        title: "Revisão Espaçada",
        text: "Flashcards criados dos seus erros seguem intervalos baseados em evidência científica: 1, 3, 7, 14 e 30 dias. Ao revisar, avalie se lembrou com facilidade, com esforço ou não lembrou. O sistema ajusta o próximo intervalo automaticamente.",
        icon: <Target size={32} className="text-blue-500" />,
        color: "bg-blue-50"
    },
    {
        title: "Temas de Estudo",
        text: "Registre os temas que você estudou e sua performance. O sistema aplica revisão espaçada e avisa quando você precisa revisar cada tema antes que esqueça.",
        icon: <AlertCircle size={32} className="text-amber-500" />,
        color: "bg-amber-50"
    },
    {
        title: "Calendário e Metas",
        text: "Cadastre suas provas e simulados com a data exata. Acompanhe o D-Day automaticamente. Crie metas semanais de estudo, saúde e exercício — o sistema calcula sua meta diária e mostra o impacto do sono no seu desempenho.",
        icon: <Zap size={32} className="text-purple-500" />,
        color: "bg-purple-50"
    },
    {
        title: "Aba de Desempenho",
        text: "Depois de algumas semanas de uso, o Índice MedFlow (0-100) resume toda sua preparação em um número. Veja onde estão suas lacunas, sua consistência e se seu ritmo é sustentável até a prova.",
        icon: <Trophy size={32} className="text-yellow-500" />,
        color: "bg-yellow-50"
    }
];

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const TUTORIAL_KEY = 'medflow_tutorial_seen';

    const handleClose = () => {
        localStorage.setItem(TUTORIAL_KEY, 'true');
        onClose();
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isOpen) return null;

    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white w-full max-w-[640px] rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col min-h-[500px]"
            >
                {/* Header / Progress Bar */}
                <div className="absolute top-0 inset-x-0 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Step {currentStep + 1} de {steps.length}</span>
                        <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 mt-12 text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center max-w-md w-full"
                        >
                            <div className={`mb-8 p-6 rounded-[32px] ${step.color || 'bg-slate-50'}`}>
                                {step.icon}
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-6">{step.title}</h2>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                {step.text}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Buttons */}
                <div className="p-8 flex items-center justify-between bg-slate-50/50">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${currentStep === 0
                            ? 'opacity-0 pointer-events-none'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <ArrowLeft size={18} />
                        Anterior
                    </button>

                    <button
                        onClick={nextStep}
                        className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95 ${isLastStep
                            ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'
                            : 'bg-slate-800 text-white shadow-slate-200 hover:bg-slate-900'
                            }`}
                    >
                        {isLastStep ? (
                            <>
                                Começar agora
                                <CheckCircle2 size={18} />
                            </>
                        ) : (
                            <>
                                Próximo
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

```

## 17. src/constants.ts
```ts
import { Theme } from './crosswordTypes';

export const THEMES: Theme[] = [
  {
    id: 'classic',
    name: 'Clássico (Dark)',
    bg: 'bg-[#E4E3E0]',
    gridBg: 'bg-[#141414]',
    cellBg: 'bg-[#E4E3E0]',
    cellText: 'text-[#141414]',
    blackCell: 'bg-[#141414]',
    activeCell: 'bg-[#F27D26]',
    activeWord: 'bg-[#F27D26]/20',
    correctCell: 'bg-[#22C55E]',
    incorrectCell: 'bg-[#EF4444]',
    font: 'font-sans',
    border: 'border-[#141414]'
  },
  {
    id: 'wood',
    name: 'Madeira (Scrabble)',
    bg: 'bg-[#5D4037]',
    gridBg: 'bg-[#3E2723]',
    cellBg: 'bg-[#D7CCC8]',
    cellText: 'text-[#3E2723]',
    blackCell: 'bg-[#3E2723]',
    activeCell: 'bg-[#FFB300]',
    activeWord: 'bg-[#FFB300]/30',
    correctCell: 'bg-[#4CAF50]',
    incorrectCell: 'bg-[#F44336]',
    font: 'font-serif',
    border: 'border-[#3E2723]',
    shadow: 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]',
    texture: 'https://www.transparenttextures.com/patterns/wood-pattern.png'
  },
  {
    id: 'crystal',
    name: 'Cristal (Neon)',
    bg: 'bg-[#0F172A]',
    gridBg: 'bg-[#1E293B]',
    cellBg: 'bg-[#334155]/50',
    cellText: 'text-cyan-400',
    blackCell: 'bg-[#020617]',
    activeCell: 'bg-cyan-500',
    activeWord: 'bg-cyan-500/20',
    correctCell: 'bg-emerald-500',
    incorrectCell: 'bg-rose-500',
    font: 'font-mono',
    border: 'border-cyan-500/50',
    shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]'
  },
  {
    id: 'stone',
    name: 'Pedra (Rúnico)',
    bg: 'bg-[#424242]',
    gridBg: 'bg-[#212121]',
    cellBg: 'bg-[#9E9E9E]',
    cellText: 'text-[#212121]',
    blackCell: 'bg-[#121212]',
    activeCell: 'bg-[#FF9800]',
    activeWord: 'bg-[#FF9800]/20',
    correctCell: 'bg-[#43A047]',
    incorrectCell: 'bg-[#E53935]',
    font: 'font-serif',
    border: 'border-[#212121]',
    texture: 'https://www.transparenttextures.com/patterns/stone-wall.png'
  },
  {
    id: 'parchment',
    name: 'Pergaminho (Antigo)',
    bg: 'bg-[#D7B588]',
    gridBg: 'bg-[#5D4037]',
    cellBg: 'bg-[#F5F5DC]',
    cellText: 'text-[#5D4037]',
    blackCell: 'bg-[#5D4037]',
    activeCell: 'bg-[#8D6E63]',
    activeWord: 'bg-[#8D6E63]/20',
    correctCell: 'bg-[#689F38]',
    incorrectCell: 'bg-[#D32F2F]',
    font: 'font-serif',
    border: 'border-[#5D4037]',
    texture: 'https://www.transparenttextures.com/patterns/parchment.png'
  }
];

export const SPECIALTIES = [
  {
    id: 'pediatria',
    name: 'Pediatria',
    themes: [
      'Doenças Exantemáticas',
      'Síndromes Respiratórias na Infância – Parte I',
      'Síndromes Respiratórias na Infância – Parte II',
      'Imunização',
      'Infecções do Trato Urinário',
      'Neonatologia I',
      'Neonatologia II',
      'Crescimento e seus Distúrbios',
      'Carência de Micronutrientes',
      'Puberdade e seus Distúrbios',
      'Desenvolvimento Infantil',
      'Aleitamento Materno + Diarreia Aguda'
    ]
  },
  {
    id: 'clinica-medica',
    name: 'Clínica Médica',
    themes: [
      'Síndrome Ictérica I (Hepatites)',
      'Síndrome Ictérica II (Doenças das Vias Biliares)',
      'Síndrome Diarreica',
      'Síndrome Metabólica I – HAS e Dislipidemia',
      'Síndrome Metabólica II – Diabetes e Obesidade',
      'Grandes Síndromes Endócrinas – Parte I (Tireoide)',
      'Grandes Síndromes Endócrinas – Parte II (Suprarrenal/Cálcio)',
      'Hipofunção Adrenal: Doença de Addison',
      'Terapia Intensiva',
      'Síndrome da Pneumonia Típica e Atípica',
      'Grandes Síndromes Bacterianas',
      'Síndromes de Imunodeficiência',
      'Síndromes Febris',
      'Tosse Crônica',
      'Dispneia (Doenças Vasculares, Obstrutivas e Restritivas)',
      'Geratria',
      'Epilepsia',
      'Síndrome Neurovascular',
      'Fraqueza Muscular',
      'Síndrome Álgica II – Cefaleias',
      'Síndromes Glomerulares e Doença Vascular Renal',
      'Síndrome Urêmica',
      'Distúrbio Hidroeletrolítico e Ácido-Básico',
      'Anemias – Parte I (Carenciais)',
      'Anemias – Parte II (Hemolíticas)',
      'Leucemias e Pancitopenia',
      'Linfonodo e Esplenomegalia',
      'Distúrbios da Hemostasia',
      'Artrites',
      'Colagenoses',
      'Vasculites',
      'Síndrome Edemigênica',
      'Síndrome Álgica IV – Dor Torácica – Parte I',
      'Síndrome Álgica IV – Dor Torácica – Parte II',
      'Taquiarritmias',
      'Bradiarritmias'
    ]
  },
  {
    id: 'cirurgia',
    name: 'Cirurgia',
    themes: [
      'Síndrome de Insuficiência Hepática',
      'Síndrome de Hipertensão Porta',
      'Síndrome Disfágica',
      'Síndrome Dispéptica e Doenças do TGI Superior',
      'Hemorragia Digestiva I – Abordagem e Conduta',
      'Síndrome Álgica I – Dor Abdominal',
      'Hemorragia Digestiva II – Proctologia',
      'Síndrome de Oclusão Intestinal (Aguda x Crônica)',
      'Oncologia II – Parte I (Próstata, Pulmão e Tireoide)',
      'Oncologia II – Parte II (Esôfago, Estômago, Colorretal, Pâncreas e Fígado)',
      'Síndrome Álgica III – Dor Lombar',
      'Trauma e suas Consequências I',
      'Trauma e suas Consequências II',
      'Perioperatório I',
      'Perioperatório II',
      'Especialidade Cirúrgica – Parte I',
      'Especialidade Cirúrgica – Parte II'
    ]
  },
  {
    id: 'ginecologia',
    name: 'Ginecologia',
    themes: [
      'Síndromes de Transmissão Sexual',
      'Oncologia I – Parte I (Mama e Ovário)',
      'Oncologia I – Parte II (Endométrio e Colo Uterino)',
      'Ciclo Menstrual, Distopia Genital e Incontinência Urinária',
      'Amenorreia, Infertilidade e Síndrome dos Ovários Policísticos',
      'Anticoncepção, Sangramentos Ginecológicos e Endometriose'
    ]
  },
  {
    id: 'obstetricia',
    name: 'Obstetrícia',
    themes: [
      'Sangramentos da Primeira Metade da Gravidez',
      'Doença Hemolítica Perinatal',
      'Sangramentos da Segunda Metade da Gravidez',
      'Doenças Clínicas na Gravidez',
      'Sofrimento Fetal, Avaliação da Vitalidade Fetal, Fórcipe e Puerpério',
      'Diagnóstico de Gravidez, Modificações do Organismo Materno, Pré-Natal',
      'Aconselhamento Genético',
      'O Parto'
    ]
  },
  {
    id: 'preventiva',
    name: 'Preventiva',
    themes: [
      'SUS – Evolução Histórica, Diretrizes, Propostas e Financiamento',
      'Medidas de Saúde Coletiva',
      'Estudos Epidemiológicos',
      'Epidemiologia Clínica',
      'Vigilância da Saúde e Ética Médica',
      'Declaração de Óbito e Saúde do Trabalhador',
      'Intoxicações e Acidentes por Animais Peçonhentos'
    ]
  },
  {
    id: 'especialidades',
    name: 'Outras Especialidades',
    themes: [
      'Otorrinolaringologia',
      'Oftalmologia',
      'PALS',
      'Psiquiatria',
      'Ortopedia',
      'Dermatologia'
    ]
  }
];

```

