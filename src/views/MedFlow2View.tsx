import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Check,
    Clock,
    Book,
    Info,
    Flame,
    Zap,
    Settings,
    Search,
    CheckCircle2,
    X,
    LayoutDashboard,
    Clock3,
    Trophy,
    History,
    BarChart3,
    Activity,
    ClipboardList,
    AlertCircle,
    Trash2,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    LayoutGrid,
    BookOpen,
    BarChart2,
    Target,
    ChevronUp,
    ChevronDown,
    Brain,
    Pin,
    Bell
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area,
    LabelList
} from 'recharts';
import { SPECIALTIES } from '../constants';
import { Topic } from '../services/types';

// ════════════════ CÉREBRO BLINDADO ════════════════
// Não editar — base matemática do algoritmo de revisão espaçada

const I_BASE = {
    ALERT: 2,   // score < 50%
    LOW: 3,     // score 50-69%
    MID: 10,    // score 70-84%
    HIGH: 25,   // score 85-100%
} as const;

const TEMP_MULT = {
    HOT: 0.8,
    NEUTRAL: 1.0,
    COLD: 1.2,
} as const;

const SIMULADO_REAL_MULT = 0.9;
const MAX_RESCHEDULES = 3;

// Trigger DS30: primeiro estudo cria R1 (D+1), R2 (D+7), R3 (D+30)
const TRIGGER_DS30 = [1, 7, 30] as const;

const R_RULES = {
    ACERTOS: 'acertos',
    DS30: 'ds30',
    DIARIA: 'diaria',
    SEMANAL: 'semanal',
    MENSAL: 'mensal',
} as const;

type ReviewRule = typeof R_RULES[keyof typeof R_RULES];

function calcNextInterval(
    score: number,
    isHot: boolean,
    isSimuladoReal: boolean,
    rescheduleCount: number
): number {
    let base: number;
    if (score < 50) base = I_BASE.ALERT;
    else if (score < 70) base = I_BASE.LOW;
    else if (score < 85) base = I_BASE.MID;
    else base = I_BASE.HIGH;

    const forcedHot = rescheduleCount > MAX_RESCHEDULES;
    const mult = (isHot || forcedHot) ? TEMP_MULT.HOT : TEMP_MULT.NEUTRAL;
    const simMult = isSimuladoReal ? SIMULADO_REAL_MULT : 1.0;

    return Math.max(1, Math.round(base * mult * simMult));
}

function calcNextIntervalByRule(rule: ReviewRule, score: number, isHot: boolean, isSimulado: boolean, reschedules: number): number {
    if (rule === R_RULES.ACERTOS) {
        if (score < 50) return 2;
        if (score < 70) return 3;
        if (score < 85) return 10;
        return 25;
    }
    if (rule === R_RULES.DIARIA) return 1;
    if (rule === R_RULES.SEMANAL) return 7;
    if (rule === R_RULES.MENSAL) return 30;
    // For DS30 or unknown, use the adaptive algorithm as fallback for the next individual step
    return calcNextInterval(score, isHot, isSimulado, reschedules);
}

// ════════════════ TIPOS E PERSISTÊNCIA ════════════════

type ReviewStatus = 'pending' | 'today' | 'overdue' | 'done';
type ReviewSubTab = 'painel' | 'calendario' | 'provas' | 'flashcards' | 'erros';

interface ExamEntry {
    id: string;
    banca: string;
    ano: number;
    score: number;
    durationMinutes: number;
    date: string;
    errorSubthemes: string[]; // List of subthemes missed
}

interface Flashcard {
    id: string;
    front: string;
    back: string;
    specialty: string;
    theme: string;
    level: 'easy' | 'medium' | 'hard';
    nextReview: string;
    box: number;
}

interface ReviewEntry {
    id: string;
    label: string;
    specialty: string;
    theme: string;
    subtheme?: string;
    scheduledDate: string; // YYYY-MM-DD
    completedDate?: string;
    score?: number;        // 0-100
    durationMinutes?: number;
    status: ReviewStatus;
    isHot: boolean;
    isSimuladoReal: boolean;
    rescheduleCount: number;
    parentId?: string;
    chainIndex: number;
    reviewRule?: ReviewRule;
    questionsTotal?: number;
    questionsCorrect?: number;
}

interface ErrorEntry2 {
    id: string;
    specialty: string;
    topic: string;
    subtopic: string;
    origin: 'desatencao' | 'falta_contato' | 'cansaco';
    position?: '1-25' | '26-50' | '51-75' | '76-100' | null;
    notes?: string;
    date: string;
    examId?: string | null;
}

const STORAGE_KEY = 'medflow2_reviews';
const SUBTHEMES_KEY = 'medflow2_subthemes';
const EXAMS_STORAGE_KEY = 'medflow2_exams';
const ERRORS_STORAGE_KEY = 'medflow2_errors';

