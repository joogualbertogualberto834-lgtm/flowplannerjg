import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Brain, BookOpen, AlertCircle, CheckCircle2, History, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/ui/Modal';
import { saveExamError, deleteExamError } from '../services/api';
import { SPECIALTIES } from '../constants';
import type { ExamError, Topic } from '../services/types';

interface ErrorsViewProps {
    errors: ExamError[];
    topics: Topic[];
    onUpdate: () => void;
}

export function ErrorsView({ errors, onUpdate }: ErrorsViewProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [filter, setFilter] = useState<'all' | 'desatencao' | 'falta_contato' | 'cansaco'>('all');

    // Estados do Formulário
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        specialty: '',
        topic: '',
        subtopic: '',
        error_origin: 'desatencao' as 'desatencao' | 'falta_contato' | 'cansaco',
        posicao_questao: null as '1-25' | '26-50' | '51-75' | '76-100' | null,
        notes: '',
        exam_id: null as number | null
    });

    const [saving, setSaving] = useState(false);

    // Sugestões de subtemas baseados em erros anteriores
    const subtopicSuggestions = useMemo(() => {
        if (!formData.specialty || !formData.topic) return [];
        const matches = errors
            .filter(e => e.specialty === formData.specialty && e.topic === formData.topic)
            .map(e => e.subtopic);
        return Array.from(new Set(matches)).slice(0, 5);
    }, [formData.specialty, formData.topic, errors]);

    const filteredErrors = useMemo(() => {
        if (filter === 'all') return errors;
        return errors.filter(e => e.error_origin === filter);
    }, [errors, filter]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveExamError({
                ...formData,
                notes: formData.notes || null,
            });
            setShowAdd(false);
            resetForm();
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            specialty: '',
            topic: '',
            subtopic: '',
            error_origin: 'desatencao',
            posicao_questao: null,
            notes: '',
            exam_id: null
        });
        setStep(1);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Excluir registro?')) {
            await deleteExamError(id);
            onUpdate();
        }
    };

    const getOriginConfig = (origin: string) => {
        switch (origin) {
            case 'desatencao': return { label: 'Desatenção', color: 'bg-purple-100 text-purple-700', icon: Brain };
            case 'falta_contato': return { label: 'Falta de Contato', color: 'bg-rose-100 text-rose-700', icon: BookOpen };
            case 'cansaco': return { label: 'Cansaço', color: 'bg-amber-100 text-amber-700', icon: History };
            default: return { label: origin, color: 'bg-slate-100 text-slate-700', icon: AlertCircle };
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Caderno de Oportunidades</h1>
                    <p className="text-slate-500 font-medium">Transforme seus erros em aprovação.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-6 py-4 bg-slate-800 text-white rounded-[24px] font-bold hover:bg-slate-900 transition-all shadow-xl shadow-slate-200"
                >
                    <Plus size={20} /> Registrar Novo Erro
                </button>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-2 mr-4 text-slate-400">
                    <Filter size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Filtrar</span>
                </div>
                {[
                    { id: 'all', label: 'Todos' },
                    { id: 'desatencao', label: 'Desatenção', color: 'bg-purple-50 text-purple-600 border-purple-100' },
                    { id: 'falta_contato', label: 'Falta de Contato', color: 'bg-rose-50 text-rose-600 border-rose-100' },
                    { id: 'cansaco', label: 'Cansaço', color: 'bg-amber-50 text-amber-600 border-amber-100' }
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setFilter(opt.id as any)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${filter === opt.id
                            ? (opt.color || 'bg-slate-800 text-white border-slate-800')
                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Listagem */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode='popLayout'>
                    {filteredErrors.map((error) => {
                        const config = getOriginConfig(error.error_origin);
                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={error.id}
                                className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative group hover:shadow-md transition-all"
                            >
                                <button
                                    onClick={() => handleDelete(error.id)}
                                    className="absolute top-6 right-6 p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${config.color}`}>
                                            {config.label}
                                        </span>
                                        {error.posicao_questao && (
                                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                Questão {error.posicao_questao}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                            {error.specialty} • {error.topic}
                                        </p>
                                        <h4 className="text-lg font-bold text-slate-800 leading-tight">
                                            {error.subtopic}
                                        </h4>
                                    </div>

                                    {error.notes && (
                                        <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl italic border-l-4 border-slate-200">
                                            "{error.notes}"
                                        </p>
                                    )}

                                    <div className="pt-2 flex items-center justify-between items-center">
                                        <span className="text-[10px] font-medium text-slate-400">
                                            {format(new Date(error.created_at), 'dd MMM, yyyy')}
                                        </span>
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredErrors.length === 0 && (
                    <div className="col-span-full py-24 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-400">Nenhum erro encontrado</h3>
                        <p className="text-slate-400 max-w-sm mx-auto">Comece a registrar suas oportunidades de melhoria clicando no botão acima.</p>
                    </div>
                )}
            </div>

            {/* Modal de Registro */}
            <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title="Novo Cadastro de Erro">
                <div className="space-y-8 py-4">
                    {/* Progress Bar */}
                    <div className="flex gap-2">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-slate-800' : 'bg-slate-100'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Step 1: Especialidade e Tema */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <section>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Escolha a Especialidade</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {SPECIALTIES.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setFormData(f => ({ ...f, specialty: s.name, topic: '' }))}
                                            className={`p-4 rounded-2xl text-sm font-bold border transition-all ${formData.specialty === s.name
                                                ? 'bg-slate-800 text-white border-slate-800 shadow-lg'
                                                : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {formData.specialty && (
                                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Selecione o Tema Principal</label>
                                    <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-1 -m-1">
                                        {SPECIALTIES.find(s => s.name === formData.specialty)?.themes.map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setFormData(f => ({ ...f, topic: t }))}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all text-left ${formData.topic === t
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </motion.section>
                            )}

                            <div className="pt-6">
                                <button
                                    disabled={!formData.specialty || !formData.topic}
                                    onClick={() => setStep(2)}
                                    className="w-full py-4 bg-slate-800 text-white rounded-[24px] font-bold disabled:opacity-20 transition-all flex items-center justify-center gap-2"
                                >
                                    Próximo passo
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Subtema e Origem */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <section>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Qual o Subtema específico?</label>
                                <p className="text-[10px] text-slate-400 mb-4">Ex: "Acalásia — critério manometria"</p>
                                <input
                                    autoFocus
                                    className="w-full p-4 rounded-2xl border border-slate-200 outline-none font-bold text-slate-800 focus:border-slate-800 transition-colors"
                                    placeholder="Escreva aqui..."
                                    value={formData.subtopic}
                                    onChange={e => setFormData(f => ({ ...f, subtopic: e.target.value }))}
                                />

                                {subtopicSuggestions.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {subtopicSuggestions.map(sug => (
                                            <button
                                                key={sug}
                                                onClick={() => setFormData(f => ({ ...f, subtopic: sug }))}
                                                className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 rounded-full border border-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                + {sug}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Origem do Erro</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'desatencao', label: '🧠 Desatenção', desc: 'Você sabia, mas errou na leitura', color: 'purple' },
                                        { id: 'falta_contato', label: '📚 Falta de Contato', desc: 'Tema desconhecido ou esquecido', color: 'rose' },
                                        { id: 'cansaco', label: '😴 Cansaço', desc: 'Erro por exaustão mental', color: 'amber' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFormData(f => ({ ...f, error_origin: opt.id as any }))}
                                            className={`p-4 rounded-[28px] border text-left transition-all ${formData.error_origin === opt.id
                                                ? `bg-${opt.color}-50 border-${opt.color}-200 shadow-sm ring-1 ring-${opt.color}-200`
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className={`font-black ${formData.error_origin === opt.id ? `text-${opt.color}-700` : 'text-slate-700'}`}>{opt.label}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">{opt.desc}</p>
                                                </div>
                                                {formData.error_origin === opt.id && <CheckCircle2 className={`text-${opt.color}-600`} size={20} />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setStep(1)} className="py-4 text-slate-400 font-bold hover:text-slate-600">Voltar</button>
                                <button
                                    disabled={!formData.subtopic}
                                    onClick={() => setStep(3)}
                                    className="py-4 bg-slate-800 text-white rounded-[24px] font-bold disabled:opacity-20 shadow-lg shadow-slate-200"
                                >
                                    Avançar
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Posição e Notas */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <section>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Questão número (bloco)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['1-25', '26-50', '51-75', '76-100'].map(block => (
                                        <button
                                            key={block}
                                            onClick={() => setFormData(f => ({ ...f, posicao_questao: f.posicao_questao === block ? null : block as any }))}
                                            className={`p-3 rounded-2xl text-xs font-black transition-all border ${formData.posicao_questao === block
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            {block}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Notas Clínicas</label>
                                <textarea
                                    className="w-full p-6 rounded-[32px] bg-slate-50 border border-slate-100 outline-none text-slate-700 text-sm h-40 focus:bg-white focus:border-slate-200 transition-all"
                                    placeholder="O detalhe técnico que faltou... Ex: Proteinúria > 300mg/24h define pré-eclâmpsia"
                                    value={formData.notes}
                                    onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                                />
                            </section>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setStep(2)} className="py-4 text-slate-400 font-bold hover:text-slate-600">Voltar</button>
                                <button
                                    disabled={saving}
                                    onClick={handleSave}
                                    className="py-4 bg-emerald-600 text-white rounded-[24px] font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                                >
                                    {saving ? 'Salvando...' : 'Finalizar Registro'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
