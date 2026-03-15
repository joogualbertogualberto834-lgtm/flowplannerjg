import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Target, Check, ArrowRight, ArrowLeft,
    Calendar, Award, Heart, ShieldCheck,
    Zap, Clock, Moon, Dumbbell, Sparkles,
    ChevronRight, Info
} from 'lucide-react';
import { saveExam, addPersonalGoal } from '../services/api';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SetupWizardProps {
    onComplete: () => Promise<void>;
    onSkip: () => void;
}

const PRESET_EXAMS = [
    {
        id: 'enare',
        name: 'ENARE 2026',
        estimatedDate: '2026-10-18',
        description: 'Maior seletivo do país — 198 instituições, 7mil+ vagas',
        type: 'prova_integra' as const,
        note: 'Data estimada baseada no histórico. Confirme no edital oficial (ebserh.gov.br)'
    },
    {
        id: 'psu-mg',
        name: 'PSU-MG 2026',
        estimatedDate: '2026-11-29',
        description: 'Maior seletivo de MG — 70+ instituições, 1.350+ vagas',
        type: 'prova_integra' as const,
        note: 'Data estimada baseada no histórico. Confirme no edital oficial (aremg.org.br)'
    },
    {
        id: 'sus-sp',
        name: 'SUS-SP 2026',
        estimatedDate: '2026-12-13',
        description: 'Maior seletivo de SP — 50+ instituições, 1.400+ vagas',
        type: 'prova_integra' as const,
        note: 'Data estimada baseada no histórico. Confirme no edital oficial (vunesp.com.br)'
    },
    {
        id: 'hcfmusp',
        name: 'HC-FMUSP 2026',
        estimatedDate: '2026-11-08',
        description: 'Uma das mais concorridas do Brasil',
        type: 'prova_integra' as const,
        note: 'Data estimada. Confirme no edital oficial'
    },
    {
        id: 'revalida',
        name: 'Revalida 2026',
        estimatedDate: '2026-09-13',
        description: 'Revalidação de diploma estrangeiro',
        type: 'prova_integra' as const,
        note: 'Data estimada. Confirme no edital oficial (revalida.inep.gov.br)'
    },
    {
        id: 'custom',
        name: 'Outra prova',
        estimatedDate: '',
        description: 'Digitar nome e data manualmente',
        type: 'simulado' as const,
        note: ''
    }
];