function loadSubthemes(): string[] {
    try {
        const raw = localStorage.getItem(SUBTHEMES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function saveSubtheme(sub: string): void {
    if (!sub) return;
    const subs = loadSubthemes();
    if (!subs.includes(sub)) {
        localStorage.setItem(SUBTHEMES_KEY, JSON.stringify([...subs, sub]));
    }
}

function saveSubthemes(subs: string[]): void {
    localStorage.setItem(SUBTHEMES_KEY, JSON.stringify(subs));
}

function loadReviews(): ReviewEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function saveReviews(reviews: ReviewEntry[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function loadExams(): ExamEntry[] {
    try {
        const raw = localStorage.getItem(EXAMS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function saveExams(exams: ExamEntry[]): void {
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone issues
    d.setDate(d.getDate() + days);
    return toDateStr(d);
}

function calcStatus(scheduledDate: string, completedDate?: string): ReviewStatus {
    if (completedDate) return 'done';
    const today = toDateStr(new Date());
    if (scheduledDate < today) return 'overdue';
    if (scheduledDate === today) return 'today';
    return 'pending';
}

// ════════════════ COMPONENTES AUXILIARES ════════════════

const MetricCircle = ({ value, meta, unit, label, color }: { value: number, meta: number, unit: string, label: string, color: string }) => {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(100, (value / meta) * 100);
    const offset = circ - (pct / 100) * circ;

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center flex-1">
            <div className="relative">
                <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
                    <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold" style={{ color }}>{value}</span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">{unit}</span>
                </div>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">{label}</p>
        </div>
    );
};

// --- Exams Management Components ---

const PerformanceBySubthemeChart = ({ data, chartSpec, chartTheme, onSpecChange, onThemeChange }: { data: any[], chartSpec: string, chartTheme: string, onSpecChange: (s: string) => void, onThemeChange: (t: string) => void }) => {
    const activeSpec = SPECIALTIES.find(s => s.name === chartSpec);

    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-full">
            <div className="flex items-start justify-between mb-8">
                <div className="flex gap-4">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Zap size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Desempenho por Subtema</h3>
                        <p className="text-sm text-slate-400 font-bold mt-0.5 italic">({chartSpec} &gt; {chartTheme})</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Especialidade</label>
                    <select
                        value={chartSpec}
                        onChange={(e) => onSpecChange(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-400 focus:bg-white rounded-2xl px-4 py-3 font-bold text-slate-700 transition-all outline-none"
                    >
                        {SPECIALTIES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tema</label>
                    <select
                        value={chartTheme}
                        onChange={(e) => onThemeChange(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-400 focus:bg-white rounded-2xl px-4 py-3 font-bold text-slate-700 transition-all outline-none"
                    >
                        {activeSpec?.themes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-8 pr-4">
                {data.length > 0 ? data.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-6 group">
                        <div className="w-32 flex-shrink-0">
                            <p className="text-xs font-black text-slate-600 uppercase leading-tight group-hover:text-indigo-600 transition-colors">{item.name}</p>
                        </div>
                        <div className="flex-1 h-10 bg-slate-50 rounded-xl overflow-hidden relative shadow-inner border border-slate-100">
                            <div
                                className="h-full bg-emerald-700 transition-all duration-700 ease-out shadow-lg"
                                style={{ width: `${item.percentage}%` }}
                            />
                        </div>
                        <div className="w-16 text-right">
                            <span className="text-lg font-black text-emerald-700">{item.percentage}%</span>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center">
                        <p className="text-slate-300 font-bold italic">Nenhum dado registrado para esta combinação.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const FlashcardsDashboard = ({ 
    flashcards, 
    onAddCard, 
    onStudyPending, 
    onStudyDifficult 
}: { 
    flashcards: Flashcard[], 
    onAddCard: () => void,
    onStudyPending: () => void,
    onStudyDifficult: () => void
}) => {
    const [selectedSpec, setSelectedSpec] = useState<string>('Geral');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCards = flashcards.filter(c => {
        const matchesSpec = selectedSpec === 'Geral' || c.specialty === selectedSpec;
        const matchesSearch = c.front.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             c.back.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSpec && matchesSearch;
    });

    const stats = {
        total: flashcards.length,
        time: Math.round(flashcards.length * 0.7), // mock avg time
        pending: flashcards.filter(c => new Date(c.nextReview) <= new Date()).length
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="lg:col-span-3 space-y-6">
                <div className="glass-card p-6 rounded-[2rem] border border-white/50 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Especialidades</h3>
                        <button onClick={onAddCard} className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {['Geral', ...SPECIALTIES.map(s => s.name)].map(spec => {
                            const count = spec === 'Geral' ? flashcards.length : flashcards.filter(c => c.specialty === spec).length;
                            return (
                                <button
                                    key={spec}
                                    onClick={() => setSelectedSpec(spec)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${selectedSpec === spec ? 'bg-slate-900 text-white shadow-lg translate-x-1' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <span>{spec}</span>
                                    {count > 0 && <span className={`px-2 py-0.5 rounded-md text-[10px] ${selectedSpec === spec ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 size={14} className="text-slate-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estatísticas</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume</p>
                            <p className="text-xl font-black">{stats.total}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tempo</p>
                            <p className="text-xl font-black">{stats.time}m</p>
                        </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Média por Card</p>
                        <p className="text-sm font-black">0.7 min</p>
                    </div>
                </div>
            </div>

            {/* Main Flashcards Area */}
            <div className="lg:col-span-9 space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar nos seus cards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                        />
                    </div>
                    <button 
                        onClick={onStudyDifficult}
                        className="bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    >
                        <Flame size={16} /> Estudar Difíceis
                    </button>
                </div>

                <button
                    onClick={onStudyPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 group transition-all"
                >
                    <BookOpen size={20} className="group-hover:scale-110 transition-transform" />
                    Estudar Pendentes ({stats.pending} Novos + Revisões)
                </button>

                {filteredCards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredCards.map(card => (
                            <div key={card.id} className="glass-card p-6 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-wider">{card.theme}</span>
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${card.level === 'hard' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {card.level === 'hard' ? 'Difícil' : 'Bom'}
                                    </span>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-2 line-clamp-2">{card.front}</h4>
                                <p className="text-xs text-slate-400 font-medium">Próxima revisão: {card.nextReview}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="min-h-[400px] border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 bg-slate-50/50">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-6 text-slate-200">
                            <LayoutGrid size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Nenhum card encontrado</h3>
                        <p className="text-xs font-bold text-slate-400 max-w-xs">Organize seu conhecimento médico com flashcards dinâmicos e memorização ativa.</p>
                        <button 
                            onClick={onAddCard}
                            className="mt-8 bg-white border border-slate-200 text-slate-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                        >
                            Criar Primeiro Card
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ErrorsDashboard = ({ 
    errors, 
    onAddError, 
    onDeleteError,
    onConvertToFlashcard
}: { 
    errors: ErrorEntry2[], 
    onAddError: () => void,
    onDeleteError: (id: string) => void,
    onConvertToFlashcard: (err: ErrorEntry2) => void
}) => {
    const [filter, setFilter] = useState<'all' | 'desatencao' | 'falta_contato' | 'cansaco'>('all');

    const filteredErrors = errors.filter(e => filter === 'all' || e.origin === filter);

    const getOriginConfig = (origin: string) => {
        switch (origin) {
            case 'desatencao': return { label: 'Desatenção', color: 'bg-purple-100 text-purple-700', icon: <Brain size={14} /> };
            case 'falta_contato': return { label: 'Falta de Contato', color: 'bg-rose-100 text-rose-700', icon: <BookOpen size={14} /> };
            case 'cansaco': return { label: 'Cansaço', color: 'bg-amber-100 text-amber-700', icon: <History size={14} /> };
            default: return { label: origin, color: 'bg-slate-100 text-slate-700', icon: <AlertCircle size={14} /> };
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                     <h2 className="text-3xl font-black text-slate-800 tracking-tight">Caderno de Erros</h2>
                     <p className="text-slate-500 font-medium">Transforme suas falhas em oportunidades de aprovação.</p>
                </div>
                <button
                    onClick={onAddError}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-slate-200"
                >
                    <Plus size={18} /> Registrar Novo Erro
                </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'desatencao', label: 'Desatenção', color: 'bg-purple-50 text-purple-600 border-purple-100' },
                    { id: 'falta_contato', label: 'Falta de Contato', color: 'bg-rose-50 text-rose-600 border-rose-100' },
                    { id: 'cansaco', label: 'Cansaço', color: 'bg-amber-50 text-amber-600 border-amber-100' }
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setFilter(opt.id as any)}
                        className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filter === opt.id
                            ? (opt.color || 'bg-slate-800 text-white border-slate-800 shadow-md')
                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredErrors.map((error) => {
                    const config = getOriginConfig(error.origin);
                    return (
                        <div
                            key={error.id}
                            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:shadow-md transition-all flex flex-col"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-wrap gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${config.color} flex items-center gap-1.5`}>
                                        {config.icon} {config.label}
                                    </span>
                                    {error.position && (
                                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">
                                            Q {error.position}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                     {error.origin === 'falta_contato' && (
                                        <button 
                                            onClick={() => onConvertToFlashcard(error)}
                                            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            title="Gerar Flashcard"
                                        >
                                            <Zap size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onDeleteError(error.id)}
                                        className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                    {error.specialty} • {error.topic}
                                </p>
                                <h4 className="text-base font-black text-slate-800 leading-tight mb-3">
                                    {error.subtopic}
                                </h4>

                                {error.notes && (
                                    <div className="text-xs text-slate-500 bg-slate-50/80 p-4 rounded-2xl italic border-l-4 border-slate-200 mb-4 line-clamp-3">
                                        "{error.notes}"
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 mt-auto border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    {new Date(error.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredErrors.length === 0 && (
                    <div className="col-span-full py-24 text-center space-y-4 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto text-slate-200 shadow-sm">
                            <AlertCircle size={40} />
                        </div>
                        <h3 className="text-lg font-black text-slate-400">Nenhum erro encontrado</h3>
                        <p className="text-xs font-medium text-slate-400 max-w-xs mx-auto">Registre suas falhas para transformá-las em pontos na prova.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const RegisterErrorModal = ({
    isOpen,
    onClose,
    onConfirm
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: (err: Omit<ErrorEntry2, 'id' | 'date'>) => void
}) => {
    const [step, setStep] = useState(1);
    const [spec, setSpec] = useState(SPECIALTIES[0].name);
    const [theme, setTheme] = useState(SPECIALTIES[0].themes[0]);
    const [subtopic, setSubtopic] = useState('');
    const [origin, setOrigin] = useState<'desatencao' | 'falta_contato' | 'cansaco'>('desatencao');
    const [pos, setPos] = useState<'1-25' | '26-50' | '51-75' | '76-100' | null>(null);
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm({
            specialty: spec,
            topic: theme,
            subtopic: subtopic || 'Geral',
            origin,
            position: pos,
            notes
        });
        // Reset and close
        setStep(1);
        setSubtopic('');
        setNotes('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Mapear Erro</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Passo {step} de 3</p>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Especialidade</label>
                                <select 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 ring-offset-2"
                                    value={spec}
                                    onChange={e => {
                                        setSpec(e.target.value);
                                        setTheme(SPECIALTIES.find(s => s.name === e.target.value)?.themes[0] || '');
                                    }}
                                >
                                    {SPECIALTIES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tema Principal</label>
                                <select 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 ring-offset-2"
                                    value={theme}
                                    onChange={e => setTheme(e.target.value)}
                                >
                                    {SPECIALTIES.find(s => s.name === spec)?.themes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subtema / Tópico Específico</label>
                                <input 
                                    autoFocus
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900 ring-offset-2"
                                    placeholder="Ex: Doença de Kawasaki, Vacina Pentavalente..."
                                    value={subtopic}
                                    onChange={e => setSubtopic(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                             <div className="grid grid-cols-1 gap-4">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Origem do Erro</label>
                                {[
                                    { id: 'desatencao', label: 'Desatenção', sub: 'Poderia ter acertado se estivesse mais focado', icon: <Brain />, color: 'purple' },
                                    { id: 'falta_contato', label: 'Falta de Contato', sub: 'Assunto desconhecido ou esquecido', icon: <BookOpen />, color: 'rose' },
                                    { id: 'cansaco', label: 'Cansaço', sub: 'Erro no final da prova / fadiga mental', icon: <History />, color: 'amber' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setOrigin(opt.id as any)}
                                        className={`p-5 rounded-3xl border-2 transition-all text-left flex items-start gap-4 ${origin === opt.id 
                                            ? `border-slate-900 bg-slate-50` 
                                            : 'border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${origin === opt.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {opt.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{opt.label}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{opt.sub}</p>
                                        </div>
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Posição na Prova (Opcional)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['1-25', '26-50', '51-75', '76-100'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPos(pos === p ? null : p as any)}
                                            className={`py-3 rounded-2xl text-[10px] font-black transition-all border ${pos === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}
                                        >
                                            Q {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Anotações / Por que errou?</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900 ring-offset-2 min-h-[120px] resize-none"
                                    placeholder="Escreva brevemente o gatilho do erro..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 mt-12 pt-8 border-t border-slate-50">
                        {step > 1 && (
                            <button 
                                onClick={() => setStep(step - 1)}
                                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border-2 border-slate-50"
                            >
                                Voltar
                            </button>
                        )}
                        <button 
                            onClick={() => step < 3 ? setStep(step + 1) : handleConfirm()}
                            className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
                        >
                            {step < 3 ? 'Próximo' : 'Finalizar Registro'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExamsDashboard = ({ 
    exams, 
    onAddExam, 
    onEditExam, 
    onDeleteExam 
}: { 
    exams: ExamEntry[], 
    onAddExam: () => void,
    onEditExam: (exam: ExamEntry) => void,
    onDeleteExam: (id: string) => void
}) => {
    const [erroTab, setErroTab] = useState<'subtema' | 'disciplina'>('subtema');
    const [examsTab, setExamsTab] = useState<'geral' | 'bancas' | 'erros'>('geral');

    // Process data for charts
    const performanceData = exams.slice().reverse().map((e) => ({
        mes: new Date(e.date).toLocaleDateString('pt-BR', { month: 'short' }),
        score: e.score,
        id: `${e.banca} '${e.ano.toString().slice(-2)}`,
        timeStr: `${Math.floor(e.durationMinutes / 60)}h ${e.durationMinutes % 60}m`,
        min: e.durationMinutes
    }));

    // Group by banca for the left column
    const bancaGroups = exams.reduce((acc, curr) => {
        if (!acc[curr.banca]) acc[curr.banca] = [];
        acc[curr.banca].push(curr.score);
        return acc;
    }, {} as Record<string, number[]>);

    const bancaStats = Object.entries(bancaGroups).map(([name, scores]) => ({
        name,
        latestYear: exams.find(e => e.banca === name)?.ano || 2025,
        scores: scores.slice(0, 5).reverse(),
        color: name.includes('USP') ? 'border-indigo-500' : name.includes('PSU') ? 'border-blue-500' : 'border-emerald-500'
    })).slice(0, 5);

    // Error distribution (last 10 exams)
    const errorCounts = exams.slice(0, 10).reduce((acc, curr) => {
        curr.errorSubthemes.forEach(sub => {
            acc[sub] = (acc[sub] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>);

    const sortedErrors = Object.entries(errorCounts)
        .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / Math.max(1, exams.slice(0, 10).length)) * 100),
            icon: '🩸', // Placeholder icon as in snippet
            color: 'bg-red-500',
            track: 'bg-red-100',
            textInfo: 'text-red-500'
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Action Bar & Internal Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit shadow-inner">
                    {[
                        { id: 'geral', label: 'Geral', icon: <LayoutDashboard size={14} /> },
                        { id: 'bancas', label: 'Bancas', icon: <Target size={14} /> },
                        { id: 'erros', label: 'Erros', icon: <AlertCircle size={14} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setExamsTab(tab.id as any)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${examsTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
                
                <button
                    onClick={onAddExam}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-slate-200"
                >
                    <Plus size={18} /> Registrar Simulado
                </button>
            </div>

            {examsTab === 'geral' && (
                <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-8 px-2">Evolução do Desempenho (%)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={performanceData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                                        <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Média Global</p>
                            <h2 className="text-5xl font-black mb-6">
                                {exams.length > 0 ? Math.round(exams.reduce((a, b) => a + b.score, 0) / exams.length) : 0}%
                            </h2>
                            <div className="space-y-4 pt-6 border-t border-white/10">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400">Total Provas</span>
                                    <span className="text-xl font-black">{exams.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400">Melhor Score</span>
                                    <span className="text-xl font-black text-emerald-400">
                                        {exams.length > 0 ? Math.max(...exams.map(e => e.score)) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Histórico Consolidado */}
                    <div className="bg-white/40 backdrop-blur-md rounded-[3rem] p-10 border border-white/50 shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Gerenciar Provas</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Histórico completo de simulados</p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100">
                                <LayoutGrid size={20} className="text-slate-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {exams.slice().reverse().map(exam => (
                                <div key={exam.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{exam.ano}</div>
                                            <h4 className="text-lg font-black text-slate-800">{exam.banca}</h4>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onEditExam(exam)}
                                                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <ArrowRight size={14} className="rotate-[135deg]" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteExam(exam.id)}
                                                className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 mb-4">
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-0.5">SCORE</div>
                                            <div className="text-xl font-black text-indigo-600">{exam.score}%</div>
                                        </div>
                                        <div className="w-px h-8 bg-slate-100" />
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-0.5">TEMPO</div>
                                            <div className="text-sm font-bold text-slate-600">{Math.floor(exam.durationMinutes / 60)}h {exam.durationMinutes % 60}m</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-50">
                                        {exam.errorSubthemes.map(err => (
                                            <span key={err} className="text-[9px] font-black px-2 py-1 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors uppercase">
                                                {err}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {exams.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold tracking-widest uppercase">Nenhum simulado registrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {examsTab === 'bancas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-8">Desempenho por Instituição</h3>
                        <div className="space-y-4">
                            {bancaStats.map((banca, i) => (
                                <div key={i} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-3xl border border-transparent hover:border-slate-100 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-slate-400 group-hover:text-blue-500 transition-colors">
                                            {banca.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800">{banca.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{banca.latestYear}</p>
                                        </div>
                                    </div>
                                    <Sparkline data={banca.scores} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-8">Tempo de Prova</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData.slice(0, 5)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                                    <YAxis hide />
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="min" fill="#1e293b" radius={[12, 12, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {examsTab === 'erros' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Distribuição de Lacunas de Conhecimento</h3>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setErroTab('subtema')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${erroTab === 'subtema' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>Subtema</button>
                            <button onClick={() => setErroTab('disciplina')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${erroTab === 'disciplina' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>Disciplina</button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedErrors.map((erro, i) => (
                            <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-transparent hover:border-rose-100 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl">
                                        {erro.icon}
                                    </div>
                                    <span className="text-xl font-black text-slate-900">{erro.percentage}%</span>
                                </div>
                                <p className="font-black text-slate-800 text-xs uppercase tracking-tight mb-4 group-hover:text-rose-600 transition-colors uppercase truncate">{erro.name}</p>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${erro.percentage}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Sparkline = ({ data }: { data: number[] }) => {
    if (data.length < 2) return <div className="w-12 h-4" />;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 48},${16 - ((d - min) / range) * 12}`).join(' ');

    return (
        <svg width="48" height="16" className="overflow-visible">
            <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className={data[data.length - 1] >= data[0] ? 'text-emerald-500' : 'text-rose-500'}
            />
        </svg>
    );
};

// ════════════════ VIEW PRINCIPAL ════════════════

interface MedFlow2ViewProps {
    topics: Topic[];
    onUpdate: () => void;
}

export function MedFlow2View({ topics, onUpdate }: MedFlow2ViewProps) {
    const [activeSubTab, setActiveSubTab] = useState<ReviewSubTab>('painel');
    const [reviews, setReviews] = useState<ReviewEntry[]>(() => {
        const saved = localStorage.getItem('medflow2_reviews');
        return saved ? JSON.parse(saved) : [];
    });

    const [exams, setExams] = useState<ExamEntry[]>(() => {
        const saved = localStorage.getItem('medflow2_exams');
        return saved ? JSON.parse(saved) : [];
    });
    const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
        const saved = localStorage.getItem('medflow2_flashcards');
        return saved ? JSON.parse(saved) : [];
    });
    const [errors, setErrors] = useState<ErrorEntry2[]>(() => {
        const saved = localStorage.getItem('medflow2_errors');
        return saved ? JSON.parse(saved) : [];
    });
    const [showRegisterErrorModal, setShowRegisterErrorModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState<ReviewEntry | null>(null);
    const [showRelocateModal, setShowRelocateModal] = useState<ReviewEntry | null>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);

    // States for complete modal
    const [modalScore, setModalScore] = useState(80);
    const [modalMinutes, setModalMinutes] = useState(45);
    const [modalQuestTotal, setModalQuestTotal] = useState(20);
    const [modalQuestCorrect, setModalQuestCorrect] = useState(16);
    const [modalIsHot, setModalIsHot] = useState(false);
    const [modalIsSimulado, setModalIsSimulado] = useState(false);

    // Chart selections
    const [chartSpec, setChartSpec] = useState(SPECIALTIES[0]?.name || '');
    const [chartTheme, setChartTheme] = useState(SPECIALTIES[0]?.themes[0] || '');

    // States for relocate modal
    const [relocateDate, setRelocateDate] = useState(toDateStr(new Date()));

    // States for register modal
    const [regSpec, setRegSpec] = useState(SPECIALTIES[0]?.name || '');
    const [regTheme, setRegTheme] = useState('');
    const [regSubtheme, setRegSubtheme] = useState('');

    const [showAddFlashcardModal, setShowAddFlashcardModal] = useState(false);
    const [fcFront, setFcFront] = useState('');
    const [fcBack, setFcBack] = useState('');
    const [fcSpec, setFcSpec] = useState(SPECIALTIES[0]?.name || '');
    const [fcTheme, setFcTheme] = useState('');

    const [studyingCards, setStudyingCards] = useState<Flashcard[] | null>(null);
    const [currentFcIndex, setCurrentFcIndex] = useState(0);
    const [showFcBack, setShowFcBack] = useState(false);

    const handleAddFlashcard = () => {
        if (!fcFront || !fcBack) return;
        const newCard: Flashcard = {
            id: Math.random().toString(36).substr(2, 9),
            front: fcFront,
            back: fcBack,
            specialty: fcSpec,
            theme: fcTheme,
            level: 'medium',
            nextReview: new Date().toISOString(),
            box: 0
        };
        setFlashcards([newCard, ...flashcards]);
        setShowAddFlashcardModal(false);
        setFcFront('');
        setFcBack('');
        setFcTheme('');
    };

    const startStudy = (filter: 'pending' | 'difficult') => {
        let cards = [...flashcards];
        if (filter === 'pending') {
            cards = cards.filter(c => new Date(c.nextReview) <= new Date());
        } else {
            cards = cards.filter(c => c.level === 'hard');
        }
        if (cards.length > 0) {
            setStudyingCards(cards);
            setCurrentFcIndex(0);
            setShowFcBack(false);
        }
    };

    const handleFcResult = (level: 'easy' | 'medium' | 'hard') => {
        if (!studyingCards) return;
        const card = studyingCards[currentFcIndex];
        const updatedCards = flashcards.map(c => {
            if (c.id === card.id) {
                const days = level === 'easy' ? 7 : level === 'medium' ? 3 : 1;
                const next = new Date();
                next.setDate(next.getDate() + days);
                return { ...c, level, nextReview: next.toISOString() };
            }
            return c;
        });
        setFlashcards(updatedCards);
        
        if (currentFcIndex < studyingCards.length - 1) {
            setCurrentFcIndex(currentFcIndex + 1);
            setShowFcBack(false);
        } else {
            setStudyingCards(null);
        }
    };
    const [regDate, setRegDate] = useState(toDateStr(new Date()));
    const [regMinutes, setRegMinutes] = useState(60);
    const [regType, setRegType] = useState<'theoretical' | 'practical'>('theoretical');
    const [regQuestTotal, setRegQuestTotal] = useState(20);
    const [regQuestCorrect, setRegQuestCorrect] = useState(15);
    const [regRule, setRegRule] = useState<ReviewRule>(R_RULES.ACERTOS);

    // States for register exam modal
    const [showRegisterExamModal, setShowRegisterExamModal] = useState(false);
    const [examBanca, setExamBanca] = useState('');
    const [examAno, setExamAno] = useState(new Date().getFullYear());
    const [examScore, setExamScore] = useState(70);
    const [examMinutes, setExamMinutes] = useState(240);
    const [examDate, setExamDate] = useState(toDateStr(new Date()));
    const [examErrors, setExamErrors] = useState<string[]>([]);
    const [tempError, setTempError] = useState('');
    const [examErrorSpec, setExamErrorSpec] = useState(SPECIALTIES[0]?.name || '');
    const [savedSubthemes, setSavedSubthemes] = useState<string[]>(loadSubthemes);

    // DND State
    const [draggedReviewId, setDraggedReviewId] = useState<string | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [regStep, setRegStep] = useState(1);

    useEffect(() => {
        if (showRegisterModal) setRegStep(1);
    }, [showRegisterModal]);

    useEffect(() => {
        localStorage.setItem('medflow2_flashcards', JSON.stringify(flashcards));
    }, [flashcards]);

    useEffect(() => {
        localStorage.setItem('medflow2_reviews', JSON.stringify(reviews));
    }, [reviews]);

    useEffect(() => {
        localStorage.setItem('medflow2_exams', JSON.stringify(exams));
    }, [exams]);

    useEffect(() => {
        localStorage.setItem('medflow2_errors', JSON.stringify(errors));
    }, [errors]);

    useEffect(() => {
        setReviews(prev => prev.map(r => ({
            ...r,
            status: calcStatus(r.scheduledDate, r.completedDate)
        })));
    }, []);

    const todayStr = toDateStr(new Date());

    // Derived data
    const overdue = reviews.filter(r => r.status === 'overdue');
    const todayReviews = reviews.filter(r => r.status === 'today');

    const scoresBySpecialty = SPECIALTIES.map(spec => {
        const done = reviews.filter(r => r.specialty === spec.name && r.status === 'done' && r.score !== undefined);
        const avg = done.length ? Math.round(done.reduce((a, r) => a + (r.score || 0), 0) / done.length) : null;
        return { name: spec.name, avg };
    }).filter(s => s.avg !== null).sort((a, b) => (b.avg || 0) - (a.avg || 0));

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekDone = reviews.filter(r => {
        if (!r.completedDate) return false;
        const d = new Date(r.completedDate + 'T12:00:00');
        return d >= weekStart;
    });

    const weekAvg = weekDone.length ? Math.round(weekDone.reduce((a, r) => a + (r.score || 0), 0) / weekDone.length) : 0;
    const weekHours = Math.round(weekDone.reduce((a, r) => a + (r.durationMinutes || 0), 0) / 60 * 10) / 10;

    const chartSubthemeData = (reviews || [])
        .filter(r => r.specialty === chartSpec && r.theme === chartTheme && r.status === 'done')
        .reduce((acc, r) => {
            const sub = r.subtheme || 'Geral';
            let group = acc.find(g => g.name === sub);
            if (!group) {
                group = { name: sub, correct: 0, total: 0 };
                acc.push(group);
            }
            group.correct += r.questionsCorrect || 0;
            group.total += r.questionsTotal || 0;
            return acc;
        }, [] as { name: string, correct: number, total: number }[])
        .map(g => ({
            name: g.name,
            percentage: g.total > 0 ? Math.round((g.correct / g.total) * 100) : 0
        }))
        .sort((a, b) => b.percentage - a.percentage);

    // Kanban days
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        weekDays.push({
            dateStr: toDateStr(d),
            label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
            dayNum: d.getDate()
        });
    }

    // Handlers
    const handleRegisterStudy = () => {
        if (!regSpec || !regTheme) return;

        const score = regQuestTotal > 0 ? Math.round((regQuestCorrect / regQuestTotal) * 100) : 0;
        const isPE = regType === 'theoretical';

        // Save subtheme if it exists
        if (regSubtheme) {
            saveSubtheme(regSubtheme);
            setSavedSubthemes(loadSubthemes());
        }

        const study: ReviewEntry = {
            id: generateId(),
            label: isPE ? 'PE' : 'R-PR', // R-PR for practical registration
            specialty: regSpec,
            theme: regTheme,
            subtheme: regSubtheme,
            scheduledDate: regDate,
            completedDate: regDate,
            score: score,
            questionsTotal: regQuestTotal,
            questionsCorrect: regQuestCorrect,
            durationMinutes: regMinutes,
            status: 'done',
            isHot: false,
            isSimuladoReal: false,
            rescheduleCount: 0,
            chainIndex: 0,
            reviewRule: regRule
        };

        let chain: ReviewEntry[] = [];

        if (regRule === R_RULES.DS30) {
            chain = TRIGGER_DS30.map((days, idx) => {
                const schedDate = addDays(regDate, days);
                return {
                    id: generateId(),
                    label: `R - ${idx + 1} `,
                    specialty: regSpec,
                    theme: regTheme,
                    subtheme: regSubtheme,
                    scheduledDate: schedDate,
                    status: calcStatus(schedDate),
                    isHot: false,
                    isSimuladoReal: false,
                    rescheduleCount: 0,
                    parentId: study.id,
                    chainIndex: idx + 1,
                    reviewRule: regRule
                };
            });
        } else {
            // Single next revision for other rules
            const nextDays = calcNextIntervalByRule(regRule, score, false, false, 0);
            const schedDate = addDays(regDate, nextDays);
            chain = [{
                id: generateId(),
                label: `R - 1`,
                specialty: regSpec,
                theme: regTheme,
                subtheme: regSubtheme,
                scheduledDate: schedDate,
                status: calcStatus(schedDate),
                isHot: false,
                isSimuladoReal: false,
                rescheduleCount: 0,
                parentId: study.id,
                chainIndex: 1,
                reviewRule: regRule
            }];
        }

        setReviews(prev => [...prev, study, ...chain]);
        setShowRegisterModal(false);

        // Reset form partially
        setRegTheme('');
        setRegSubtheme('');
        setRegQuestCorrect(15);
    };

    const handleDeleteExam = (id: string) => {
        setExams(prev => prev.filter(e => e.id !== id));
    };

    const [editingExamId, setEditingExamId] = useState<string | null>(null);

    const startEditingExam = (exam: ExamEntry) => {
        setEditingExamId(exam.id);
        setExamBanca(exam.banca);
        setExamAno(exam.ano);
        setExamScore(exam.score);
        setExamMinutes(exam.durationMinutes);
        setExamDate(exam.date);
        setExamErrors(exam.errorSubthemes);
        setShowRegisterExamModal(true);
    };

    const handleRegisterExam = () => {
        if (!examBanca) return;

        const examId = editingExamId || generateId();
        const examData: ExamEntry = {
            id: examId,
            banca: examBanca,
            ano: examAno,
            score: examScore,
            durationMinutes: examMinutes,
            date: examDate,
            errorSubthemes: examErrors
        };

        if (editingExamId) {
            setExams(prev => prev.map(e => e.id === editingExamId ? examData : e));
            setEditingExamId(null);
        } else {
            setExams(prev => [...prev, examData]);
            
            // Sync with global error notebook
            if (examErrors.length > 0) {
                const newErrors: ErrorEntry2[] = examErrors.map(sub => ({
                    id: generateId(),
                    specialty: regSpec || SPECIALTIES[0].name, // Fallback
                    topic: regTheme || 'Geral',
                    subtopic: sub,
                    origin: 'falta_contato', // Default origin for exam errors
                    date: examDate,
                    examId: examId
                }));
                setErrors(prev => [...newErrors, ...prev]);
            }
        }

        setShowRegisterExamModal(false);
        // Reset
        setExamBanca('');
        setExamAno(new Date().getFullYear());
        setExamScore(70);
        setExamMinutes(240);
        setExamErrors([]);
    };

    const addErrorSubtheme = (sub: string) => {
        if (!sub) return;
        const clean = sub.trim();
        if (clean && !examErrors.includes(clean)) {
            setExamErrors(prev => [...prev, clean]);

            if (!savedSubthemes.includes(clean)) {
                const updated = [clean, ...savedSubthemes];
                setSavedSubthemes(updated);
                saveSubthemes(updated);
            }
        }
    };

    const removeErrorSubtheme = (sub: string) => {
        setExamErrors(prev => prev.filter(s => s !== sub));
    };

    const handleCompleteReview = () => {
        if (!showCompleteModal) return;

        const updatedReview: ReviewEntry = {
            ...showCompleteModal,
            completedDate: todayStr,
            score: modalScore,
            questionsTotal: modalQuestTotal,
            questionsCorrect: modalQuestCorrect,
            durationMinutes: modalMinutes,
            status: 'done',
            isHot: modalIsHot,
            isSimuladoReal: modalIsSimulado,
        };

        // Calculate next review in chain
        const nextInterval = calcNextInterval(modalScore, modalIsHot, modalIsSimulado, showCompleteModal.rescheduleCount);
        const nextSched = addDays(todayStr, nextInterval);

        const nextReview: ReviewEntry = {
            id: generateId(),
            label: `R - ${showCompleteModal.chainIndex + 1} `,
            specialty: showCompleteModal.specialty,
            theme: showCompleteModal.theme,
            scheduledDate: nextSched,
            status: calcStatus(nextSched),
            isHot: modalIsHot,
            isSimuladoReal: false,
            rescheduleCount: 0,
            parentId: showCompleteModal.id,
            chainIndex: showCompleteModal.chainIndex + 1,
            reviewRule: showCompleteModal.reviewRule
        };

        setReviews(prev => prev.map(r => r.id === showCompleteModal.id ? updatedReview : r).concat(nextReview));
        setShowCompleteModal(null);
    };

    const handleReschedule = () => {
        if (!showRelocateModal) return;

        setReviews(prev => prev.map(r => {
            if (r.id === showRelocateModal.id) {
                return {
                    ...r,
                    scheduledDate: relocateDate,
                    rescheduleCount: r.rescheduleCount + 1,
                    status: calcStatus(relocateDate, r.completedDate)
                };
            }
            return r;
        }));
        setShowRelocateModal(null);
    };

    const handleDeleteReview = (id: string) => {
        setReviews(prev => prev.filter(r => r.id !== id));
        setShowCompleteModal(null);
        setShowRelocateModal(null);
    };

    const handleDeleteError = (id: string) => {
        setErrors(prev => prev.filter(e => e.id !== id));
    };

    const handleAddManualError = (err: Omit<ErrorEntry2, 'id' | 'date'>) => {
        const newError: ErrorEntry2 = {
            ...err,
            id: generateId(),
            date: todayStr
        };
        setErrors([newError, ...errors]);
    };

    const handleConvertErrorToFlashcard = (err: ErrorEntry2) => {
        const newCard: Flashcard = {
            id: generateId(),
            front: `Reforço: ${err.subtopic}`,
            back: err.notes || `Revisar ${err.topic} (${err.specialty})`,
            specialty: err.specialty,
            theme: err.topic,
            level: 'hard',
            nextReview: todayStr,
            box: 0
        };
        setFlashcards(prev => [newCard, ...prev]);
        setErrors(prev => prev.filter(e => e.id !== err.id));
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 font-sans">
            {/* Header / Hero Area */}
            <div className="flex flex-col md:flex-row gap-6 mb-12">
                {/* HERO: O que estudar agora */}
                <div className="flex-[2] glass-card rounded-[2.5rem] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Próximo Passo Proposto</h3>
                        </div>
                        
                        {overdue.length > 0 || todayReviews.length > 0 ? (
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-tight">
                                    {(overdue[0] || todayReviews[0]).theme}
                                </h2>
                                <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
                                    <span className="flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-full shadow-sm">
                                        <BookOpen size={14} className="text-emerald-500" />
                                        {(overdue[0] || todayReviews[0]).specialty}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-full shadow-sm">
                                        <Clock size={14} className="text-blue-500" />
                                        {(overdue[0] || todayReviews[0]).label}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setShowCompleteModal(overdue[0] || todayReviews[0])}
                                    className="mt-4 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-slate-200 flex items-center gap-3"
                                >
                                    Estudar Agora <ArrowRight size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="py-6">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tudo em dia! ✨</h2>
                                <p className="text-slate-500 font-medium mt-2">Você concluiu todas as revisões programadas.</p>
                                <button 
                                    onClick={() => setShowRegisterModal(true)}
                                    className="mt-6 border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all"
                                >
                                    Agendar Novo Estudo
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Prominent Index */}
                <div className="flex-1 glass-card rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Índice MedFlow</h3>
                    <div className="relative w-32 h-32 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="58" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                            <circle 
                                cx="64" cy="64" r="58" fill="none" stroke="#10b981" strokeWidth="8" 
                                strokeDasharray={364} 
                                strokeDashoffset={364 - (364 * weekAvg) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-800">{weekAvg}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">Sólido</p>
                </div>
            </div>

            {/* Sub-tabs Minimal */}
            <div className="flex bg-slate-100/50 backdrop-blur-sm p-1 rounded-2xl w-fit mb-12 shadow-inner mx-auto border border-white/40">
                <button
                    onClick={() => setActiveSubTab('painel')}
                    className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'painel' ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Painel
                </button>
                <button
                    onClick={() => setActiveSubTab('calendario')}
                    className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'calendario' ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Calendário
                </button>
                <button
                    onClick={() => setActiveSubTab('provas')}
                    className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'provas' ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Provas
                </button>
                <button
                    onClick={() => setActiveSubTab('erros')}
                    className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'erros' ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Erros
                </button>
                <button
                    onClick={() => setActiveSubTab('flashcards')}
                    className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'flashcards' ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Flashcards
                </button>
            </div>

            {activeSubTab === 'painel' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* Ações Pendentes - Accordion Style */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <Clock size={14} /> Ciclo de Revisão
                                </h3>
                                {(overdue.length > 3 || todayReviews.length > 3) && (
                                    <button className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Ver Tudo</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    {overdue.length > 0 ? overdue.slice(0, 3).map(r => (
                                        <div key={r.id} className="glass-card p-4 rounded-2xl flex items-center justify-between group/card hover:scale-[1.02] transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-8 bg-rose-500 rounded-full" />
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 line-clamp-1">{r.theme}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.label}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setShowCompleteModal(r)}
                                                className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all hover:bg-slate-900 hover:text-white"
                                            >
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                                            <p className="text-xs text-slate-300 font-bold italic">Nenhum atraso</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {todayReviews.length > 0 ? todayReviews.slice(0, 3).map(r => (
                                        <div key={r.id} className="glass-card p-4 rounded-2xl flex items-center justify-between group/card hover:scale-[1.02] transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 line-clamp-1">{r.theme}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.label}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setShowCompleteModal(r)}
                                                className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all hover:bg-slate-900 hover:text-white"
                                            >
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                                            <p className="text-xs text-slate-300 font-bold italic">Dia livre!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Progress / Stats Minimal */}
                        <div className="flex gap-6">
                            <div className="flex-1 glass-card p-6 rounded-3xl flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                                    <Clock3 size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Semanal</p>
                                    <p className="text-xl font-black text-slate-800">{weekHours}h</p>
                                </div>
                            </div>
                            <div className="flex-1 glass-card p-6 rounded-3xl flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                                    <Trophy size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média Questões</p>
                                    <p className="text-xl font-black text-slate-800">{weekAvg}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Analysis - Retractable or moved */}
                        <div className="glass-card rounded-[2.5rem] overflow-hidden">
                             <div 
                                className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/40 transition-colors"
                                onClick={() => setShowAnalytics(!showAnalytics)}
                            >
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <Activity size={14} /> Análise de Desempenho
                                </h3>
                                <div className="text-slate-400">
                                    {showAnalytics ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                            
                            {showAnalytics && (
                                <div className="p-8 border-t border-white/40">
                                    <PerformanceBySubthemeChart
                                        data={chartSubthemeData}
                                        chartSpec={chartSpec}
                                        chartTheme={chartTheme}
                                        onSpecChange={(s) => {
                                            setChartSpec(s);
                                            const firstTheme = SPECIALTIES.find(spec => spec.name === s)?.themes[0] || '';
                                            setChartTheme(firstTheme);
                                        }}
                                        onThemeChange={setChartTheme}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Area (Desktop only) */}
                    <div className="lg:col-span-4 space-y-8">
                         {/* Action Button Prominent */}
                         <button
                            onClick={() => setShowRegisterModal(true)}
                            className="w-full glass bg-white/80 hover:bg-white text-slate-900 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 group transition-all transform hover:-translate-y-2 border-none shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.8rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                <Zap size={28} />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-black tracking-tight">Registrar Estudo</p>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Alimentar Motor</p>
                            </div>
                        </button>

                        <div className="glass-card p-6 rounded-[2.5rem] space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Performance por Área</h3>
                            <div className="space-y-5">
                                {scoresBySpecialty.slice(0, 5).map(s => (
                                    <div key={s.name} className="group cursor-help relative">
                                        <div className="flex justify-between text-[10px] mb-2 font-black text-slate-500 uppercase tracking-widest pr-1">
                                            <span>{s.name}</span>
                                            <span className="text-slate-900">{s.avg}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${(s.avg || 0) >= 85 ? 'bg-emerald-500' : (s.avg || 0) >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${s.avg}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {activeSubTab === 'provas' && (
                <ExamsDashboard 
                    exams={exams} 
                    onAddExam={() => {
                        setEditingExamId(null);
                        setExamBanca('');
                        setExamErrors([]);
                        setShowRegisterExamModal(true);
                    }}
                    onEditExam={startEditingExam}
                    onDeleteExam={handleDeleteExam}
                />
            )}
            {activeSubTab === 'erros' && (
                <ErrorsDashboard
                    errors={errors}
                    onAddError={() => setShowRegisterErrorModal(true)}
                    onDeleteError={handleDeleteError}
                    onConvertToFlashcard={handleConvertErrorToFlashcard}
                />
            )}
            {activeSubTab === 'flashcards' && (
                <FlashcardsDashboard 
                    flashcards={flashcards} 
                    onAddCard={() => setShowAddFlashcardModal(true)} 
                    onStudyPending={() => startStudy('pending')} 
                    onStudyDifficult={() => startStudy('difficult')} 
                />
            )}

            {
                activeSubTab === 'calendario' && (
                    <div className="space-y-8">
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Calendário de Revisões</h3>
                                    <p className="text-xs text-slate-400 font-medium">Arraste revisões atrasadas para reagendar ou clique para concluir.</p>
                                </div>
                                <div className="flex flex-wrap gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300" /> PE</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Concluída</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Futura</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Atrasada</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-inner font-sans">
                                {['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'].map(d => (
                                    <div key={d} className="bg-slate-50/80 backdrop-blur-sm p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">{d}</div>
                                ))}
                                {Array.from({ length: 42 }).map((_, i) => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - d.getDay() + i);
                                    const dStr = toDateStr(d);
                                    const dayReviews = reviews.filter(r => r.scheduledDate === dStr);
                                    const isToday = dStr === todayStr;

                                    return (
                                        <div
                                            key={i}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => {
                                                if (draggedReviewId) {
                                                    const review = reviews.find(r => r.id === draggedReviewId);
                                                    if (review) {
                                                        setRelocateDate(dStr);
                                                        setShowRelocateModal(review);
                                                    }
                                                    setDraggedReviewId(null);
                                                }
                                            }}
                                            className={`bg-white min-h-[120px] p-1.5 flex flex-col gap-1.5 transition-all hover:bg-slate-50/80 group ${isToday ? 'bg-emerald-50/20' : ''}`}
                                        >
                                            <div className="flex justify-between items-start px-1 pt-0.5">
                                                <p className={`text-[10px] font-black ${isToday ? 'text-emerald-600' : 'text-slate-300 group-hover:text-slate-500'}`}>{d.getDate()}</p>
                                                {isToday && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                                            </div>

                                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-hide pr-0.5">
                                                {dayReviews.map(r => {
                                                    const status = r.label === 'PE' ? 'pe' : r.status;
                                                    const colorClasses =
                                                        status === 'pe' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                            status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                status === 'overdue' ? 'bg-rose-50 text-rose-600 border-rose-100 cursor-move' :
                                                                    'bg-blue-50 text-blue-600 border-blue-100';

                                                    return (
                                                        <div
                                                            key={r.id}
                                                            draggable={status === 'overdue'}
                                                            onDragStart={() => setDraggedReviewId(r.id)}
                                                            onClick={() => {
                                                                if (status === 'done') return;
                                                                if (status === 'overdue') {
                                                                    setRelocateDate(r.scheduledDate);
                                                                    setShowRelocateModal(r);
                                                                } else {
                                                                    setShowCompleteModal(r);
                                                                }
                                                            }}
                                                            className={`px-1.5 py-1 rounded-md text-[8px] font-black border uppercase tracking-tight flex items-center justify-between gap-1 shadow-sm transition-all hover:brightness-95 active:scale-95 ${colorClasses}`}
                                                        >
                                                            <span className="truncate">{r.label} | {r.theme}</span>
                                                            {r.isHot && <Flame size={8} className="fill-current shrink-0" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-inner"><Zap size={20} /></div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Carga de Estudo Ativa</h4>
                                    <p className="text-xl font-black text-slate-800">
                                        {reviews.filter(r => r.status !== 'done' && r.scheduledDate >= todayStr).length} revisões no horizonte
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1.5 h-10 items-end px-4">
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const count = reviews.filter(r => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + i);
                                        return r.scheduledDate === toDateStr(d) && r.status !== 'done';
                                    }).length;
                                    const height = Math.max(20, Math.min(100, count * 20));
                                    const color = count > 5 ? 'bg-rose-400' : count > 3 ? 'bg-amber-400' : 'bg-emerald-400';
                                    return <div key={i} className={`w-2.5 rounded-full ${color} opacity-80 shadow-sm`} title={`${count} revisões`} />;
                                })}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* MODAL DE CONCLUSÃO */}
            {
                showCompleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCompleteModal(null)} />
                        <div className="relative bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mb-2 inline-block tracking-widest">{showCompleteModal.label}</span>
                                    <h3 className="text-xl font-black text-slate-800 leading-tight">{showCompleteModal.theme}</h3>
                                </div>
                                <button
                                    onClick={() => handleDeleteReview(showCompleteModal.id)}
                                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                    title="Excluir revisão"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 mb-8">
                                <div className="md:col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Desempenho na Sessão</h4>
                                        <span className="text-xl font-black text-emerald-600">
                                            {modalQuestTotal > 0 ? Math.round((modalQuestCorrect / modalQuestTotal) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <label className="block text-[9px] font-bold text-slate-400 mb-1">Questões Totais</label>
                                            <input
                                                type="number"
                                                value={modalQuestTotal}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    setModalQuestTotal(val);
                                                    if (val > 0) setModalScore(Math.round((modalQuestCorrect / val) * 100));
                                                }}
                                                className="w-full border-none p-0 text-lg font-black text-slate-700 focus:ring-0"
                                            />
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <label className="block text-[9px] font-bold text-slate-400 mb-1">Acertos</label>
                                            <input
                                                type="number"
                                                value={modalQuestCorrect}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    setModalQuestCorrect(val);
                                                    if (modalQuestTotal > 0) setModalScore(Math.round((val / modalQuestTotal) * 100));
                                                }}
                                                className="w-full border-none p-0 text-lg font-black text-emerald-600 focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Tempo (min)</label>
                                        <input type="number" value={modalMinutes} onChange={(e) => setModalMinutes(Number(e.target.value))} className="w-full bg-white border-none rounded-xl px-3 py-2 font-bold text-center shadow-sm focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => setModalIsHot(!modalIsHot)} className={`flex-1 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${modalIsHot ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                                            <Flame size={14} /> Quente 🔥
                                        </button>
                                        <button onClick={() => setModalIsSimulado(!modalIsSimulado)} className={`flex-1 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${modalIsSimulado ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                                            <Zap size={14} /> Simulado Real
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowCompleteModal(null)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                                <button onClick={handleCompleteReview} className="flex-[2] py-4 bg-emerald-600 rounded-2xl text-white font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all transform hover:-translate-y-1">SALVAR RESULTADO</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL DE REAGENDAMENTO */}
            {
                showRelocateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRelocateModal(null)} />
                        <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <CalendarIcon size={32} />
                                </div>
                                <button
                                    onClick={() => handleDeleteReview(showRelocateModal.id)}
                                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                    title="Excluir revisão"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-black text-slate-800">Reagendar Estudo</h3>
                                <p className="text-sm text-slate-400 font-medium mt-1">Escolha uma nova data para {showRelocateModal.theme}</p>
                            </div>

                            <div className="space-y-6 mb-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-1">Nova Data Programada</label>
                                    <input
                                        type="date"
                                        value={relocateDate}
                                        onChange={(e) => setRelocateDate(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 shadow-inner"
                                    />
                                </div>
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                    <AlertCircle size={18} className="text-amber-500 shrink-0" />
                                    <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                        Atenção: Reagendamentos frequentes podem afetar a eficácia do motor de memorização. Tente manter o ritmo original sempre que possível!
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleReschedule}
                                    className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all transform hover:-translate-y-1 active:scale-95"
                                >
                                    CONFIRMAR NOVO HORÁRIO
                                </button>
                                <button
                                    onClick={() => setShowRelocateModal(null)}
                                    className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                                >
                                    Voltar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <RegisterErrorModal 
                isOpen={showRegisterErrorModal}
                onClose={() => setShowRegisterErrorModal(false)}
                onConfirm={handleAddManualError}
            />

            {/* MODAL DE REGISTRO DE ESTUDO */}
            {
                showRegisterModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)} />
                        <div className="relative bg-white rounded-[2.5rem] p-4 md:p-10 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                        <Zap size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Registrar Estudo</h3>
                                        <p className="text-sm text-slate-400 font-medium">Cadastre seu estudo e gere suas revisões.</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowRegisterModal(false)} className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                                    <AlertCircle size={24} />
                                </button>
                            </div>

                            <div className="mb-6 flex items-center justify-between px-2">
                                <div className="flex gap-2">
                                    {[1, 2, 3].map(s => (
                                        <div 
                                            key={s} 
                                            className={`h-1.5 rounded-full transition-all duration-300 ${s === regStep ? 'w-8 bg-blue-600' : 'w-4 bg-slate-100'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Etapa {regStep} de 3</span>
                            </div>

                            <div className="min-h-[300px]">
                                {regStep === 1 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 px-1">Especialidade</label>
                                                <select
                                                    value={regSpec}
                                                    onChange={(e) => { setRegSpec(e.target.value); setRegTheme(''); }}
                                                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-inner"
                                                >
                                                    {SPECIALTIES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 px-1">Tema</label>
                                                <select
                                                    value={regTheme}
                                                    onChange={(e) => setRegTheme(e.target.value)}
                                                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-inner"
                                                >
                                                    <option value="">Selecione o tema...</option>
                                                    {SPECIALTIES.find(s => s.name === regSpec)?.themes.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 px-1 flex justify-between">
                                                Subtema (Opcional)
                                                {savedSubthemes.length > 0 && <span className="text-[9px] text-blue-500">Auto-complete ativo</span>}
                                            </label>
                                            <input
                                                type="text"
                                                list="subthemes-list"
                                                value={regSubtheme}
                                                onChange={(e) => setRegSubtheme(e.target.value)}
                                                placeholder="Ex: Abdômen agudo obstrutivo"
                                                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 shadow-inner"
                                            />
                                            <datalist id="subthemes-list">
                                                {savedSubthemes.map(s => <option key={s} value={s} />)}
                                            </datalist>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 px-1">Data</label>
                                                <input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold shadow-inner" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 px-1">Tipo de Estudo</label>
                                                <div className="flex p-1 bg-slate-100 rounded-2xl">
                                                    <button
                                                        onClick={() => setRegType('theoretical')}
                                                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all ${regType === 'theoretical' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        Teórico
                                                    </button>
                                                    <button
                                                        onClick={() => setRegType('practical')}
                                                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all ${regType === 'practical' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        Prático
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {regStep === 2 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Desempenho Geral</h4>
                                            <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                                {regQuestTotal > 0 ? Math.round((regQuestCorrect / regQuestTotal) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Totais</label>
                                                <input type="number" value={regQuestTotal} onChange={(e) => setRegQuestTotal(Number(e.target.value))} className="w-full border-none p-0 text-3xl font-black text-slate-400 focus:ring-0" />
                                            </div>
                                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Acertos</label>
                                                <input type="number" value={regQuestCorrect} onChange={(e) => setRegQuestCorrect(Number(e.target.value))} className="w-full border-none p-0 text-3xl font-black text-emerald-600 focus:ring-0" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 px-1">Tempo (Minutos)</label>
                                            <input type="number" value={regMinutes} onChange={(e) => setRegMinutes(Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-xl font-black shadow-inner" />
                                        </div>
                                    </div>
                                )}

                                {regStep === 3 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
                                            <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">Resumo do Algoritmo</h4>
                                            <p className="text-xs text-blue-900 font-medium leading-relaxed">
                                                Com base no seu desempenho de <strong>{regQuestTotal > 0 ? Math.round((regQuestCorrect / regQuestTotal) * 100) : 0}%</strong>, o sistema sugere um intervalo de <strong>{regQuestTotal > 0 && Math.round((regQuestCorrect / regQuestTotal) * 100) >= 85 ? '25' : (regQuestTotal > 0 && Math.round((regQuestCorrect / regQuestTotal) * 100) >= 70 ? '10' : '3')} dias</strong>.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 px-1">Modelo de Revisão</label>
                                            <div className="space-y-3">
                                                {[
                                                    { id: R_RULES.ACERTOS, label: 'MedFlow (Baseado em Performance)', desc: 'Recomendado para maximizar retenção.' },
                                                    { id: R_RULES.DS30, label: 'Clássico DS30', desc: 'D+1, D+7, D+30 fixo.' },
                                                    { id: R_RULES.DIARIA, label: 'Diária', desc: 'Sempre no próximo dia.' }
                                                ].map(rule => (
                                                    <button
                                                        key={rule.id}
                                                        onClick={() => setRegRule(rule.id as ReviewRule)}
                                                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${regRule === rule.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-50 hover:border-slate-100 bg-slate-50/50'}`}
                                                    >
                                                        <p className="text-xs font-black text-slate-800">{rule.label}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{rule.desc}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 mt-10">
                                {regStep > 1 && (
                                    <button 
                                        onClick={() => setRegStep(regStep - 1)}
                                        className="flex-1 py-4 border-2 border-slate-100 text-slate-400 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]"
                                    >
                                        Voltar
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (regStep < 3) setRegStep(regStep + 1);
                                        else handleRegisterStudy();
                                    }}
                                    disabled={regStep === 1 && (!regSpec || !regTheme)}
                                    className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-200 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                                >
                                    {regStep < 3 ? 'Próximo Passo' : 'Finalizar Registro'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL REGISTRAR SIMULADO */}
            {
                showRegisterExamModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRegisterExamModal(false)} />
                        <div className="relative bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-slate-800">Registrar Simulado</h3>
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <Plus size={24} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Banca / Prova</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: PSU-MG, USP-SP..."
                                            value={examBanca}
                                            onChange={(e) => setExamBanca(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Ano</label>
                                            <input
                                                type="number"
                                                value={examAno}
                                                onChange={(e) => setExamAno(parseInt(e.target.value) || 0)}
                                                onFocus={(e) => e.target.select()}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Score (%)</label>
                                            <input
                                                type="number"
                                                value={examScore}
                                                onChange={(e) => setExamScore(parseInt(e.target.value) || 0)}
                                                onFocus={(e) => e.target.select()}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-indigo-600 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Tempo Gasto (min)</label>
                                        <input
                                            type="number"
                                            value={examMinutes}
                                            onChange={(e) => setExamMinutes(parseInt(e.target.value) || 0)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 text-rose-500">Mapear Erros (Subtemas)</label>
                                        <div className="flex flex-col gap-3 mb-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    value={examErrorSpec}
                                                    onChange={(e) => setExamErrorSpec(e.target.value)}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-xs font-bold focus:border-rose-400 outline-none appearance-none cursor-pointer shadow-sm"
                                                >
                                                    {SPECIALTIES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                </select>
                                                <select
                                                    value={tempError}
                                                    onChange={(e) => setTempError(e.target.value)}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-xs font-bold focus:border-rose-400 outline-none appearance-none cursor-pointer shadow-sm"
                                                >
                                                    <option value="">Selecione o Tema...</option>
                                                    {SPECIALTIES.find(s => s.name === examErrorSpec)?.themes.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (tempError && !examErrors.includes(tempError)) {
                                                        addErrorSubtheme(tempError);
                                                        setTempError('');
                                                    }
                                                }}
                                                disabled={!tempError}
                                                className="w-full bg-rose-500 text-white py-3 rounded-2xl font-black text-[10px] tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} /> ADICIONAR ERRO
                                            </button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto flex flex-wrap gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                                            {examErrors.map(sub => (
                                                <div key={sub} className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 group shadow-sm">
                                                    {sub}
                                                    <button onClick={() => removeErrorSubtheme(sub)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {examErrors.length === 0 && (
                                                <p className="text-[10px] text-slate-400 font-bold italic p-4 text-center w-full">Clique nas erradas para mapear</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setShowRegisterExamModal(false)} className="flex-1 py-5 text-slate-400 font-black tracking-widest hover:text-slate-600 transition-colors">CANCELAR</button>
                                <button
                                    onClick={handleRegisterExam}
                                    className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-xl shadow-indigo-100 transition-all transform hover:-translate-y-1 active:scale-95"
                                >
                                    SALVAR RESULTADOS
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* FLASHCARD MODAL */}
            {showAddFlashcardModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Novo Flashcard</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Memorização Ativa</p>
                            </div>
                            <button onClick={() => setShowAddFlashcardModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-slate-50 transition-all text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Especialidade</label>
                                    <select
                                        value={fcSpec}
                                        onChange={(e) => setFcSpec(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                    >
                                        {SPECIALTIES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Tema</label>
                                    <input
                                        type="text"
                                        value={fcTheme}
                                        onChange={(e) => setFcTheme(e.target.value)}
                                        placeholder="Ex: SEPSE"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Frente (Pergunta)</label>
                                    <textarea
                                        value={fcFront}
                                        onChange={(e) => setFcFront(e.target.value)}
                                        placeholder="O que é..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none min-h-[100px] resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Verso (Resposta)</label>
                                    <textarea
                                        value={fcBack}
                                        onChange={(e) => setFcBack(e.target.value)}
                                        placeholder="É definido por..."
                                        className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none min-h-[100px] resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 flex gap-4">
                            <button onClick={() => setShowAddFlashcardModal(false)} className="flex-1 py-5 text-slate-400 font-black tracking-widest hover:text-slate-600 transition-colors uppercase text-xs">Descartar</button>
                            <button
                                onClick={handleAddFlashcard}
                                className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-xl shadow-indigo-100 transition-all transform hover:-translate-y-1 active:scale-95 uppercase text-xs tracking-widest"
                            >
                                Criar Flashcard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FLASHCARD STUDY MODAL */}
            {studyingCards && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[4rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/50 flex flex-col aspect-[4/3] animate-in zoom-in-95 duration-300 items-center justify-center relative p-12">
                        <button onClick={() => setStudyingCards(null)} className="absolute top-8 right-8 w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                            <X size={20} />
                        </button>

                        <div className="absolute top-12 left-12 flex items-center gap-2 text-xs">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full font-black uppercase tracking-widest">{studyingCards[currentFcIndex].specialty}</span>
                            <span className="font-bold text-slate-300">{currentFcIndex + 1} / {studyingCards.length}</span>
                        </div>

                        <div className="w-full h-full flex flex-col items-center justify-center text-center">
                            {!showFcBack ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-3xl font-black text-slate-800 leading-tight max-w-md">{studyingCards[currentFcIndex].front}</h2>
                                    <button 
                                        onClick={() => setShowFcBack(true)}
                                        className="mt-8 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200"
                                    >
                                        VER RESPOSTA
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-12 animate-in flip-in-y duration-500 w-full">
                                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                                        <p className="text-xl font-bold text-slate-600 leading-relaxed">{studyingCards[currentFcIndex].back}</p>
                                    </div>
                                    
                                    <div className="flex justify-center gap-4">
                                        {[
                                            { id: 'hard', label: 'Difícil', color: 'bg-rose-500 shadow-rose-100', icon: <X size={16} /> },
                                            { id: 'medium', label: 'Bom', color: 'bg-amber-500 shadow-amber-100', icon: <Check size={16} /> },
                                            { id: 'easy', label: 'Fácil', color: 'bg-emerald-500 shadow-emerald-100', icon: <CheckCircle2 size={16} /> }
                                        ].map(btn => (
                                            <button
                                                key={btn.id}
                                                onClick={() => handleFcResult(btn.id as any)}
                                                className={`${btn.color} text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all outline-none`}
                                            >
                                                {btn.icon} {btn.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ReviewCard({ review, onComplete, variant }: { review: ReviewEntry, onComplete: () => void, variant: 'red' | 'blue', key?: string | number }) {
    const isRed = variant === 'red';
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 group hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${isRed ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                            {review.label}
                        </span>
                        {review.isHot && <Flame size={12} className="text-amber-500 fill-amber-500" />}
                    </div>
                    <h4 className="text-slate-800 font-bold text-sm truncate leading-tight mb-0.5">{review.theme}</h4>
                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-tight">{review.specialty}</p>
                </div>
                <button
                    onClick={onComplete}
                    className={`p-2 rounded-lg transition-all ${isRed ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-emerald-500 text-white shadow-emerald-200'} shadow-lg hover:scale-105 active:scale-95`}
                >
                    <CheckCircle2 size={18} />
                </button>
            </div>
        </div>
    );
}
