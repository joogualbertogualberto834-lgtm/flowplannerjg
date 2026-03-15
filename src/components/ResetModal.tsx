import React, { useState } from 'react';
import { RotateCcw, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export function ResetModal({ isOpen, onClose, onConfirm }: ResetModalProps) {
    const [understood, setUnderstood] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleConfirm = async () => {
        if (!understood || confirmText !== 'RECOMEÇAR') return;

        try {
            setLoading(true);
            setError(null);
            await onConfirm();
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setUnderstood(false);
                setConfirmText('');
                onClose();
            }, 1500);
        } catch (err: any) {
            setError('Erro ao apagar dados. Tente novamente.');
            console.error('Reset error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
            >
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-50 text-red-500">
                            <RotateCcw size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">Recomeçar do zero</h3>
                    </div>
                    {!loading && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    {success ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center animate-bounce">
                                <CheckCircle2 size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800">Tudo apagado com sucesso.</h4>
                        </div>
                    ) : (
                        <>
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                <p className="text-sm font-bold text-red-700">Esta ação não pode ser desfeita.</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Isso vai apagar permanentemente:</p>
                                <ul className="space-y-2 text-slate-600 text-sm">
                                    <li className="flex items-center gap-2">• Todos os erros registrados</li>
                                    <li className="flex items-center gap-2">• Todas as provas e simulados</li>
                                    <li className="flex items-center gap-2">• Todos os cards de subtemas e revisões</li>
                                    <li className="flex items-center gap-2">• Todo o histórico de flashcards</li>
                                    <li className="flex items-center gap-2">• Todas as metas e progresso semanal</li>
                                </ul>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Seu login e senha não serão afetados.</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={understood}
                                        onChange={(e) => setUnderstood(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                                        Entendo que essa ação não pode ser desfeita
                                    </span>
                                </label>

                                <AnimatePresence>
                                    {understood && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-2"
                                        >
                                            <p className="text-xs font-bold text-slate-500 uppercase">Digite RECOMEÇAR para confirmar</p>
                                            <input
                                                type="text"
                                                value={confirmText}
                                                onChange={(e) => setConfirmText(e.target.value)}
                                                placeholder="RECOMEÇAR"
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all font-bold"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {error && (
                                <p className="text-xs font-bold text-red-500 text-center">{error}</p>
                            )}

                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    onClick={handleConfirm}
                                    disabled={!understood || confirmText !== 'RECOMEÇAR' || loading}
                                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${understood && confirmText === 'RECOMEÇAR' && !loading
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700 active:scale-[0.98]'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            <span>Apagando dados...</span>
                                        </>
                                    ) : (
                                        <span>Confirmar e apagar tudo</span>
                                    )}
                                </button>
                                {!loading && (
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
