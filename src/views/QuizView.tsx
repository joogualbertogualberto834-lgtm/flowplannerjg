import React, { useState } from 'react';
import { Play, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Topic {
    id: number;
    title: string;
    specialty: string;
}

interface QuizViewProps {
    groupedTopics: Record<string, Topic[]>;
}

export function QuizView({ groupedTopics }: QuizViewProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [result, setResult] = useState<{ topic: string; url: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateQuiz = async (topicTitle: string) => {
        setLoading(topicTitle);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/quizzes/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic_title: topicTitle }),
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                setResult({ topic: topicTitle, url: data.quiz_url });
            } else {
                setError(data.error || 'Erro ao gerar quiz. Tente novamente.');
            }
        } catch (err) {
            setError('Falha na comunicação com o servidor.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Quizzes de Aula</h2>
                <p className="text-slate-500">
                    Escolha um tema para gerar um teste interativo personalizado via NotebookLM.
                </p>
            </div>

            {result && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-emerald-900">Quiz Pronto!</p>
                            <p className="text-emerald-700 text-sm">O teste para "{result.topic}" foi gerado com sucesso.</p>
                        </div>
                    </div>
                    <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                    >
                        Acessar o teste
                        <ExternalLink size={18} />
                    </a>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(groupedTopics).map(([specialty, topics]) => (
                    <div key={specialty} className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest px-1">
                            {specialty}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {topics.map((topic) => (
                                <button
                                    key={topic.id}
                                    disabled={!!loading}
                                    onClick={() => handleGenerateQuiz(topic.title)}
                                    className={cn(
                                        "group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl transition-all hover:border-emerald-500 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
                                        loading === topic.title && "border-emerald-500 ring-2 ring-emerald-100"
                                    )}
                                >
                                    <span className="font-semibold text-slate-700 group-hover:text-emerald-700 text-left">
                                        {topic.title}
                                    </span>
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                        {loading === topic.title ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Play size={18} fill="currentColor" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="h-20" /> {/* Spacer */}
        </div>
    );
}
