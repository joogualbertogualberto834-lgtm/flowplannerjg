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
