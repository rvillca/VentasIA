import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Purchase } from '../../types';
import { deletePurchaseFromFirestore, formatCurrency } from '../../lib/storage';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { isDark } = useTheme();
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 ${
          isDark ? 'bg-[#16234F] border-rose-900/60' : 'bg-white border-rose-200'
        }`}
      >
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
              isDark
                ? 'bg-rose-950 border-rose-500/40 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                Eliminar Compra Permanentemente
              </h3>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                #C-{String(purchase.purchaseNumber).padStart(3, '0')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`p-3 border rounded-2xl text-xs space-y-1 ${
          isDark
            ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <p className="font-bold flex items-center gap-1.5 text-rose-500">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Esta acción no se puede deshacer</span>
          </p>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Se eliminará del historial la compra a <strong>{purchase.proveedor}</strong> por un valor de <strong>{formatCurrency(purchase.total)}</strong>.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 px-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
              isDark
                ? 'border-[#223368] text-white hover:bg-[#0F1B3C]'
                : 'border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
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
