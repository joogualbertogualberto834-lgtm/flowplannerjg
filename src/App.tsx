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
import { useData } from './hooks/useData';

type TabId = 'dashboard' | 'topics' | 'reviews' | 'flashcards' | 'errors' | 'weekly';

import { useAuth } from './hooks/useAuth';
import { AuthView } from './views/AuthView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
    </div>
  );
}
