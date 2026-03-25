import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    CheckCircle2, ArrowLeft, ArrowRight,
    Target, Zap, PlayCircle, AlertCircle,
    X, Trophy, BookOpen, Brain
} from 'lucide-react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const steps = [
    {
        title: "Bem-vindo ao MedFlow 2.0",
        text: "Seu hub de estudos focado, ultrarrápido e offline-first. Todo o seu progresso fica salvo no seu próprio dispositivo, garantindo máxima velocidade para você focar no que importa: a aprovação.",
        icon: <PlayCircle size={32} className="text-emerald-500" />,
        color: "bg-emerald-50"
    },
    {
        title: "O Painel Central",
        text: "Seu centro de comando. Acompanhe a sua Missão de Longo Prazo, veja estatísticas de consistência e saiba exatamente o que revisar através do botão 'Estudar Agora'.",
        icon: <Target size={32} className="text-blue-500" />,
        color: "bg-blue-50"
    },
    {
        title: "Provas e Simulados",
        text: "Registre seus resultados em detalhes. O sistema evolui seu mapa de desempenho, destacando pontuações por banca e identificando precisamente onde você perde os pontos mais cruciais.",
        icon: <Trophy size={32} className="text-yellow-500" />,
        color: "bg-yellow-50"
    },
    {
        title: "Caderno de Erros Ativo",
        text: "Não apenas anote: mapeie cada questão errada pelo real motivo (Falta de Contato, Desatenção ou Cansaço). Transforme os pontos cegos diretamente em Flashcards com um único clique.",
        icon: <AlertCircle size={32} className="text-rose-500" />,
        color: "bg-rose-50"
    },
    {
        title: "Flashcards Espaçados",
        text: "Suas armas de retenção. O algoritmo distribuído em 5 caixas calcula os intervalos ideais de repetição, moldando os novos contatos de acordo com a sua dificuldade e taxa de acerto.",
        icon: <Zap size={32} className="text-purple-500" />,
        color: "bg-purple-50"
    },
    {
        title: "A Dupla Opção: Livre vs Mentor",
        text: "Modo MedFlow Livre: Navegue, faça questões avulsas ou leia LDI na sua aba favorita. Sem cobranças. \n\nModo Mentor 2.0 (Opcional): Clique no Cérebro flutuante e o Mentor te guiará com rigor matemático, exigindo % de teoria vs prática, simulados randomizados e revisões ativas de 15 em 15 dias. Adote o modo que quiser a qualquer momento do seu dia!",
        icon: <Brain size={32} className="text-indigo-500" />,
        color: "bg-indigo-50"
    }
];

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const TUTORIAL_KEY = 'medflow_tutorial_seen';

    const handleClose = () => {
        localStorage.setItem(TUTORIAL_KEY, 'true');
        onClose();
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isOpen) return null;

    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white w-full max-w-[640px] rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col min-h-[500px]"
            >
                {/* Header / Progress Bar */}
                <div className="absolute top-0 inset-x-0 p-6 flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Step {currentStep + 1} de {steps.length}</span>
                        <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 mt-12 text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center max-w-md w-full"
                        >
                            <div className={`mb-8 p-6 rounded-[32px] ${step.color || 'bg-slate-50'}`}>
                                {step.icon}
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-6">{step.title}</h2>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                {step.text}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Buttons */}
                <div className="p-8 flex items-center justify-between bg-slate-50/50">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${currentStep === 0
                            ? 'opacity-0 pointer-events-none'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <ArrowLeft size={18} />
                        Anterior
                    </button>

                    <button
                        onClick={nextStep}
                        className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95 ${isLastStep
                            ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'
                            : 'bg-slate-800 text-white shadow-slate-200 hover:bg-slate-900'
                            }`}
                    >
                        {isLastStep ? (
                            <>
                                Começar agora
                                <CheckCircle2 size={18} />
                            </>
                        ) : (
                            <>
                                Próximo
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
