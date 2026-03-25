import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, HelpCircle, ChevronRight, CheckCircle2, ChevronDown } from 'lucide-react';

interface Flashcard {
    id: string;
    front: string;
    back: string;
    nextReview: string;
    box: number;
    level?: string;
    specialty?: string;
    theme?: string;
}

interface ReviewEntry {
    id: string;
    scheduledDate: string;
    completedDate?: string;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

export function Mentor2() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [showDoubt, setShowDoubt] = useState(false);
    
    // Stats
    const [overdueCards, setOverdueCards] = useState(0);
    const [overdueReviews, setOverdueReviews] = useState(0);

    // Initialization
    useEffect(() => {
        const todayStr = getTodayStr();
        const savedState = localStorage.getItem('mentor_daily_log');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.date === todayStr) {
                    if (parsed.step > 6) {
                        setCurrentStep(7); // Completed
                    } else {
                        setCurrentStep(parsed.step);
                    }
                } else {
                    // Reset for a new day
                    setCurrentStep(1);
                    localStorage.setItem('mentor_daily_log', JSON.stringify({ date: todayStr, step: 1 }));
                }
            } catch (e) {
                setCurrentStep(1);
            }
        } else {
            setCurrentStep(1);
            localStorage.setItem('mentor_daily_log', JSON.stringify({ date: todayStr, step: 1 }));
        }

        // Load stats and User Profile
        const loadStats = () => {
            try {
                // Profile level
                const prefsRaw = localStorage.getItem('medflow2_user_prefs');
                let isAdvanced = false;
                if (prefsRaw) {
                    const prefs = JSON.parse(prefsRaw);
                    if (prefs.prepLevel && prefs.prepLevel.includes('Mais de 6 meses')) {
                        isAdvanced = true;
                    }
                }
                
                const cardsRaw = localStorage.getItem('medflow2_flashcards');
                if (cardsRaw) {
                    const cards: Flashcard[] = JSON.parse(cardsRaw);
                    const overdue = cards.filter(c => c.nextReview <= todayStr && c.box <= 1).length;
                    setOverdueCards(overdue);
                }

                const reviewsRaw = localStorage.getItem('medflow2_reviews');
                if (reviewsRaw) {
                    const reviews: ReviewEntry[] = JSON.parse(reviewsRaw);
                    const overdue = reviews.filter(r => r.scheduledDate < todayStr && !r.completedDate).length;
                    setOverdueReviews(overdue);
                }
                
                return isAdvanced;
            } catch (e) { return false; }
        };
        
        const isAdv = loadStats();
        // We can store isAdvanced in a ref or state if needed inside the step text.
        
        loadStats();
        const interval = setInterval(loadStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const advanceStep = (skipToStep?: number) => {
        const next = skipToStep || currentStep + 1;
        setCurrentStep(next);
        setShowDoubt(false);
        localStorage.setItem('mentor_daily_log', JSON.stringify({
            date: getTodayStr(),
            step: next
        }));
    };

    const handleAcatar1 = () => advanceStep(overdueReviews > 0 ? 2 : 3);
    const handlePular1 = () => advanceStep(overdueReviews > 0 ? 2 : 3);
    
    const getPrepLevelText = () => {
        try {
            const prefs = JSON.parse(localStorage.getItem('medflow2_user_prefs') || '{}');
            const isAdv = prefs.prepLevel && prefs.prepLevel.includes('Mais de 6 meses');
            return isAdv 
                ? "Como você já tem base construída, dedique de 70% a 80% do seu tempo de estudo puramente nas questões. O LDI é apenas para consulta rápida."
                : "Como você está construindo a base agora, dedique 40% do seu tempo ao Livro Digital/Videoaula e 60% à resolução de questões.";
        } catch {
            return "Dedique 40% do seu tempo na teoria desse atraso e 60% em questões. Se você for aluno avançado, 80% do tempo direto nas questões.";
        }
    };

    // Configs by Step
    const stepsConfig: Record<number, { title: string, text: string, doubtQ?: string, doubtA?: string, buttons: any[] }> = {
        1: {
            title: 'O Raio-X Matinal',
            text: `Fala, guerreiro! A regra número 1 para não esquecer decorebas é inegociável. Antes de ler qualquer teoria, vá para a sua Aba de Flashcards e esvazie a Caixa 1 com os erros de ontem. ${overdueCards > 0 ? `(Você tem ${overdueCards} aguardando). ` : ''}Leia a pergunta e responda de forma direta! Sem resumos no Word!`,
            doubtQ: "Posso só reler meus resumos?",
            doubtA: "Não! Os flashcards são uma ferramenta apelativa de estudo ativo e revisão. Fazer resumo escrito é perda de tempo.",
            buttons: [
                { 
                    label: '🚀 Ir para a Tarefa (Esvaziar Caixa 1)', 
                    onClick: () => {
                        window.history.pushState({}, '', '/flashcards/caixa-1');
                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'flashcards' }));
                        handleAcatar1();
                    }, 
                    primary: true 
                },
                { label: '✅ Feito: Zerei a Caixa 1 (10 a 15 min)', onClick: handleAcatar1, primary: false },
                { label: '❌ Não Acatar: Pular revisão agora', onClick: handlePular1, primary: false }
            ]
        },
        2: {
            title: 'Resgate do Atraso',
            text: `Análise concluída. Como temos carga livre hoje (>4h), notei que você tem ${overdueReviews} tema(s) pendente(s). ${getPrepLevelText()}`,
            doubtQ: "Vejo a videoaula E leio o LDI?",
            doubtA: "Escolha apenas UM! O LDI é suficiente, a aula também é suficiente. Eu prefiro a aula porque vai mais rápido pras questões.",
            buttons: [
                { 
                    label: '🚀 Ir para a Tarefa (Assistir Teoria Pendente)', 
                    onClick: () => { 
                        window.history.pushState({}, '', '/calendario/atrasos/id');
                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'calendario' })); 
                        advanceStep(); 
                    }, 
                    primary: true 
                },
                { label: '✅ Matar o Atraso: Assistir teoria pendente', onClick: () => advanceStep(), primary: false },
                { label: '⏭️ Não Acatar: Ignorar o atraso', onClick: () => advanceStep(), primary: false }
            ]
        },
        3: {
            title: 'Construção da Base',
            text: "Hora da teoria principal do dia. Vá no calendário e cumpra sua hora de aula ou LDI do dia atual. Lembre-se, o nosso diferencial mora na prática que vem logo a seguir!",
            buttons: [
                { label: '✅ Finalizei a teoria do dia (Aprox. 1h a 1h30)', onClick: () => advanceStep(), primary: true },
                { label: '❌ Pular: Fui direto para as questões', onClick: () => advanceStep(), primary: false }
            ]
        },
        4: {
            title: 'Fixação e o Viés do Acerto',
            text: "Assunto fresco! Vá ao banco de questões e gere um bloco estritamente sobre o tema que você acabou de ver. Resolva as 20 a 30 questões de uma vez só! Não leia os comentários entre uma questão e outra para não mascarar a sua nota e não gerar um viés de conhecimento.",
            buttons: [
                { 
                    label: '🚀 Ir para a Tarefa (Banco de Questões)', 
                    onClick: () => {
                        window.history.pushState({}, '', '/banco-questoes?tema=current&limit=30');
                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'provas' }));
                        advanceStep();
                    }, 
                    primary: true 
                },
                { label: '🎯 Sucesso: Fiz 30 questões e acertei > 80%', onClick: () => advanceStep(), primary: false },
                { label: '📉 Base Fraca: Errei muito, fiz 50-60 questões para fixar', onClick: () => advanceStep(), primary: false },
                { label: '❌ Não Acatar: Não farei questões por tema hoje', onClick: () => advanceStep(), primary: false }
            ]
        },
        5: {
            title: 'A Missão de Alta Performance',
            text: "Carga máxima ativada! Como você tem mais de 4 horas livres, o Mentor vai configurar a criação de DOIS minissimulados diários, cada um contendo de 20 a 30 questões de grandes áreas diferentes. Na aba PROVAS isso pode ser registrado (ex: um de pediatria e um de ginecologia). A meta é acertar pelo menos 90% em cada um desses blocos!",
            doubtQ: "Filtro só para a banca que eu quero?",
            doubtA: "Não! Faça questões de todas as bancas do Brasil, elas copiam imagens umas das outras. Filtre pelas mais recentes, sem anuladas e com comentários.\n\nDica Adicional: Adicione questões de R+ (pré-requisito) aos filtros se estiver da metade pro final do ano, pois as bancas estão dificultando.",
            buttons: [
                { 
                    label: '🚀 Ir para a Tarefa (Gerar Simulado Aleatório)', 
                    onClick: () => { 
                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'provas' })); 
                        window.history.pushState({}, '', '/provas/simulado-aleatorio?area=random&limit=30&bancas=all');
                        advanceStep(); 
                    }, 
                    primary: true 
                },
                { label: '💨 Modo Sobrevivência: Hoje cansei, fiz só 1', onClick: () => advanceStep(), primary: false },
                { label: '❌ Não Acatar: Pular os minissimulados hoje', onClick: () => advanceStep(), primary: false }
            ]
        },
        6: {
            title: 'Leitura Cirúrgica Automatizada',
            text: "Na hora da correção, aplique a leitura cirúrgica! Se você errou o tratamento na questão, vá direto ao parágrafo do tratamento no comentário, pule o resto. O Mentor te convoca a transformar esses erros em flashcards com perguntas curtas e respostas objetivas, agendando essas revisões para ciclos de 15 em 15 dias! Isso vai permitir que você consiga revisar cerca de 15 assuntos diferentes em um único dia na reta final.",
            buttons: [
                { 
                    label: '✅ Caderno Atualizado: Ir para Caderno de Erros (+15 dias)', 
                    onClick: () => { 
                        try {
                            const cardsRaw = localStorage.getItem('medflow2_flashcards');
                            const cards = cardsRaw ? JSON.parse(cardsRaw) : [];
                            
                            const fifteenDaysFromNow = new Date();
                            fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);
                            
                            cards.push({
                                id: Date.now().toString(),
                                front: "Erro injetado pelo Mentor (Revisar Tratamento - Personalize)",
                                back: "Lembrete: Ler apenas o parágrafo Cirúrgico.",
                                nextReview: fifteenDaysFromNow.toISOString().split('T')[0],
                                box: 1,
                                level: 'medium',
                                specialty: 'Geral',
                                theme: 'Revisão Mentoria'
                            });
                            localStorage.setItem('medflow2_flashcards', JSON.stringify(cards));
                        } catch(e) {}
                        window.history.pushState({}, '', '/caderno-erros');
                        window.dispatchEvent(new CustomEvent('navigate', { detail: 'erros' }));
                        advanceStep(); 
                    }, 
                    primary: true 
                },
                { label: '✅ Entendido (Recolher Mentor)', onClick: () => { setIsOpen(false); advanceStep(); }, primary: false }
            ]
        }
    };

    if (currentStep > 6) {
        // Mentor completed for the day
        return (
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 right-6 z-[200] max-w-sm w-full bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 rounded-full"><CheckCircle2 size={16} /></div>
                                <h3 className="font-black text-sm uppercase tracking-widest text-emerald-400">Mentor 2.0 Finalizado</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <p className="text-slate-300 text-sm mt-4 font-medium leading-relaxed">
                            Você administrou sua base, testou seus erros no banco de questões e configurou as revisões. Seu MedFlow está livre. Mantenha a constância amanhã!
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    const step = stepsConfig[currentStep];

    return (
        <>
            {/* The Icon */}
            {!isOpen && (
                <div 
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[150] cursor-pointer group"
                >
                    <div className="w-14 h-14 bg-white rounded-full shadow-2xl border-4 border-indigo-500 flex items-center justify-center text-indigo-500 hover:scale-110 transition-transform hover:bg-indigo-50">
                        <Brain size={24} />
                    </div>
                    <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white animate-bounce" />
                </div>
            )}

            {/* The Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-[200] max-w-[380px] w-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-slate-900 p-6 relative">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                            
                            <div className="flex items-center gap-3 mb-2">
                                <Brain size={20} className="text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Mentor 2.0</span>
                            </div>
                            <h2 className="text-xl font-black text-white leading-tight">
                                {step.title}
                            </h2>
                            <div className="flex gap-1 mt-4">
                                {[1,2,3,4,5,6].map(i => (
                                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= currentStep ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                                ))}
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar max-h-[50vh]">
                            <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                                {step.text}
                            </p>

                            {step.doubtQ && (
                                <div className="mb-6 bg-indigo-50/50 rounded-2xl overflow-hidden border border-indigo-50/50 hover:bg-indigo-50 transition-colors">
                                    <button 
                                        onClick={() => setShowDoubt(!showDoubt)}
                                        className="w-full p-4 flex items-center justify-between text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-full w-fit">
                                                <HelpCircle size={16} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{step.doubtQ}</span>
                                        </div>
                                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${showDoubt ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {showDoubt && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                exit={{ height: 0, opacity: 0 }}
                                                className="px-4 pb-4 pt-1"
                                            >
                                                <div className="bg-white p-4 rounded-xl shadow-sm text-xs font-medium text-slate-600 border border-slate-100 whitespace-pre-wrap">
                                                    {step.doubtA}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-2 mt-4">
                                {step.buttons.map((btn, idx) => (
                                    <button
                                        key={idx}
                                        onClick={btn.onClick}
                                        className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center justify-between ${
                                            btn.primary 
                                                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:-translate-y-0.5' 
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        <span className="line-clamp-2 pr-2">{btn.label}</span>
                                        <ChevronRight size={16} className="flex-shrink-0 opacity-50" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
