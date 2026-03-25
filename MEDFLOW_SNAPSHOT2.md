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
import { SetupWizard } from './components/SetupWizard';
import { MentorGuide } from './components/MentorGuide';

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword' | 'performance';

import { useAuth } from './hooks/useAuth';
import { AuthView } from './views/AuthView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
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
    const handleNavigate = (e: any) => {
      if (e.detail) setActiveTab(e.detail as TabId);
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('medflow_tutorial_seen')) {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const wizardDone = localStorage.getItem('medflow_wizard_done');
      if (!wizardDone) {
        setShowWizard(true);
      }
    }
  }, [user]);

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

      <MentorGuide activeTab={activeTab} />

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
          localStorage.removeItem('medflow_wizard_done');
          setShowWizard(true);
        }}
      />

      {showWizard && (
        <SetupWizard
          onComplete={async () => {
            setShowWizard(false);
            await refresh();
          }}
          onSkip={() => {
            localStorage.setItem('medflow_wizard_done', 'true');
            setShowWizard(false);
          }}
        />
      )}
    </div>
  );
}
```

## 2. src/constants.ts
```tsx
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

## 3. src/services/api.ts
```tsx
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { error: upsertError } = await supabase.from('user_progress').upsert({
            user_id: user.id,
            topic_id: topicId,
            current_interval: nextInterval,
            last_score: finalScore,
            next_review_date: nextReviewDateStr,
            urgency_count: newUrgencyCount,
            previous_state: previousState as any
        }, { onConflict: 'user_id,topic_id' });

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
        'exam_questions',
        'difficult_subtopics',
        'personal_goals',
        'flashcards',
        'exam_attempts',
        'study_log',
        'user_progress',
        'error_notebook'
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

## 4. src/services/types.ts
```tsx
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

## 5. src/components/layout/Sidebar.tsx
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

const NAV_GROUPS = [
    {
        label: 'ESTUDAR',
        items: [
            {
                icon: <LayoutDashboard size={20} />,
                label: 'Início',
                id: 'dashboard'
            },
            {
                icon: <BookOpen size={20} />,
                label: 'Especialidades',
                id: 'topics'
            },
            {
                icon: <RefreshCw size={20} />,
                label: 'Revisões',
                id: 'reviews'
            },
            {
                icon: <Layers size={20} />,
                label: 'Flashcards',
                id: 'flashcards'
            },
        ]
    },
    {
        label: 'PROVAS',
        items: [
            {
                icon: <FileText size={20} />,
                label: 'Caderno de Erros',
                id: 'errors'
            },
            {
                icon: <Calendar size={20} />,
                label: 'Semana',
                id: 'weekly'
            },
        ]
    },
    {
        label: 'ACOMPANHAR',
        items: [
            {
                icon: <TrendingUp size={20} />,
                label: 'Desempenho',
                id: 'performance'
            },
            {
                icon: <Gamepad2 size={20} />,
                label: 'Palavras Cruzadas',
                id: 'crossword'
            },
        ]
    }
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
                <nav className="flex-1 space-y-6 overflow-y-auto">
                    {NAV_GROUPS.map(group => (
                        <div key={group.label}>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
                                {group.label}
                            </p>
                            <div className="space-y-1">
                                {group.items.map(item => (
                                    <NavItem
                                        key={item.id}
                                        icon={item.icon}
                                        label={item.label}
                                        active={activeTab === item.id}
                                        onClick={() => onTabChange(item.id as TabId)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>
        </aside>
    );
}
```

## 6. src/components/layout/Header.tsx
```tsx
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword';

const TAB_LABELS: Record<string, string> = {
    dashboard: 'Início',
    topics: 'Especialidades',
    reviews: 'Revisões',
    flashcards: 'Flashcards',
    errors: 'Caderno de Erros',
    weekly: 'Semana',
    crossword: 'Palavras Cruzadas',
    performance: 'Desempenho',
};

const TAB_SUBTITLES: Record<string, string> = {
    dashboard: 'Seu painel de comando diário',
    topics: 'Organize seus estudos médicos',
    reviews: 'Revisão espaçada baseada em evidência',
    flashcards: 'Memorização ativa e eficiente',
    errors: 'Transforme erros em aprovação',
    weekly: 'Visão da sua semana',
    crossword: 'Fixe conceitos jogando',
    performance: 'Acompanhe sua preparação',
};

import { RefreshCw, LogOut, Menu, HelpCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
    activeTab: string;
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
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800">{TAB_LABELS[activeTab] || 'MedFlow'}</h2>
                    <p className="text-slate-500 text-xs lg:text-sm hidden sm:block">
                        {TAB_SUBTITLES[activeTab] || 'Organize seus estudos médicos com eficiência.'}
                    </p>
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