const PREP_LEVELS = [
    {
        id: 1,
        icon: <Sparkles className="text-emerald-500" />,
        title: "Estou começando agora",
        detail: "Meta inicial: 50 questões/sem",
        target: 50
    },
    {
        id: 2,
        icon: <Award className="text-blue-500" />,
        title: "Menos de 3 meses",
        detail: "Meta inicial: 100 questões/sem",
        target: 100
    },
    {
        id: 3,
        icon: <Zap className="text-amber-500" />,
        title: "3 a 6 meses",
        detail: "Meta inicial: 200 questões/sem",
        target: 200
    },
    {
        id: 4,
        icon: <ShieldCheck className="text-purple-500" />,
        title: "Mais de 6 meses",
        detail: "Meta inicial: 300 questões/sem",
        target: 300
    }
];

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onSkip }) => {
    const [step, setStep] = useState(1);
    const [selectedExams, setSelectedExams] = useState<string[]>([]);
    const [customExams, setCustomExams] = useState<{ name: string, date: string }[]>([]);
    const [prepLevel, setPrepLevel] = useState<number | null>(null);
    const [sleepHours, setSleepHours] = useState(7);
    const [exerciseDays, setExerciseDays] = useState(3);
    const [isSaving, setIsSaving] = useState(false);

    const totalSteps = 5;

    const handleNext = () => step < totalSteps && setStep(s => s + 1);
    const handleBack = () => step > 1 && setStep(s => s - 1);

    const handleFinish = async () => {
        setIsSaving(true);
        try {
            // 1. Save Exams
            for (const examId of selectedExams) {
                if (examId === 'custom') {
                    for (const custom of customExams) {
                        if (custom.name && custom.date) {
                            await saveExam({
                                name: custom.name,
                                date: custom.date,
                                type: 'simulado',
                                specialties: [],
                                notes: null
                            });
                        }
                    }
                } else {
                    const preset = PRESET_EXAMS.find(p => p.id === examId);
                    if (preset) {
                        await saveExam({
                            name: preset.name,
                            date: preset.estimatedDate,
                            type: preset.id === 'custom' ? 'simulado' : 'prova_integra',
                            specialties: [],
                            notes: preset.note || null
                        });
                    }
                }
            }

            // 2. Weekly Questions Goal
            if (prepLevel) {
                const selectedLevel = PREP_LEVELS.find(l => l.id === prepLevel);
                if (selectedLevel) {
                    await addPersonalGoal({
                        category: 'estudo',
                        title: 'Questões semanais',
                        unit: 'questões',
                        target_value: selectedLevel.target
                    });
                }
            }

            // 3. Sleep Goal
            await addPersonalGoal({
                category: 'saude',
                title: 'Sono por noite',
                unit: 'horas',
                target_value: sleepHours
            });

            // 4. Exercise Goal
            if (exerciseDays > 0) {
                await addPersonalGoal({
                    category: 'exercicio',
                    title: 'Exercícios na semana',
                    unit: 'sessões',
                    target_value: exerciseDays
                });
            }

            localStorage.setItem('medflow_wizard_done', 'true');
            await onComplete();
        } catch (error) {
            console.error('Error saving setup:', error);
            alert('Ocorreu um erro ao salvar as configurações. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderProgress = () => (
        <div className="flex items-center justify-center gap-4 mb-12">
            {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${step > s ? 'bg-emerald-500 text-white' :
                            step === s ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-lg' :
                                'bg-slate-200 text-slate-400'
                        }`}>
                        {step > s ? <Check size={16} strokeWidth={3} /> : s}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${step === s ? 'text-emerald-700' : 'text-slate-400'
                        }`}>
                        Passo {s}
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-50 overflow-y-auto">
            <div className="min-h-screen container mx-auto px-4 py-12 max-w-4xl">
                {renderProgress()}

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center text-center py-8"
                        >
                            <div className="w-20 h-20 bg-emerald-600 rounded-[28px] flex items-center justify-center mb-8 shadow-xl shadow-emerald-200">
                                <Target size={40} className="text-white" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                                Vamos configurar seu MedFlow
                            </h1>
                            <p className="text-xl text-slate-600 mb-12 max-w-2xl leading-relaxed font-medium">
                                5 minutos agora vão te economizar horas de planejamento.
                                Ao final, o sistema já sabe exatamente o que você precisa fazer hoje.
                            </p>

                            <div className="grid md:grid-cols-2 gap-4 w-full max-w-2xl mb-12">
                                {[
                                    { icon: <Clock className="text-emerald-500" />, text: "Suas provas com contagem regressiva" },
                                    { icon: <Award className="text-blue-500" />, text: "Meta diária calculada automaticamente" },
                                    { icon: <Heart className="text-rose-500" />, text: "Mentor te orientando todo dia" },
                                    { icon: <ShieldCheck className="text-indigo-500" />, text: "Revisão espaçada baseada em evidência" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-left">
                                        <div className="shrink-0 w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                                            {item.icon}
                                        </div>
                                        <span className="font-bold text-slate-700">{item.text}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleNext}
                                className="group flex items-center gap-3 bg-emerald-600 text-white px-10 py-5 rounded-3xl font-black text-xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                            >
                                Começar configuração
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="py-4"
                        >
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-slate-900 mb-3">Quais provas você vai fazer?</h2>
                                <p className="text-slate-500 font-medium">Selecione todas que planeja realizar em 2026.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-10">
                                {PRESET_EXAMS.map((exam) => {
                                    const isSelected = selectedExams.includes(exam.id);
                                    return (
                                        <div
                                            key={exam.id}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedExams(selectedExams.filter(id => id !== exam.id));
                                                } else {
                                                    setSelectedExams([...selectedExams, exam.id]);
                                                }
                                            }}
                                            className={`cursor-pointer group p-6 rounded-[32px] border-2 transition-all relative overflow-hidden ${isSelected
                                                    ? 'border-emerald-500 bg-emerald-50/50 shadow-lg'
                                                    : 'border-slate-100 bg-white hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-3 rounded-2xl transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                                                    <Calendar size={20} />
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent'
                                                    }`}>
                                                    <Check size={14} strokeWidth={4} />
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 mb-1">{exam.name}</h3>
                                            <p className="text-xs font-bold text-slate-400 mb-3">
                                                {exam.estimatedDate ? `${format(parseISO(exam.estimatedDate), 'dd MMM yyyy', { locale: ptBR })} — estimado` : 'Personalize sua prova'}
                                            </p>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                                {exam.description}
                                            </p>

                                            {exam.id === 'custom' && isSelected && (
                                                <div className="mt-6 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        placeholder="Nome da prova"
                                                        className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none w-full"
                                                        value={customExams[0]?.name || ''}
                                                        onChange={e => setCustomExams([{ ...customExams[0], name: e.target.value }])}
                                                    />
                                                    <input
                                                        type="date"
                                                        className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-emerald-500 outline-none w-full"
                                                        value={customExams[0]?.date || ''}
                                                        onChange={e => setCustomExams([{ ...customExams[0], date: e.target.value }])}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-3 justify-center mb-10 text-slate-400">
                                <Info size={16} />
                                <p className="text-xs font-bold">⚠️ Datas estimadas baseadas no histórico. Confirme os editais oficiais quando publicados.</p>
                            </div>

                            <div className="flex justify-between items-center gap-4">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all"
                                >
                                    <ArrowLeft size={20} />
                                    Voltar
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={selectedExams.length === 0}
                                    className="flex items-center gap-3 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-3xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                                >
                                    Próximo
                                    <ArrowRight />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="py-4"
                        >
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-slate-900 mb-3">Há quanto tempo você estuda?</h2>
                                <p className="text-slate-500 font-medium">Isso define sua meta inicial de questões.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {PREP_LEVELS.map((level) => (
                                    <div
                                        key={level.id}
                                        onClick={() => setPrepLevel(level.id)}
                                        className={`cursor-pointer group flex items-center gap-6 p-6 rounded-[32px] border-2 transition-all ${prepLevel === level.id
                                                ? 'border-emerald-500 bg-emerald-50/50 shadow-lg scale-[1.02]'
                                                : 'border-slate-100 bg-white hover:border-slate-300'
                                            }`}
                                    >
                                        <div className={`w-16 h-16 shrink-0 rounded-[24px] flex items-center justify-center text-2xl transition-all ${prepLevel === level.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 group-hover:bg-slate-100'
                                            }`}>
                                            {level.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 mb-1">{level.title}</h3>
                                            <p className="text-sm font-bold text-slate-400">{level.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="text-center mb-10">
                                <p className="text-xs font-bold text-slate-400">
                                    Você pode ajustar sua meta a qualquer momento em <strong>Desempenho → Metas Pessoais</strong>
                                </p>
                            </div>

                            <div className="flex justify-between items-center gap-4">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all"
                                >
                                    <ArrowLeft size={20} />
                                    Voltar
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!prepLevel}
                                    className="flex items-center gap-3 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-3xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                                >
                                    Próximo
                                    <ArrowRight />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="py-4"
                        >
                            <div className="text-center mb-12">
                                <h2 className="text-3xl font-black text-slate-900 mb-3">Metas de saúde</h2>
                                <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                                    O sistema usa isso para calcular se seu ritmo é sustentável e o impacto do sono no desempenho.
                                </p>
                            </div>

                            <div className="flex flex-col gap-16 max-w-xl mx-auto mb-16">
                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                                            <Moon size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800">Horas de sono por noite</h4>
                                            <p className="text-sm font-bold text-slate-400">Quanto você pretende dormir idealmente?</p>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="10"
                                        step="1"
                                        value={sleepHours}
                                        onChange={(e) => setSleepHours(parseInt(e.target.value))}
                                        className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500 mb-6"
                                    />
                                    <div className="text-center">
                                        <span className="text-4xl font-black text-emerald-600">{sleepHours} horas</span>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                                            <Dumbbell size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800">Exercícios por semana</h4>
                                            <p className="text-sm font-bold text-slate-400">Quantas vezes pretende treinar na semana?</p>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="7"
                                        step="1"
                                        value={exerciseDays}
                                        onChange={(e) => setExerciseDays(parseInt(e.target.value))}
                                        className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500 mb-6"
                                    />
                                    <div className="text-center">
                                        <span className="text-4xl font-black text-emerald-600">{exerciseDays} vezes</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center gap-4">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all"
                                >
                                    <ArrowLeft size={20} />
                                    Voltar
                                </button>
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleNext}
                                        className="px-6 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-100 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Pular por agora
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-3 bg-emerald-600 text-white px-10 py-4 rounded-3xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                                    >
                                        Próximo
                                        <ArrowRight />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div
                            key="step5"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="py-4"
                        >
                            <div className="text-center mb-10">
                                <div className="inline-block p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                                    <Check size={32} strokeWidth={3} />
                                </div>
                                <h2 className="text-4xl font-black text-slate-900 mb-3">Tudo configurado! 🎉</h2>
                                <p className="text-slate-500 font-medium">Veja o resumo do seu planejamento.</p>
                            </div>

                            <div className="bg-white rounded-[48px] p-8 md:p-12 shadow-xl border border-slate-50 mb-10">
                                <div className="grid md:grid-cols-2 gap-12">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Suas Provas</h4>
                                        <div className="space-y-6">
                                            {selectedExams.map((examId) => {
                                                const exam = examId === 'custom' ? customExams[0] : PRESET_EXAMS.find(p => p.id === examId);
                                                if (!exam) return null;

                                                const daysRemaining = exam.estimatedDate || (examId === 'custom' && (exam as any).date)
                                                    ? differenceInDays(parseISO(exam.estimatedDate || (exam as any).date), new Date())
                                                    : 0;

                                                return (
                                                    <div key={examId} className="group">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-black text-slate-800">{exam.name}</span>
                                                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                                                                {daysRemaining} dias
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <Clock size={12} className="text-slate-300" />
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {exam.estimatedDate || (exam as any).date ? format(parseISO(exam.estimatedDate || (exam as any).date), 'dd MMMM yyyy', { locale: ptBR }) : '-'}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-400 group-hover:bg-emerald-500 transition-colors" style={{ width: '15%' }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Sua Meta</h4>
                                        <div className="bg-slate-50 rounded-3xl p-6 mb-6">
                                            <div className="flex items-end gap-3 mb-2">
                                                <span className="text-5xl font-black text-slate-800">
                                                    {PREP_LEVELS.find(l => l.id === prepLevel)?.target}
                                                </span>
                                                <span className="text-sm font-black text-slate-400 mb-1">questões / semana</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 italic">
                                                = {Math.ceil((PREP_LEVELS.find(l => l.id === prepLevel)?.target || 0) / 7)} questões por dia
                                            </p>
                                        </div>

                                        <div className="flex items-start gap-4 p-5 bg-emerald-50 rounded-3xl border border-emerald-100">
                                            <div className="w-10 h-10 shrink-0 bg-emerald-500 text-white rounded-2xl flex items-center justify-center">
                                                <Zap size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                                                    "Você está começando agora, com {
                                                        Math.min(...selectedExams.map(id => {
                                                            const exam = id === 'custom' ? customExams[0] : PRESET_EXAMS.find(p => p.id === id);
                                                            if (!exam || !(exam.estimatedDate || (exam as any).date)) return 365;
                                                            return differenceInDays(parseISO(exam.estimatedDate || (exam as any).date), new Date());
                                                        }))
                                                    } dias até a primeira prova. O caminho ideal é aumentar o volume gradualmente: chegue à reta final com 400+ questões/semana."
                                                </p>
                                                <p className="text-[10px] font-black text-emerald-600 mt-2 uppercase tracking-widest">Dica do Mentor</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-6">
                                <button
                                    onClick={handleFinish}
                                    disabled={isSaving}
                                    className="w-full md:w-auto min-w-[320px] group flex items-center justify-center gap-3 bg-emerald-600 text-white px-10 py-6 rounded-[32px] font-black text-xl shadow-2xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                                >
                                    {isSaving ? 'Salvando...' : 'Ir para o Dashboard →'}
                                </button>
                                <button
                                    onClick={handleBack}
                                    disabled={isSaving}
                                    className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
                                >
                                    ← Voltar e ajustar algo
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
