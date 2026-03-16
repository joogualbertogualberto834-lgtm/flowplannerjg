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
import { format, addDays, isBefore, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { fetchExams, fetchExamErrors, fetchPersonalGoals, fetchAllFlashcards } from '../services/api';
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
    const [exams, setExams] = useState<any[]>([]);
    const [examErrors, setExamErrors] = useState<any[]>([]);
    const [goals, setGoals] = useState<any[]>([]);
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [mentorLoading, setMentorLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchExams(),
            fetchExamErrors(),
            fetchPersonalGoals(),
            fetchAllFlashcards()
        ]).then(([e, err, g, f]) => {
            setExams(e);
            setExamErrors(err);
            setGoals(g);
            setFlashcards(f);
            setMentorLoading(false);
        }).catch(() => setMentorLoading(false));
    }, []);

    if (!data) return null;

    // Próxima prova
    const nextExam = exams
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;

    const daysToExam = nextExam
        ? differenceInDays(new Date(nextExam.date), new Date())
        : null;

    // Lógica da Fase de Preparação
    const prepPhase = (() => {
        if (daysToExam === null) return null;
        if (daysToExam > 180) return { name: 'Base (Consolidação)', ideal: '100-150', color: 'text-emerald-500', tip: 'Foque em construir uma base sólida nos temas de alta incidência.' };
        if (daysToExam > 90) return { name: 'Aprofundamento', ideal: '150-250', color: 'text-blue-500', tip: 'Hora de aumentar o volume e focar nos detalhes que diferenciam os aprovados.' };
        if (daysToExam > 30) return { name: 'Intensificação', ideal: '250-400', color: 'text-amber-500', tip: 'Foco total em questões e simulados. Identifique suas lacunas rapidamente.' };
        return { name: 'Reta Final', ideal: '400+', color: 'text-rose-500', tip: 'Revisão ultra-rápida e controle emocional. Você está quase lá!' };
    })();

    // Flashcards vencidos hoje
    const overdueFlashcards = flashcards.filter(f =>
        f.next_review &&
        isBefore(new Date(f.next_review), new Date()) &&
        (f.repetition_level || 0) < 5
    ).length;

    // Tópicos atrasados (revisão vencida)
    const overdueTopics = topics.filter(t =>
        t.next_review_date &&
        isBefore(new Date(t.next_review_date), new Date())
    ).length;

    // Meta de questões do dia
    const studyGoal = goals.find(g => g.category === 'estudo');
    const dailyTarget = studyGoal
        ? Math.ceil((studyGoal.target_value - studyGoal.current_value) / 7)
        : null;

    // Erros recentes (últimas 24h)
    const recentErrors = examErrors.filter(e =>
        differenceInDays(new Date(), new Date(e.created_at)) <= 1
    ).length;

    const dayContext = (() => {
        // PROVA HOJE
        if (daysToExam === 0) return {
            type: 'exam_day',
            emoji: '🎯',
            title: 'Dia de prova',
            subtitle: nextExam?.name || '',
            color: 'bg-blue-50 border-blue-200',
            badge: 'bg-blue-100 text-blue-700',
            badgeText: 'Hoje é o dia'
        };

        // PROVA AMANHÃ
        if (daysToExam === 1) return {
            type: 'exam_tomorrow',
            emoji: '📋',
            title: 'Prova amanhã',
            subtitle: nextExam?.name || '',
            color: 'bg-amber-50 border-amber-200',
            badge: 'bg-amber-100 text-amber-700',
            badgeText: 'Prepare-se hoje'
        };

        // ERROS RECENTES PARA REGISTRAR
        if (recentErrors > 0) return {
            type: 'post_exam',
            emoji: '📝',
            title: 'Registre seus erros',
            subtitle: `${recentErrors} erro${recentErrors > 1 ? 's' : ''} das últimas 24h`,
            color: 'bg-rose-50 border-rose-200',
            badge: 'bg-rose-100 text-rose-700',
            badgeText: 'Feche o ciclo'
        };

        // FLASHCARDS URGENTES
        if (overdueFlashcards > 5) return {
            type: 'review_urgent',
            emoji: '🔄',
            title: 'Revisões aguardando',
            subtitle: `${overdueFlashcards} flashcards vencidos`,
            color: 'bg-orange-50 border-orange-200',
            badge: 'bg-orange-100 text-orange-700',
            badgeText: 'Prioridade hoje'
        };

        // PROVA EM BREVE
        if (daysToExam !== null && daysToExam <= 7)
            return {
                type: 'exam_soon',
                emoji: '📅',
                title: `Prova em ${daysToExam} dias`,
                subtitle: nextExam?.name || '',
                color: 'bg-violet-50 border-violet-200',
                badge: 'bg-violet-100 text-violet-700',
                badgeText: 'Foque na revisão'
            };

        // DIA NORMAL
        return {
            type: 'study_day',
            emoji: '📚',
            title: 'Bom dia de estudos',
            subtitle: 'Siga o plano abaixo',
            color: 'bg-emerald-50 border-emerald-200',
            badge: 'bg-emerald-100 text-emerald-700',
            badgeText: 'No ritmo'
        };
    })();

    const todayActions = (() => {
        // DIA DE PROVA
        if (dayContext.type === 'exam_day') {
            return [
                {
                    n: 1, icon: '☕',
                    text: 'Relaxe e se prepare',
                    detail: 'Não estude conteúdo novo hoje — confie no que já estudou',
                    time: null, tab: null
                },
                {
                    n: 2, icon: '🎯',
                    text: 'Faça a prova com calma',
                    detail: nextExam?.name || 'Leia cada questão com atenção',
                    time: null, tab: null
                },
                {
                    n: 3, icon: '📝',
                    text: 'Após a prova: registre os erros',
                    detail: 'Vá ao Caderno de Erros e categorize cada questão errada',
                    time: '~15 min', tab: 'errors'
                }
            ];
        }

        // PROVA AMANHÃ
        if (dayContext.type === 'exam_tomorrow') {
            const a: any[] = [];
            if (overdueFlashcards > 0) a.push({
                n: 1, icon: '🔄',
                text: `Revise ${overdueFlashcards} flashcard${overdueFlashcards > 1 ? 's' : ''} vencido${overdueFlashcards > 1 ? 's' : ''}`,
                detail: 'Clique em Flashcards → revise cada card',
                time: `~${Math.ceil(overdueFlashcards * 1.5)} min`,
                tab: 'flashcards'
            });
            if (overdueTopics > 0) a.push({
                n: a.length + 1, icon: '📖',
                text: `Revise ${overdueTopics} tema${overdueTopics > 1 ? 's' : ''} atrasado${overdueTopics > 1 ? 's' : ''}`,
                detail: 'Clique em Revisões → complete cada card',
                time: `~${overdueTopics * 5} min`,
                tab: 'reviews'
            });
            a.push({
                n: a.length + 1, icon: '😴',
                text: 'Durma cedo hoje',
                detail: 'Sono adequado melhora seu desempenho em até 12 pontos',
                time: null, tab: null
            });
            return a.slice(0, 3);
        }

        // PÓS PROVA
        if (dayContext.type === 'post_exam') {
            const a: any[] = [{
                n: 1, icon: '📝',
                text: 'Registre os erros do simulado',
                detail: `Clique em Caderno de Erros → categorize cada erro (Desatenção, Falta de Contato ou Cansaço)`,
                time: `~${recentErrors * 2} min`,
                tab: 'errors'
            }];
            if (overdueFlashcards > 0) a.push({
                n: 2, icon: '🔄',
                text: `Revise ${overdueFlashcards} flashcard${overdueFlashcards > 1 ? 's' : ''} vencido${overdueFlashcards > 1 ? 's' : ''}`,
                detail: 'Clique em Flashcards → revise cada card',
                time: `~${Math.ceil(overdueFlashcards * 1.5)} min`,
                tab: 'flashcards'
            });
            if (dailyTarget) a.push({
                n: a.length + 1, icon: '✏️',
                text: `Meta de hoje: ${dailyTarget} questões`,
                detail: studyGoal
                    ? `${studyGoal.current_value} de ${studyGoal.target_value} feitas esta semana`
                    : 'Registre nas Metas Pessoais',
                time: `~${dailyTarget * 2} min`,
                tab: 'performance'
            });
            return a.slice(0, 3);
        }

        // REVISÕES URGENTES
        if (dayContext.type === 'review_urgent') {
            const a: any[] = [{
                n: 1, icon: '🔄',
                text: `Revise os ${overdueFlashcards} flashcards vencidos`,
                detail: 'Clique em Flashcards → faça todos antes de novos estudos',
                time: `~${Math.ceil(overdueFlashcards * 1.5)} min`,
                tab: 'flashcards'
            }];
            if (overdueTopics > 0) a.push({
                n: 2, icon: '📖',
                text: `Revise ${overdueTopics} tema${overdueTopics > 1 ? 's' : ''} atrasado${overdueTopics > 1 ? 's' : ''}`,
                detail: 'Clique em Revisões → complete cada card',
                time: `~${overdueTopics * 5} min`,
                tab: 'reviews'
            });
            if (dailyTarget) a.push({
                n: a.length + 1, icon: '✏️',
                text: `Depois: ${dailyTarget} questões`,
                detail: studyGoal
                    ? `${studyGoal.current_value} de ${studyGoal.target_value} esta semana`
                    : '',
                time: `~${dailyTarget * 2} min`,
                tab: 'performance'
            });
            return a.slice(0, 3);
        }

        // PROVA EM BREVE
        if (dayContext.type === 'exam_soon') {
            const a: any[] = [];
            if (overdueFlashcards > 0) a.push({
                n: 1, icon: '🔄',
                text: `Revise ${overdueFlashcards} flashcard${overdueFlashcards > 1 ? 's' : ''} vencido${overdueFlashcards > 1 ? 's' : ''}`,
                detail: 'Clique em Flashcards → faça primeiro',
                time: `~${Math.ceil(overdueFlashcards * 1.5)} min`,
                tab: 'flashcards'
            });
            if (overdueTopics > 0) a.push({
                n: a.length + 1, icon: '📖',
                text: `Revise ${overdueTopics} tema${overdueTopics > 1 ? 's' : ''} atrasado${overdueTopics > 1 ? 's' : ''}`,
                detail: 'Clique em Revisões',
                time: `~${overdueTopics * 5} min`,
                tab: 'reviews'
            });
            if (dailyTarget) a.push({
                n: a.length + 1, icon: '✏️',
                text: `${dailyTarget} questões hoje`,
                detail: studyGoal
                    ? `${studyGoal.current_value} de ${studyGoal.target_value} esta semana`
                    : '',
                time: `~${dailyTarget * 2} min`,
                tab: 'performance'
            });
            if (a.length === 0) a.push({
                n: 1, icon: '✅',
                text: 'Tudo em dia — continue assim',
                detail: `Prova em ${daysToExam} dias`,
                time: null, tab: null
            });
            return a.slice(0, 3);
        }

        // DIA NORMAL
        const a: any[] = [];
        if (overdueFlashcards > 0) a.push({
            n: 1, icon: '🔄',
            text: `Revise ${overdueFlashcards} flashcard${overdueFlashcards > 1 ? 's' : ''} vencido${overdueFlashcards > 1 ? 's' : ''}`,
            detail: 'Clique em Flashcards → faça antes das questões',
            time: `~${Math.ceil(overdueFlashcards * 1.5)} min`,
            tab: 'flashcards'
        });
        if (overdueTopics > 0) a.push({
            n: a.length + 1, icon: '📖',
            text: `Revise ${overdueTopics} tema${overdueTopics > 1 ? 's' : ''} com revisão vencida`,
            detail: 'Clique em Revisões → complete cada card',
            time: `~${overdueTopics * 5} min`,
            tab: 'reviews'
        });
        if (dailyTarget) a.push({
            n: a.length + 1, icon: '✏️',
            text: `Meta de hoje: ${dailyTarget} questões`,
            detail: studyGoal
                ? `${studyGoal.current_value} de ${studyGoal.target_value} feitas esta semana — registre nas Metas`
                : 'Configure uma meta em Desempenho → Metas Pessoais',
            time: `~${dailyTarget * 2} min`,
            tab: studyGoal ? 'performance' : 'performance'
        });
        if (a.length === 0) a.push({
            n: 1, icon: '🎯',
            text: 'Configure suas metas para começar',
            detail: 'Clique em Desempenho → Metas Pessoais → crie uma meta de estudo',
            time: '~5 min',
            tab: 'performance'
        });
        return a.slice(0, 3);
    })();

    const dailySummary = (() => {
        const parts: string[] = [];
        if (overdueFlashcards > 0)
            parts.push(`${overdueFlashcards} flashcard${overdueFlashcards > 1 ? 's' : ''} vencido${overdueFlashcards > 1 ? 's' : ''}`);
        if (overdueTopics > 0)
            parts.push(`${overdueTopics} tema${overdueTopics > 1 ? 's' : ''} atrasado${overdueTopics > 1 ? 's' : ''}`);
        if (studyGoal) {
            const pct = Math.round(
                (studyGoal.current_value /
                    studyGoal.target_value) * 100
            );
            parts.push(`${pct}% da meta semanal`);
        }
        if (parts.length === 0)
            return 'Comece registrando um tema estudado ou uma sessão de questões.';

        let summary = parts.join(' · ');
        if (prepPhase) {
            summary += ` · ${prepPhase.tip}`;
        }
        return summary;
    })();

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
            {!mentorLoading && (
                <MentorCard
                    dayContext={dayContext}
                    nextExam={nextExam}
                    daysToExam={daysToExam}
                    actions={todayActions}
                    recentErrors={recentErrors}
                    dailySummary={dailySummary}
                    prepPhase={prepPhase}
                />
            )}

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

