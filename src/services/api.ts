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

// ============================================================
// Supabase Edge Function — Extração de PDF via Gemini
// ============================================================

export const extractQuestionsFromPDF = async (pdfBase64: string, specialty: string, subtopic: string) => {
    const { data, error } = await supabase.functions.invoke('extract-pdf-questions', {
        body: { pdf_base64: pdfBase64, specialty, subtopic }
    });

    if (error) {
        console.error('[extractQuestionsFromPDF] Invocation error:', error);
        throw new Error(error.message || 'Erro na chamada da função.');
    }

    if (data && data.error) {
        console.error('[extractQuestionsFromPDF] Business error:', data.error);
        throw new Error(data.error);
    }

    return data.questions;
};
