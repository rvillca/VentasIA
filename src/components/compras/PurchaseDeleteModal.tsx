import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Purchase } from '../../types';
import { deletePurchaseFromFirestore, formatCurrency } from '../../lib/storage';

interface PurchaseDeleteModalProps {
  purchase: Purchase;
  onClose: () => void;
  onDeleted: (purchaseId: string) => void;
}

export const PurchaseDeleteModal: React.FC<PurchaseDeleteModalProps> = ({
  purchase,
  onClose,
  onDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deletePurchaseFromFirestore(purchase.id);
      onDeleted(purchase.id);
      onClose();
    } catch (err) {
      console.error('Error deleting purchase:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-rose-900/60 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Eliminar Compra Permanentemente</h3>
              <p className="text-xs text-slate-400">#C-{String(purchase.purchaseNumber).padStart(3, '0')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-xs text-rose-200 space-y-1">
          <p className="font-bold text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Esta acción no se puede deshacer</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Se eliminará del historial la compra a <strong>{purchase.proveedor}</strong> por un valor de <strong>{formatCurrency(purchase.total)}</strong>.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Registro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
