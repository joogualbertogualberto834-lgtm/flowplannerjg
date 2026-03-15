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
        const fiftyFiveDaysAgo = subDays(now, 55);
        const twoWeeksAgo = subDays(now, 14);

        // --- C1: Gap Closure (30%) ---
        const consolidatedCards = flashcards.filter(f => f.repetition_level >= 5).length;
        const totalOldGaps = errors.filter(e =>
            e.error_origin === 'falta_contato' &&
            new Date(e.created_at) < fiftyFiveDaysAgo
        ).length;
        const c1 = totalOldGaps > 0 ? (consolidatedCards / totalOldGaps) * 100 : 100;

        // --- C2: Non-relapse (25%) ---
        const subtopicCounts: Record<string, number> = {};
        errors.forEach(e => {
            const key = `${e.specialty}-${e.subtopic}`;
            subtopicCounts[key] = (subtopicCounts[key] || 0) + 1;
        });
        const totalSubtopics = Object.keys(subtopicCounts).length;
        const recurrentSubtopics = Object.values(subtopicCounts).filter(count => count >= 2).length;
        const c2 = totalSubtopics > 0 ? 100 - (recurrentSubtopics / totalSubtopics * 100) : 100;

        // --- C3: Sim Consistency (20%) ---
        const examsWithFeedback = exams.filter(e => (e as any).slider_tempo !== null).length;
        const c3 = exams.length > 0 ? (examsWithFeedback / exams.length) * 100 : 100;

        // --- C4 & Study Goals Logic (Problem 5 & 8) ---
        const studyGoals = goals.filter(g => g.category === 'estudo');
        const studyAttemptsByWeek: Record<string, { done: number; correct: number }> = {};
        attempts.forEach(att => {
            const weekStr = format(startOfWeek(new Date(att.created_at)), 'yyyy-ww');
            if (!studyAttemptsByWeek[weekStr]) studyAttemptsByWeek[weekStr] = { done: 0, correct: 0 };
            studyAttemptsByWeek[weekStr].done++;
            if (att.is_correct) studyAttemptsByWeek[weekStr].correct++;
        });

        // Calculate consistency based on real goals
        const weeksWithGoals = studyGoals.map(g => format(startOfWeek(new Date(g.created_at)), 'yyyy-ww'));
        const uniqueWeeksWithGoals = Array.from(new Set(weeksWithGoals));

        let c4 = 0;
        if (uniqueWeeksWithGoals.length > 0) {
            const consistentWeeks = uniqueWeeksWithGoals.filter(week => {
                const weekGoal = studyGoals.find(g => format(startOfWeek(new Date(g.created_at)), 'yyyy-ww') === week);
                if (!weekGoal) return false;
                const progress = weekGoal.current_value / weekGoal.target_value;
                return progress >= 0.70;
            }).length;
            c4 = (consistentWeeks / uniqueWeeksWithGoals.length) * 100;
        }

        // --- C5: Health Balance (10%) ---
        const recentGoals = goals.filter(g => new Date(g.created_at) >= twoWeeksAgo);
        const healthRate = recentGoals
            .filter(g => g.category === 'saude')
            .reduce((acc, g) => acc + (g.current_value / (g.target_value || 1)), 0) / (recentGoals.filter(g => g.category === 'saude').length || 1);
        const exerciseRate = recentGoals
            .filter(g => g.category === 'exercicio')
            .reduce((acc, g) => acc + (g.current_value / (g.target_value || 1)), 0) / (recentGoals.filter(g => g.category === 'exercicio').length || 1);
        const c5 = (Math.min(1, (healthRate + exerciseRate) / 2)) * 100;

        const medFlowIndex = Math.min(100, (c1 * 0.30) + (c2 * 0.25) + (c3 * 0.20) + (c4 * 0.15) + (c5 * 0.10));

        // --- Weekly Questions Chart (Problem 5) ---
        const last8Weeks = Array.from({ length: 8 }, (_, i) => {
            const d = subDays(now, i * 7);
            return format(startOfWeek(d), 'yyyy-ww');
        }).reverse();

        const weeklyData = last8Weeks.map(week => {
            const data = studyAttemptsByWeek[week] || { done: 0, correct: 0 };
            const weekGoal = studyGoals.find(g => format(startOfWeek(new Date(g.created_at)), 'yyyy-ww') === week);
            return {
                week: format(parseISO(week.split('-')[0] + '-W' + week.split('-')[1]), 'dd/MM'),
                count: data.done,
                target: weekGoal?.target_value || 100 // Fallback to 100 if no goal set
            };
        });

        // --- Specialty Performance (Problem 1) ---
        const specialties = ['Pediatria', 'Ginecologia', 'Cirurgia', 'Clínica Médica', 'Preventiva'];
        const specialtyData = specialties.map(s => {
            const specialtyAttempts = attempts.filter(a => a.exam_questions?.specialty === s);
            const total = specialtyAttempts.length;
            const correct = specialtyAttempts.filter(a => a.is_correct).length;

            let percentage = 0;
            let estimado = false;

            if (total > 0) {
                percentage = (correct / total) * 100;
            } else {
                // Proxy logic
                const specialtyErrorsCount = errors.filter(e => e.specialty === s).length;
                percentage = errors.length > 0 ? 100 - (specialtyErrorsCount / errors.length * 100) : 100;
                estimado = true;
            }

            // Trend
            const thisWeek = format(startOfWeek(now), 'yyyy-ww');
            const lastWeek = format(startOfWeek(subDays(now, 7)), 'yyyy-ww');

            const thisWeekAcc = attempts.filter(a => a.exam_questions?.specialty === s && format(startOfWeek(new Date(a.created_at)), 'yyyy-ww') === thisWeek);
            const lastWeekAcc = attempts.filter(a => a.exam_questions?.specialty === s && format(startOfWeek(new Date(a.created_at)), 'yyyy-ww') === lastWeek);

            const thisRate = thisWeekAcc.length > 0 ? (thisWeekAcc.filter(a => a.is_correct).length / thisWeekAcc.length) * 100 : percentage;
            const lastRate = lastWeekAcc.length > 0 ? (lastWeekAcc.filter(a => a.is_correct).length / lastWeekAcc.length) * 100 : percentage;

            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (thisRate > lastRate + 3) trend = 'up';
            else if (thisRate < lastRate - 3) trend = 'down';

            return { name: s, percentage: Math.round(percentage), trend, estimado };
        });

        // --- Heatmap (Problem 2) ---
        const heatmapData = specialties.map(specialty => {
            const months = Array.from({ length: 6 }, (_, i) => {
                const targetMonth = subMonths(now, 5 - i);
                return errors.filter(e =>
                    e.specialty === specialty &&
                    isSameMonth(new Date(e.created_at), targetMonth)
                ).length;
            });
            return { specialty, months };
        });

        // --- Status History (Problem 3) ---
        const getWeekStatus = (weekStart: Date, category: 'estudo' | 'saude' | 'exercicio'): string => {
            const weekGoals = goals.filter(g =>
                g.category === category &&
                isSameWeek(new Date(g.created_at), weekStart)
            );
            if (weekGoals.length === 0) return 'gray';
            const rate = weekGoals.reduce((acc, g) => acc + (g.current_value / (g.target_value || 1)), 0) / weekGoals.length;
            if (rate >= 0.85) return 'green';
            if (rate >= 0.50) return 'yellow';
            return 'red';
        };

        const statusLast4Weeks = Array.from({ length: 4 }, (_, i) => startOfWeek(subDays(now, i * 7))).reverse();
        const statusHistory = {
            study: statusLast4Weeks.map(w => getWeekStatus(w, 'estudo')),
            health: statusLast4Weeks.map(w => getWeekStatus(w, 'saude')),
            exercise: statusLast4Weeks.map(w => getWeekStatus(w, 'exercicio')),
        };

        // --- Sleep Correlation (Problem 4) ---
        const sleepGoals = goals.filter(g => g.category === 'saude');
        const goodSleepWeeks = sleepGoals.filter(g => g.current_value / (g.target_value || 1) >= 0.8);
        const poorSleepWeeks = sleepGoals.filter(g => g.current_value / (g.target_value || 1) < 0.5);

        let correlation = null;
        if (goodSleepWeeks.length >= 3 && poorSleepWeeks.length >= 3) {
            const getAvgAcc = (weekGoals: PersonalGoal[]) => {
                const weekStrings = weekGoals.map(g => format(startOfWeek(new Date(g.created_at)), 'yyyy-ww'));
                const relevantAttempts = attempts.filter(a => weekStrings.includes(format(startOfWeek(new Date(a.created_at)), 'yyyy-ww')));
                return relevantAttempts.length > 0 ? (relevantAttempts.filter(a => a.is_correct).length / relevantAttempts.length) * 100 : 0;
            };
            correlation = {
                goodSleep: { performance: Math.round(getAvgAcc(goodSleepWeeks)), recovery: 92 },
                poorSleep: { performance: Math.round(getAvgAcc(poorSleepWeeks)), recovery: 45 }
            };
        }

        // --- Difficult Subtopics (Problem 7) ---
        const subtopicErrorCount: Record<string, { name: string; specialty: string; count: number }> = {};
        errors.filter(e => e.error_origin === 'falta_contato').forEach(e => {
            const key = `${e.specialty}-${e.subtopic}`;
            if (!subtopicErrorCount[key]) {
                subtopicErrorCount[key] = { name: e.subtopic, specialty: e.specialty, count: 0 };
            }
            subtopicErrorCount[key].count++;
        });
        const difficultSubtopics = Object.values(subtopicErrorCount)
            .filter(s => s.count >= 2)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(s => ({ name: `${s.specialty} — ${s.name}`, mistakes: s.count }));

        // --- Spaced Repetition ---
        const dueCount = flashcards.filter(f => f.next_review && new Date(f.next_review) <= now).length;
        const learningCount = flashcards.filter(f => f.repetition_level < 5 && f.repetition_level > 0).length;
        const cardStatusData = [
            { name: 'Atrasado', value: dueCount, color: '#EF4444' },
            { name: 'Aprendendo', value: learningCount, color: '#F59E0B' },
            { name: 'Dominado', value: consolidatedCards, color: '#10B981' },
            { name: 'Pendente', value: flashcards.length - dueCount - learningCount - consolidatedCards, color: '#94A3B8' }
        ];

        // --- Error Origins ---
        const origins = ['desatencao', 'falta_contato', 'cansaco'];
        const errorOrigins = origins.map(o => {
            const count = errors.filter(e => e.error_origin === o).length;
            const percentage = errors.length > 0 ? (count / errors.length) * 100 : 33;
            return { type: o as any, percentage: Math.round(percentage), trend: 'stable' as const };
        });

        // --- Phase Logic ---
        const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const nextExam = sortedExams.find(e => new Date(e.date) > now);
        let idealVolume = 100;
        let monthsToExam = 7;

        if (nextExam) {
            const diffMs = new Date(nextExam.date).getTime() - now.getTime();
            monthsToExam = diffMs / (1000 * 60 * 60 * 24 * 30.44);
            if (monthsToExam < 3) idealVolume = 450;
            else if (monthsToExam <= 6) idealVolume = 250;
        }

        return {
            index: Math.round(medFlowIndex),
            components: {
                gapClosure: Math.round(c1),
                nonRecurrence: Math.round(c2),
                simConsistency: Math.round(c3),
                goalConsistency: Math.round(c4),
                healthBalance: Math.round(c5)
            },
            charts: {
                weeklyData,
                specialtyData,
                cardStatusData,
                errorOrigins,
                heatmapData,
                activityData: dashboard?.effort.map(e => ({
                    date: e.date,
                    intensity: e.total_minutes > 120 ? 4 : e.total_minutes > 60 ? 3 : e.total_minutes > 0 ? 1 : 0
                })) || [],
                statusHistory,
                correlation,
                sustainability: Math.round((c4 * 0.50) + (healthRate * 30) + (exerciseRate * 20)),
                monthsToExam: Math.round(monthsToExam),
                idealVolume,
                historySize: uniqueWeeksWithGoals.length,
                advice: {
                    revisionVsQuestions: (attempts.length > 0 && flashcards.filter(f => f.repetition_level > 0).length > 0) ?
                        attempts.length > (flashcards.filter(f => f.repetition_level > 0).length * 2) : false
                },
                positionData: [
                    { block: '1-25', count: errors.filter(e => e.posicao_questao === '1-25').length },
                    { block: '26-50', count: errors.filter(e => e.posicao_questao === '26-50').length },
                    { block: '51-75', count: errors.filter(e => e.posicao_questao === '51-75').length },
                    { block: '76-100', count: errors.filter(e => e.posicao_questao === '76-100').length }
                ]
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
