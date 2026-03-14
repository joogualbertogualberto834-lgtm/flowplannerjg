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

    return (data || []).map(t => ({
        ...t,
        current_interval: t.user_progress?.[0]?.current_interval ?? 0,
        last_score: t.user_progress?.[0]?.last_score ?? 0,
        next_review_date: t.user_progress?.[0]?.next_review_date ?? null,
        urgency_count: t.user_progress?.[0]?.urgency_count ?? 0,
        previous_state: t.user_progress?.[0]?.previous_state ?? null,
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
    const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('topic_id', topicId)
        .single();

    let currentInterval = progress?.current_interval ?? 0;
    let currentUrgency = progress?.urgency_count ?? 0;
    const previousState = progress ? JSON.stringify(progress) : null;

    let nextInterval;
    let newUrgencyCount = currentUrgency;
    let nextReviewDateStr: string | null = null;
    let finalScore: number | null = score;

    if (score === 0 && durationMinutes === 0) {
        nextInterval = 0;
        newUrgencyCount = 0;
        nextReviewDateStr = null;
        finalScore = null;
        await supabase.from('study_log').delete().eq('topic_id', topicId).eq('date', new Date().toISOString().split('T')[0]);
    } else {
        if (score > 79) {
            const intervals = [15, 30, 60, 90, 120, 180];
            nextInterval = intervals.find(i => i > currentInterval) || 180;
            newUrgencyCount = 0;
        } else if (score < 65) {
            const urgencyIntervals = [1, 3, 7];
            nextInterval = urgencyIntervals[newUrgencyCount] || 1;
            newUrgencyCount++;
        } else {
            nextInterval = Math.max(7, currentInterval || 7);
        }
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + nextInterval);
        nextReviewDateStr = nextReview.toISOString();
    }

    await supabase.from('user_progress').upsert({
        topic_id: topicId,
        current_interval: nextInterval,
        last_score: finalScore,
        next_review_date: nextReviewDateStr,
        urgency_count: newUrgencyCount,
        previous_state: previousState as any
    }, { onConflict: 'topic_id' });

    if (score !== 0 || durationMinutes !== 0) {
        await supabase.from('study_log').insert({
            activity_type: activityType,
            duration_minutes: durationMinutes,
            score: score,
            topic_id: topicId
        });
    }
};

export const undoStudySession = async (topicId: number) => {
    const { data: progress } = await supabase
        .from('user_progress')
        .select('previous_state')
        .eq('topic_id', topicId)
        .single();

    if (progress && progress.previous_state) {
        const prev = typeof progress.previous_state === 'string' ? JSON.parse(progress.previous_state) : progress.previous_state;
        await supabase.from('user_progress').update({
            current_interval: prev.current_interval,
            last_score: prev.last_score,
            next_review_date: prev.next_review_date,
            urgency_count: prev.urgency_count,
            previous_state: null
        }).eq('topic_id', topicId);

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
};

export const clearReview = async (topicId: number) => {
    await supabase.from('user_progress').update({ next_review_date: null }).eq('topic_id', topicId);
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
