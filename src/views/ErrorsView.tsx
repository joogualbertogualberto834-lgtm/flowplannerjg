import React, { useState } from 'react';
import { Plus, Trash2, BrainCircuit, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Modal } from '../components/ui/Modal';
import { ModalActions } from '../components/ui/ModalActions';
import { TopicSelect } from '../components/ui/TopicSelect';
import { addError, deleteError, convertErrorToFlashcard } from '../services/api';
import type { ErrorNote, Topic } from '../services/types';

interface ErrorsViewProps {
    errors: ErrorNote[];
    topics: Topic[];
    onUpdate: () => void;
}

export function ErrorsView({ errors, topics, onUpdate }: ErrorsViewProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [newError, setNewError] = useState({ topic_id: '', content: '', tags: '' });
    const [addingError, setAddingError] = useState(false);
    // Msg de erro inline — não fecha o modal se falhar ao salvar
    const [formError, setFormError] = useState<string | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setAddingError(true);
        try {
            await addError(newError);
            setShowAdd(false);
            setNewError({ topic_id: '', content: '', tags: '' });
            await onUpdate();
        } catch (err: any) {
            // Não fecha o modal: exibe o erro para o usuário tentar novamente
            setFormError(err?.message ?? 'Erro ao salvar. Tente novamente.');
        } finally {
            setAddingError(false);
        }
    };

    const handleConvert = async (error: ErrorNote) => {
        try {
            const res = await convertErrorToFlashcard(error);
            if (res !== null) {
                alert('Transformado em Flashcard com sucesso!');
                await onUpdate();
            }
        } catch (err) {
            console.error('Conversion failed', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Excluir esta nota permanentemente?')) return;
        try {
            await deleteError(id);
            await onUpdate();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold">Caderno de Erros</h3>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all"
                >
                    <Plus size={18} /> Registrar Erro
                </button>
            </div>

            <div className="grid gap-4">
                {errors.map((error) => (
                    <div
                        key={error.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group"
                    >
                        <button
                            onClick={() => handleDelete(error.id)}
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-all"
                            title="Excluir Erro"
                        >
                            <Trash2 size={16} />
                        </button>
                        <div className="flex justify-between items-start mb-4 pr-8">
                            <div>
                                <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                                    {error.topic_title}
                                </span>
                                <p className="text-slate-500 text-xs">
                                    {format(new Date(error.created_at), 'dd/MM/yyyy HH:mm')}
                                </p>
                            </div>
                            <button
                                onClick={() => handleConvert(error)}
                                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 transition-all"
                            >
                                <BrainCircuit size={14} /> Transformar em Flashcard
                            </button>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{error.content}</p>
                        {error.tags && (
                            <div className="mt-4 flex gap-2">
                                {error.tags.split(',').map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase"
                                    >
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal open={showAdd} onClose={() => { setShowAdd(false); setFormError(null); }} title="Registrar Erro Crítico">
                <form onSubmit={handleAdd} className="space-y-4">
                    {formError && (
                        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
                            <AlertTriangle size={14} />
                            {formError}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Tema
                        </label>
                        <TopicSelect
                            topics={topics}
                            value={newError.topic_id}
                            onChange={(v) => setNewError({ ...newError, topic_id: v })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            O que você errou?
                        </label>
                        <textarea
                            required
                            value={newError.content}
                            onChange={(e) => setNewError({ ...newError, content: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none h-32"
                            placeholder="Descreva o conceito que causou a dúvida..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Tags (separadas por vírgula)
                        </label>
                        <input
                            value={newError.tags}
                            onChange={(e) => setNewError({ ...newError, tags: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                            placeholder="Ex: Fisiologia, Tratamento, Grave"
                        />
                    </div>
                    <ModalActions
                        onCancel={() => setShowAdd(false)}
                        submitColor="rose"
                        submitLabel="Salvar Erro"
                    />
                </form>
            </Modal>
        </div>
    );
}
