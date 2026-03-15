import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { MessageSquare, Clock, Battery, Target, Star, Save } from 'lucide-react';
import { updateExam } from '../../services/api';

interface Exam {
    id: number;
    name: string;
    slider_tempo?: number | null;
    slider_cansaco?: number | null;
    slider_confianca?: number | null;
    notes?: string;
}

interface ExamFeedbackModalProps {
    exam: Exam | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function ExamFeedbackModal({ exam, isOpen, onClose, onUpdate }: ExamFeedbackModalProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        slider_tempo: exam?.slider_tempo || 50,
        slider_cansaco: exam?.slider_cansaco || 50,
        slider_confianca: exam?.slider_confianca || 50,
        notes: exam?.notes || ''
    });

    React.useEffect(() => {
        if (exam) {
            setFormData({
                slider_tempo: exam.slider_tempo || 50,
                slider_cansaco: exam.slider_cansaco || 50,
                slider_confianca: exam.slider_confianca || 50,
                notes: exam.notes || ''
            });
        }
    }, [exam]);

    const handleSave = async () => {
        if (!exam) return;
        setSaving(true);
        try {
            await updateExam(exam.id, {
                ...formData
            } as any);
            onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar feedback');
        } finally {
            setSaving(false);
        }
    };

    if (!exam) return null;

    return (
        <Modal open={isOpen} onClose={onClose} title={`Feedback: ${exam.name}`}>
            <div className="space-y-10 py-4">
                <section className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14} className="text-blue-500" /> Gestão de Tempo
                            </label>
                            <span className="text-xs font-bold text-blue-600">{formData.slider_tempo}%</span>
                        </div>
                        <input
                            type="range"
                            className="w-full accent-blue-600"
                            value={formData.slider_tempo}
                            onChange={e => setFormData(f => ({ ...f, slider_tempo: parseInt(e.target.value) }))}
                        />
                        <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase">
                            <span>Lento</span>
                            <span>No Ponto</span>
                            <span>Rápido</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Battery size={14} className="text-amber-500" /> Nível de Cansaço
                            </label>
                            <span className="text-xs font-bold text-amber-600">{formData.slider_cansaco}%</span>
                        </div>
                        <input
                            type="range"
                            className="w-full accent-amber-500"
                            value={formData.slider_cansaco}
                            onChange={e => setFormData(f => ({ ...f, slider_cansaco: parseInt(e.target.value) }))}
                        />
                        <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase">
                            <span>Fresco</span>
                            <span>Fadigado</span>
                            <span>Exausto</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Target size={14} className="text-emerald-500" /> Segurança Técnica
                            </label>
                            <span className="text-xs font-bold text-emerald-600">{formData.slider_confianca}%</span>
                        </div>
                        <input
                            type="range"
                            className="w-full accent-emerald-500"
                            value={formData.slider_confianca}
                            onChange={e => setFormData(f => ({ ...f, slider_confianca: parseInt(e.target.value) }))}
                        />
                        <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase">
                            <span>Inseguro</span>
                            <span>Neutro</span>
                            <span>Dominante</span>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare size={14} className="text-slate-400" /> Observações Livres
                    </label>
                    <textarea
                        className="w-full p-6 rounded-[32px] bg-slate-50 border border-slate-100 outline-none text-slate-700 text-sm h-32 focus:bg-white focus:border-slate-200 transition-all"
                        placeholder="Como foi seu foco? O que sentiu no final da prova?"
                        value={formData.notes}
                        onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                    />
                </section>

                <button
                    disabled={saving}
                    onClick={handleSave}
                    className="w-full py-5 bg-slate-800 text-white rounded-[24px] font-black shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                    <Save size={20} />
                    {saving ? 'Guardando...' : 'Salvar Experiência'}
                </button>
            </div>
        </Modal>
    );
}
