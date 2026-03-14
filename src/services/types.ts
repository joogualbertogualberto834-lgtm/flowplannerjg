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
