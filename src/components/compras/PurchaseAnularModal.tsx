import React, { useState } from 'react';
import { X, AlertTriangle, XCircle } from 'lucide-react';
import { Purchase } from '../../types';
import { anularPurchaseInFirestore, formatCurrency } from '../../lib/storage';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { isDark } = useTheme();
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              isDark
                ? 'bg-rose-950 border-rose-500/40 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-black font-['Outfit',sans-serif] ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                Anular Compra #C-{String(purchase.purchaseNumber).padStart(3, '0')}
              </h3>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                {purchase.proveedor}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className={`p-3.5 border rounded-2xl space-y-1.5 text-xs ${
          isDark
            ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>¿Estás seguro de anular este registro de compra?</span>
          </div>
          <p className={`text-[11px] pl-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Total a anular: <strong>{formatCurrency(purchase.total)}</strong>. La compra quedará registrada como <strong>Anulada</strong> en el historial y sus montos no afectarán los balances activos ni las deudas por pagar.
          </p>
        </div>

        {error && (
          <div className={`p-2.5 border rounded-xl text-xs ${
            isDark
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-3">
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              Motivo de la anulación *
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica detalladamente por qué se anula esta compra..."
              className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
              }`}
            />
          </div>

          {/* Quick reason suggestions */}
          <div className="space-y-1.5">
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              Motivos frecuentes:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMotivo(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition text-left cursor-pointer ${
                    motivo === r
                      ? isDark
                        ? 'bg-rose-950 border-rose-500/60 text-rose-200 font-semibold'
                        : 'bg-rose-100 border-rose-300 text-rose-800 font-semibold'
                      : isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-slate-300'
                      : 'bg-white hover:bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
                isDark
                  ? 'border-[#223368] text-white hover:bg-[#0F1B3C]'
                  : 'border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF]'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isAnulando || !motivo.trim()}
              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
