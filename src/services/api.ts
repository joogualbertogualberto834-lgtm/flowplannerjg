// ============================================================
// Camada de serviço — comunicação centralizada com a API
// Substitui os fetch() dispersos pelo App.tsx
// ============================================================

import type {
    Topic,
    DashboardStats,
    Flashcard,
    FlashcardStats,
    ErrorNote,
} from './types';

// --- Helper interno ---

async function request<T>(url: string, options?: RequestInit): Promise<T | null> {
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        // DELETE e similares podem não retornar JSON
        const contentType = res.headers.get('Content-Type') ?? '';
        if (contentType.includes('application/json')) {
            return (await res.json()) as T;
        }
        return null;
    } catch (err) {
        console.error(`[api] ${options?.method ?? 'GET'} ${url} falhou:`, err);
        throw err;
    }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// --- Leitura ---

export const fetchTopics = () => request<Topic[]>('/api/topics');

export const fetchDashboard = () => request<DashboardStats>('/api/dashboard');

export const fetchFlashcardsDue = () => request<Flashcard[]>('/api/flashcards?mode=due');

export const fetchAllFlashcards = () => request<Flashcard[]>('/api/flashcards/all');

export const fetchFlashcardStats = () => request<FlashcardStats>('/api/flashcards/stats');

export const fetchErrors = () => request<ErrorNote[]>('/api/errors');

// --- Sessões de estudo ---

export const postStudySession = (
    topicId: number,
    score: number,
    durationMinutes: number,
) =>
    request('/api/study-session', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ topic_id: topicId, score, duration_minutes: durationMinutes }),
    });

export const undoStudySession = (topicId: number) =>
    request('/api/study-session/undo', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ topic_id: topicId }),
    });

export const clearReview = (topicId: number) =>
    request('/api/study-session/clear-review', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ topic_id: topicId }),
    });

export const postStudyLog = (durationMinutes: number) =>
    request('/api/study-log', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ duration_minutes: durationMinutes }),
    });

// --- Flashcards ---

export const addFlashcard = (data: { topic_id: number; front: string; back: string }) =>
    request<Flashcard>('/api/flashcards', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });

export const updateFlashcard = (id: number, front: string, back: string) =>
    request(`/api/flashcards/${id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ front, back }),
    });

export const deleteFlashcard = (id: number) =>
    request(`/api/flashcards/${id}`, { method: 'DELETE' });

export const scoreFlashcard = (id: number, difficulty: number, durationMinutes: number) =>
    request(`/api/flashcards/${id}/score`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ difficulty, duration_minutes: durationMinutes }),
    });

// --- Caderno de Erros ---

export const addError = (data: { topic_id: string; content: string; tags: string }) =>
    request('/api/errors', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });

export const deleteError = (id: number) =>
    request(`/api/errors/${id}`, { method: 'DELETE' });

export const convertErrorToFlashcard = (error: ErrorNote) =>
    request('/api/flashcards', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
            topic_id: error.topic_id,
            front: `Revisão de Erro: ${error.topic_title}`,
            back: error.content,
        }),
    });
