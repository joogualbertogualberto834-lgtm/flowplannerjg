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
