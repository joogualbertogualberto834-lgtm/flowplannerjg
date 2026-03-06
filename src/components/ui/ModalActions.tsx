import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ModalActionsProps {
    onCancel: () => void;
    loading?: boolean;
    submitLabel?: string;
    submitColor?: 'emerald' | 'rose';
}

/**
 * Botões padronizados Cancelar / Salvar para formulários dentro de modais.
 */
export function ModalActions({
    onCancel,
    loading = false,
    submitLabel = 'Salvar',
    submitColor = 'emerald',
}: ModalActionsProps) {
    const colorClasses =
        submitColor === 'rose'
            ? 'bg-rose-600 hover:bg-rose-700'
            : 'bg-emerald-600 hover:bg-emerald-700';

    return (
        <div className="flex gap-3 pt-4">
            <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
                Cancelar
            </button>
            <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 rounded-xl font-semibold text-white ${colorClasses} shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
            >
                {loading ? (
                    <>
                        <RefreshCw size={16} className="animate-spin" />
                        Salvando...
                    </>
                ) : (
                    submitLabel
                )}
            </button>
        </div>
    );
}
