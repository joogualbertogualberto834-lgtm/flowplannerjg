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
import { MedFlow2View } from './views/MedFlow2View';
import { useData } from './hooks/useData';
import { ResetModal } from './components/ResetModal';
import { TutorialModal } from './components/TutorialModal';
import { resetAllUserData } from './services/api';
import { useEffect } from 'react';
import { SetupWizard } from './components/SetupWizard';

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly' | 'crossword' | 'performance' | 'medflow2';

import { useAuth } from './hooks/useAuth';
import { AuthView } from './views/AuthView';
import { Loader2, AlertTriangle } from 'lucide-react';

// Basic Error Boundary Component
class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50 border-2 border-dashed border-rose-200 rounded-[2.5rem] flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black text-rose-900 mb-2">Ops! Algo deu errado.</h2>
          <p className="text-sm text-rose-600 font-medium max-w-xs mb-6">
            Ocorreu um erro ao carregar esta visualização. Tente atualizar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all"
          >
            Atualizar App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}


export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('medflow2');
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
      case 'medflow2':
        return (
          <ErrorBoundary>
            <MedFlow2View topics={topics} onUpdate={refresh} />
          </ErrorBoundary>
        );

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