function MentorCard({
    dayContext,
    nextExam,
    daysToExam,
    actions,
    recentErrors,
    dailySummary,
    prepPhase
}: any) {

    const navigate = (tab: string) => {
        if (!tab) return;
        window.dispatchEvent(
            new CustomEvent('navigate',
                { detail: tab })
        );
    };

    return (
        <div className={`rounded-2xl border-2
      p-6 space-y-5 mb-6
      ${dayContext.color}`}>

            {/* CABEÇALHO */}
            <div className="flex items-start
        justify-between gap-4">
                <div className="flex items-center
          gap-3">
                    <span className="text-3xl
            leading-none">
                        {dayContext.emoji}
                    </span>
                    <div>
                        <h2 className="text-xl
              font-black text-slate-800
              leading-tight">
                            {dayContext.title}
                        </h2>
                        <p className="text-sm
              text-slate-500 mt-0.5">
                            {dayContext.subtitle ||
                                new Date().toLocaleDateString(
                                    'pt-BR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                }
                                )
                            }
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1.5
          rounded-full text-xs font-bold
          whitespace-nowrap flex-shrink-0
          mt-1 ${dayContext.badge}`}>
                    {dayContext.badgeText}
                </span>
            </div>

            {/* D-DAY — só quando não é hoje */}
            {nextExam && daysToExam !== null
                && daysToExam > 0 && (
                    <div className="flex items-center
          gap-4 p-4 bg-white/70 rounded-xl
          border border-white">
                        <div className="text-center
            min-w-[56px]">
                            <p className="text-[10px]
              font-bold text-slate-400
              uppercase leading-none mb-1">
                                faltam
                            </p>
                            <p className={`text-4xl
              font-black leading-none
              ${daysToExam <= 2
                                    ? 'text-red-600'
                                    : daysToExam <= 7
                                        ? 'text-orange-500'
                                        : 'text-slate-700'}`}>
                                {daysToExam}
                            </p>
                            <p className="text-[10px]
              text-slate-400 leading-none
              mt-1">
                                {daysToExam === 1
                                    ? 'dia' : 'dias'}
                            </p>
                        </div>
                        <div className="h-12 w-px bg-slate-200 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 leading-tight truncate">
                                {nextExam.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-black uppercase text-slate-400">Fase:</p>
                                <p className={`text-[10px] font-black uppercase ${prepPhase?.color || 'text-slate-500'}`}>
                                    {prepPhase?.name || 'Planejamento'}
                                </p>
                            </div>
                        </div>
                        <div className="h-12 w-px bg-slate-200 flex-shrink-0" />
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Ideal Semanal</p>
                            <p className="text-lg font-black text-slate-700 leading-none">{prepPhase?.ideal || '--'}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">questões</p>
                        </div>
                    </div >
                )
            }

            {/* AÇÕES NUMERADAS */}
            <div className="space-y-2">
                <p className="text-[10px] font-black
          text-slate-400 uppercase
          tracking-widest">
                    O que fazer agora — nessa ordem
                </p>

                {actions.map((action: any) => (
                    <div
                        key={action.n}
                        onClick={() =>
                            action.tab &&
                            navigate(action.tab)}
                        className={`flex items-center
              gap-3 p-3.5 rounded-xl
              border transition-all
              ${action.tab
                                ? 'bg-white/80 border-white hover:bg-white hover:border-slate-200 hover:shadow-sm cursor-pointer active:scale-[0.99]'
                                : 'bg-white/40 border-white/50 cursor-default'
                            }`}
                    >
                        {/* Número em círculo */}
                        <div className="w-8 h-8
              rounded-full bg-slate-800
              text-white flex items-center
              justify-center text-sm
              font-black flex-shrink-0
              shadow-sm">
                            {action.n}
                        </div>

                        {/* Ícone */}
                        <span className="text-xl
              flex-shrink-0 leading-none">
                            {action.icon}
                        </span>

                        {/* Texto */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm
                font-bold text-slate-800
                leading-tight">
                                {action.text}
                            </p>
                            <p className="text-[11px]
                text-slate-500 mt-0.5
                leading-snug">
                                {action.detail}
                            </p>
                        </div>

                        {/* Tempo + seta */}
                        <div className="flex items-center
              gap-2 flex-shrink-0">
                            {action.time && (
                                <span className="text-[10px]
                  font-bold text-slate-400
                  bg-slate-100 px-2 py-1
                  rounded-lg whitespace-nowrap">
                                    {action.time}
                                </span>
                            )}
                            {action.tab && (
                                <span className="text-slate-400
                  font-bold text-sm">
                                    →
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* RESUMO DO DIA */}
            <div className="pt-1 border-t
        border-black/5">
                <p className="text-[11px]
          text-slate-400 leading-relaxed">
                    <span className="font-bold
            text-slate-500">Hoje: </span>
                    {dailySummary}
                </p>
            </div>

            {/* AVISO DE ERROS RECENTES */}
            {
                recentErrors > 0 &&
                dayContext.type !== 'post_exam' &&
                dayContext.type !== 'exam_day' && (
                    <div
                        onClick={() => navigate('errors')}
                        className="flex items-center
            gap-3 p-3 bg-white/60
            rounded-xl border border-white
            cursor-pointer hover:bg-white
            transition-all">
                        <span className="text-lg
            flex-shrink-0">⚡</span>
                        <p className="text-xs
            text-slate-600 flex-1
            leading-snug">
                            <span className="font-bold">
                                {recentErrors} erro{recentErrors > 1 ? 's' : ''}
                            </span> registrado{recentErrors > 1 ? 's' : ''} recentemente
                            — clique para ver os flashcards
                            criados automaticamente
                        </p>
                        <span className="text-slate-400
            font-bold flex-shrink-0">→</span>
                    </div>
                )
            }
        </div >
    );
}
