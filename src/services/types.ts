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
  notes: string | null;
  created_at: string;
}

export type ErrorOrigin = 'desatencao' | 'falta_contato' | 'cansaco';

export interface ExamError {
  id: number;
  exam_id: number | null;
  exam_name?: string;
  specialty: string;
  topic_id: number | null;
  subtopic: string;
  error_origin: ErrorOrigin;
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
