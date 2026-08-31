import React, { useState } from 'react';
import { X, AlertTriangle, XCircle, Check } from 'lucide-react';
import { Purchase } from '../../types';
import { anularPurchaseInFirestore, formatCurrency } from '../../lib/storage';

interface PurchaseAnularModalProps {
  purchase: Purchase;
  userName: string;
  onClose: () => void;
  onAnulado: (purchaseId: string, motivo: string) => void;
}

const QUICK_REASONS = [
  'Error de digitación en productos o montos',
  'Devolución de mercadería al mayorista',
  'Compra duplicada por error',
  'Mayorista canceló el pedido por falta de stock',
  'Comprobante o factura no válida',
];

export const PurchaseAnularModal: React.FC<PurchaseAnularModalProps> = ({
  purchase,
  userName,
  onClose,
  onAnulado,
}) => {
  const [motivo, setMotivo] = useState('');
  const [isAnulando, setIsAnulando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('Por favor indica el motivo de anulación.');
      return;
    }

    try {
      setIsAnulando(true);
      setError(null);
      await anularPurchaseInFirestore(purchase.id, userName, motivo.trim());
      onAnulado(purchase.id, motivo.trim());
      onClose();
    } catch (err: any) {
      console.error('Error al anular compra:', err);
      setError(err.message || 'Error al procesar la anulación.');
    } finally {
      setIsAnulando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-['Outfit',sans-serif]">
                Anular Compra #C-{String(purchase.purchaseNumber).padStart(3, '0')}
              </h3>
              <p className="text-xs text-slate-400">{purchase.proveedor}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl space-y-1.5 text-xs text-rose-200">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>¿Estás seguro de anular este registro de compra?</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-6">
            Total a anular: <strong>{formatCurrency(purchase.total)}</strong>. La compra quedará registrada como <strong>Anulada</strong> en el historial y sus montos no afectarán los balances activos ni las deudas por pagar.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Motivo de la anulación *
            </label>
            <textarea
              required
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Escribe la razón por la que se anula esta compra..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* Quick Suggestions */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Motivos frecuentes (haz clic para autocompletar):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMotivo(r)}
                  className="text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 px-2 py-1 rounded-lg text-left transition"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isAnulando}
              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/60 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isAnulando ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Confirmar Anulación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
