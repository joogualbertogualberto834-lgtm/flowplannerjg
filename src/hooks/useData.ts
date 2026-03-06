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

    const refresh = async () => {
        setLoading(true);
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
        } catch (err) {
            console.error('[useData] Erro ao buscar dados:', err);
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
        groupedTopics,
        refresh,
    };
}
