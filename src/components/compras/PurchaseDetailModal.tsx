import React from 'react';
import {
  X,
  ShoppingBag,
  Printer,
  Edit3,
  XCircle,
  RotateCcw,
  DollarSign,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Purchase } from '../../types';
import {
  formatCurrency,
  formatBoliviaPhone,
  formatBoliviaWhatsAppDigits,
  reactivarPurchaseInFirestore,
  completePurchaseBalanceInFirestore,
} from '../../lib/storage';
import { useTheme } from '../../contexts/ThemeContext';

interface PurchaseDetailModalProps {
  purchase: Purchase;
  isJefe: boolean;
  onClose: () => void;
  onEdit: (purchase: Purchase) => void;
  onAnular: (purchase: Purchase) => void;
  onPrint: (purchase: Purchase) => void;
  onPayBalance: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
  onReactivada: (updated: Purchase) => void;
}

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  purchase,
  isJefe,
  onClose,
  onEdit,
  onAnular,
  onPrint,
  onPayBalance,
  onDelete,
  onReactivada,
}) => {
  const { isDark } = useTheme();
  const isAnulado = purchase.estado === 'Anulado';
  const isPending = purchase.estado === 'Saldo Pendiente';
  const isPaid = purchase.estado === 'Pagado';

  const handleReactivar = async () => {
    try {
      await reactivarPurchaseInFirestore(purchase.id, purchase.total, purchase.pagado);
      const saldo = Math.max(0, purchase.total - purchase.pagado);
      const updated: Purchase = {
        ...purchase,
        estado: saldo === 0 ? 'Pagado' : 'Saldo Pendiente',
        anuladoPor: undefined,
        motivoAnulacion: undefined,
        anuladoAt: undefined,
      };
      onReactivada(updated);
    } catch (err) {
      console.error('Error reactivando compra:', err);
    }
  };

  const whatsappPhone = purchase.telefonoProveedor
    ? formatBoliviaWhatsAppDigits(purchase.telefonoProveedor)
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-lg border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 ${
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
                ? 'bg-[#0F1B3C] border-[#223368] text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-black font-['Outfit',sans-serif] ${
                  isDark ? 'text-white' : 'text-[#1A2B5C]'
                }`}>
                  Compra #C-{String(purchase.purchaseNumber).padStart(3, '0')}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isPaid
                      ? isDark
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isPending
                      ? isDark
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                      : isDark
                      ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {isPaid && '✅ Pagado'}
                  {isPending && '⚠️ Saldo Pendiente'}
                  {isAnulado && '🚫 Anulado'}
                </span>
              </div>
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

        {/* Anulado Alert Banner */}
        {isAnulado && (
          <div className={`p-3.5 border rounded-2xl space-y-2 text-xs ${
            isDark
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>Esta compra está anulada</span>
              </span>
              <button
                type="button"
                onClick={handleReactivar}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reactivar Compra</span>
              </button>
            </div>
            <div className="text-[11px] pl-5 space-y-0.5">
              <p>
                <strong>Anulado por:</strong> {purchase.anuladoPor || 'Comprador'}
              </p>
              {purchase.motivoAnulacion && (
                <p>
                  <strong>Motivo:</strong> {purchase.motivoAnulacion}
                </p>
              )}
              {purchase.anuladoAt && (
                <p className="text-[10px] opacity-75">
                  Fecha anulación: {new Date(purchase.anuladoAt).toLocaleString('es-BO')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Data Grid */}
        <div className="space-y-3 text-xs">
          <div className={`grid grid-cols-2 gap-2 p-3 rounded-2xl border ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}>
            <div>
              <span className={`block text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Fecha de Compra:
              </span>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                {new Date(purchase.fechaCompra || purchase.createdAt).toLocaleDateString('es-BO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className={`block text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Método de Pago:
              </span>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                {purchase.metodoPago}
              </span>
            </div>
            {purchase.numeroFacturaRecibo && (
              <div>
                <span className={`block text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  N° Factura / Recibo:
                </span>
                <span className={`font-bold font-mono ${isDark ? 'text-cyan-300' : 'text-blue-700'}`}>
                  {purchase.numeroFacturaRecibo}
                </span>
              </div>
            )}
            {purchase.telefonoProveedor && (
              <div>
                <span className={`block text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Teléfono Proveedor:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    {formatBoliviaPhone(purchase.telefonoProveedor)}
                  </span>
                  {whatsappPhone && (
                    <a
                      href={`https://wa.me/${whatsappPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        isDark
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
            <div className={`col-span-2 border-t pt-1.5 mt-0.5 ${
              isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
            }`}>
              <span className={`block text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Registrado por:
              </span>
              <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-[#1A2B5C]'}`}>
                {purchase.compradorNombre || 'Supervisor / Comprador'}
              </span>
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="space-y-1.5">
            <span className={`font-bold block text-[11px] uppercase tracking-wider ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              Artículos & Lotes Adquiridos ({purchase.productos?.length || 0}):
            </span>
            <div className={`p-3 rounded-2xl border space-y-2 max-h-48 overflow-y-auto ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}>
              {purchase.productos?.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between text-xs border-b pb-1.5 last:border-0 last:pb-0 ${
                    isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                  }`}
                >
                  <div>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                      {item.cantidad}x {item.nombre}
                    </span>
                    {item.variante && (
                      <span className={`block text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                        {item.variante}
                      </span>
                    )}
                    <span className={`text-[10px] ${isDark ? 'text-[#9AA6C9]/70' : 'text-[#78716C]/70'}`}>
                      ({formatCurrency(item.costoUnitario)} c/u)
                    </span>
                  </div>
                  <span className={`font-mono font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className={`p-3 rounded-2xl border space-y-1.5 ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}>
            <div className="flex justify-between font-bold">
              <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>Total Compra:</span>
              <span className={`font-mono ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>{formatCurrency(purchase.total)}</span>
            </div>
            <div className={`flex justify-between font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              <span>Pagado / Desembolsado:</span>
              <span className="font-mono">{formatCurrency(purchase.pagado)}</span>
            </div>
            <div className={`flex justify-between font-bold border-t pt-1 ${
              isDark ? 'border-[#223368] text-rose-400' : 'border-[#E8DFC8] text-rose-700'
            }`}>
              <span>Saldo Pendiente:</span>
              <span className="font-mono">{formatCurrency(purchase.saldo)}</span>
            </div>
          </div>

          {purchase.observaciones && (
            <div className={`p-2.5 rounded-xl border text-[11px] ${
              isDark ? 'bg-[#0F1B3C] border-[#223368] text-slate-300' : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
            }`}>
              <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>Observaciones:</strong> {purchase.observaciones}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`flex flex-wrap gap-2 pt-2 border-t ${
          isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
        }`}>
          {/* Edit button */}
          <button
            type="button"
            onClick={() => onEdit(purchase)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer ${
              isDark
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Editar Compra</span>
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={() => onPrint(purchase)}
            className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isDark
                ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-white border-[#223368]'
                : 'bg-white hover:bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]'
            }`}
            title="Imprimir comprobante térmico"
          >
            <Printer className="w-4 h-4 text-amber-500" />
            <span>Ticket</span>
          </button>

          {/* Pay balance buttons */}
          {isPending && !isAnulado && (
            <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await completePurchaseBalanceInFirestore(purchase.id, purchase.total);
                    const updated: Purchase = {
                      ...purchase,
                      pagado: purchase.total,
                      saldo: 0,
                      estado: 'Pagado',
                    };
                    onReactivada(updated);
                    onClose();
                  } catch (err) {
                    console.error('Error liquidando saldo:', err);
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                title="Completar saldo de compra inmediatamente al 100%"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Liquidar Saldo</span>
              </button>

              <button
                type="button"
                onClick={() => onPayBalance(purchase)}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isDark
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/40 text-emerald-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                }`}
                title="Registrar abono parcial"
              >
                <DollarSign className="w-4 h-4" />
                <span>Abonar</span>
              </button>
            </>
          )}

          {/* Anular button */}
          {!isAnulado && (
            <button
              type="button"
              onClick={() => onAnular(purchase)}
              className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'bg-rose-950/50 hover:bg-rose-900 border-rose-800 text-rose-300'
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>Anular</span>
            </button>
          )}

          {/* Delete button (Jefe) */}
          {isJefe && (
            <button
              type="button"
              onClick={() => onDelete(purchase)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] hover:bg-rose-950 border-[#223368] hover:border-rose-700 text-[#9AA6C9] hover:text-rose-300'
                  : 'bg-white hover:bg-rose-50 border-[#E8DFC8] hover:border-rose-200 text-[#78716C] hover:text-rose-700'
              }`}
              title="Eliminar permanentemente de la base de datos (Jefe)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
