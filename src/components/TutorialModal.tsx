import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Trophy, LayoutDashboard, BookOpen, RefreshCw,
    Layers, BookMarked, Grid, BarChart2, Calendar,
    CheckCircle2, ArrowLeft, ArrowRight
} from 'lucide-react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const steps = [
    {
        icon: <Trophy className="text-emerald-500" size={48} />,
        title: "Bem-vindo ao MedFlow",
        text: "Seu segundo cérebro para a residência médica. Você insere o dado bruto — erros, provas, metas — e o sistema devolve organização, prioridade e direção.\n\nSem IA. Tudo calculado a partir dos seus próprios dados."
    },
    {
        icon: <LayoutDashboard className="text-blue-500" size={48} />,
        title: "Dashboard",
        text: "A tela inicial mostra um resumo do seu estado atual:\n\n- Total de temas cadastrados\n- Temas em alta performance\n- Revisões atrasadas\n- Revisões nas próximas 24h\n\nTambém tem um cronômetro para você registrar o tempo de estudo e um gráfico de esforço diário em minutos.\n\nAbra todo dia para ver onde está."
    },
    {
        icon: <BookOpen className="text-purple-500" size={48} />,
        title: "Especialidades",
        text: "Aqui você organiza todo o conteúdo por especialidade médica.\n\nCadastre os grandes temas de cada especialidade — Clínica Médica, Pediatria, G.O., Cirurgia, Preventiva.\n\nO sistema rastreia o intervalo de revisão de cada tema e te avisa quando está na hora de revisar."
    },
    {
        icon: <RefreshCw className="text-emerald-500" size={48} />,
        title: "Revisões",
        text: "Baseada em evidência científica (curva de Ebbinghaus), a revisão espaçada agenda automaticamente quando você deve rever cada tema:\n\nRevisão 1: 1 dia após estudar\nRevisão 2: 3 dias depois\nRevisão 3: 7 dias depois\nRevisão 4: 14 dias depois\nRevisão 5: 30 dias depois\n\nAbra essa aba toda manhã e faça as revisões do dia antes de estudar conteúdo novo."
    },
    {
        icon: <Layers className="text-yellow-500" size={48} />,
        title: "Flashcards",
        text: "Crie flashcards para os pontos mais difíceis de memorizar — critérios diagnósticos, doses, classificações.\n\nO sistema usa repetição espaçada para mostrar cada card no momento certo — quando você está prestes a esquecer.\n\nQuanto mais você usa, mais o sistema aprende seu ritmo e ajusta os intervalos."
    },
    {
        icon: <BookMarked className="text-red-500" size={48} />,
        title: "Caderno de Erros",
        text: "Após cada simulado, registre cada erro em menos de 30 segundos:\n\n1. Selecione a especialidade\n2. Escolha o tema e subtema (escreva um novo se não existir — fica salvo para sempre)\n3. Classifique a origem:\n   • Desatenção: sabia mas errou na leitura\n   • Falta de Contato: não sabia ou não lembrava\n   • Cansaço: erro por exaustão\n\nOs erros de Falta de Contato viram cards de revisão automaticamente."
    },
    {
        icon: <Grid className="text-orange-500" size={48} />,
        title: "Palavras Cruzadas",
        text: "Uma forma diferente de revisar conteúdo médico.\n\nCole o texto de uma questão ou tema e o sistema gera um jogo de palavras cruzadas com os conceitos principais.\n\nUse como aquecimento antes de uma sessão de questões ou como revisão leve no final do dia."
    },
    {
        icon: <BarChart2 className="text-blue-800" size={48} />,
        title: "Aba de Desempenho",
        text: "Aqui você não insere nada. Só lê.\n\nO sistema cruzou todos os seus dados e calculou 6 painéis:\n\n- Índice MedFlow (0-100): síntese de toda sua preparação\n- Painel de Questões: volume e aproveitamento por especialidade\n- Revisão Espaçada: status dos cards e consolidação\n- Análise de Erros: mapa de calor e origens dos erros\n- Consistência: calendário e sequência de dias ativos\n- Saúde do Plano: semáforos e impacto do sono no desempenho\n\nDisponível após 3 semanas de uso."
    },
    {
        icon: <Calendar className="text-emerald-800" size={48} />,
        title: "Semana",
        text: "Gerencie suas metas semanais em três eixos:\n\n- Estudo: questões e horas\n- Saúde: sono e hidratação\n- Exercício: sessões e frequência\n\nAtualize o progresso com os botões +5, +10, +25 após cada sessão.\n\nO sistema recalcula sua meta diária automaticamente com base no que falta para bater a meta semanal.\n\nMetas de saúde e exercício aparecem correlacionadas com seu desempenho na aba de Desempenho."
    },
    {
        icon: <CheckCircle2 className="text-emerald-500" size={48} />,
        title: "Seu dia ideal no MedFlow",
        text: "O ciclo completo leva menos de 20 minutos além do estudo normal:\n\n☀ Manhã (5 min)\nAbra o Dashboard → veja revisões atrasadas → faça os cards do dia\n\n📚 Durante o estudo\nA cada sessão, atualize as metas com +10 ou +25 questões\n\n📝 Após o simulado (10 min)\nRegistre erros no Caderno → crie cards para Falta de Contato\n\n📊 Uma vez por semana (5 min)\nAbra Desempenho → veja o que está puxando seu índice para baixo → ajuste o foco da semana\n\nO sistema cuida do resto."
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
                            <div className="mb-8 p-6 rounded-[32px] bg-slate-50">
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
