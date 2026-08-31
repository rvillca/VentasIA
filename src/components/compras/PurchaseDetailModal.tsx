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
  Phone,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Purchase } from '../../types';
import {
  formatCurrency,
  formatBoliviaPhone,
  formatBoliviaWhatsAppDigits,
  reactivarPurchaseInFirestore,
} from '../../lib/storage';

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white font-['Outfit',sans-serif]">
                  Compra #C-{String(purchase.purchaseNumber).padStart(3, '0')}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isPaid
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      : isPending
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                      : 'bg-rose-950 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {isPaid && '✅ Pagado'}
                  {isPending && '⚠️ Saldo Pendiente'}
                  {isAnulado && '🚫 Anulado'}
                </span>
              </div>
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

        {/* Anulado Alert Banner */}
        {isAnulado && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Esta compra está anulada</span>
              </span>
              <button
                type="button"
                onClick={handleReactivar}
                className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reactivar Compra</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-300 pl-5 space-y-0.5">
              <p>
                <strong>Anulado por:</strong> {purchase.anuladoPor || 'Comprador'}
              </p>
              {purchase.motivoAnulacion && (
                <p>
                  <strong>Motivo:</strong> {purchase.motivoAnulacion}
                </p>
              )}
              {purchase.anuladoAt && (
                <p className="text-slate-400 text-[10px]">
                  Fecha anulación: {new Date(purchase.anuladoAt).toLocaleString('es-BO')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Data Grid */}
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[11px]">Fecha de Compra:</span>
              <span className="font-bold text-white">
                {new Date(purchase.fechaCompra || purchase.createdAt).toLocaleDateString('es-BO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Método de Pago:</span>
              <span className="font-bold text-white">{purchase.metodoPago}</span>
            </div>
            {purchase.numeroFacturaRecibo && (
              <div>
                <span className="text-slate-500 block text-[11px]">N° Factura / Recibo:</span>
                <span className="font-bold text-cyan-300 font-mono">
                  {purchase.numeroFacturaRecibo}
                </span>
              </div>
            )}
            {purchase.telefonoProveedor && (
              <div>
                <span className="text-slate-500 block text-[11px]">Teléfono Proveedor:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">
                    {formatBoliviaPhone(purchase.telefonoProveedor)}
                  </span>
                  {whatsappPhone && (
                    <a
                      href={`https://wa.me/${whatsappPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-900"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
            <div className="col-span-2 border-t border-slate-900 pt-1.5 mt-0.5">
              <span className="text-slate-500 block text-[11px]">Registrado por:</span>
              <span className="font-bold text-slate-300">
                {purchase.compradorNombre || 'Supervisor / Comprador'}
              </span>
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
              Artículos & Lotes Adquiridos ({purchase.productos?.length || 0}):
            </span>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
              {purchase.productos?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs border-b border-slate-900 pb-1.5 last:border-0 last:pb-0"
                >
                  <div>
                    <span className="font-bold text-white">
                      {item.cantidad}x {item.nombre}
                    </span>
                    {item.variante && (
                      <span className="text-slate-400 block text-[11px]">{item.variante}</span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      ({formatCurrency(item.costoUnitario)} c/u)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-300">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between font-bold text-slate-300">
              <span>Total Compra:</span>
              <span className="text-white font-mono">{formatCurrency(purchase.total)}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-400">
              <span>Pagado / Desembolsado:</span>
              <span className="font-mono">{formatCurrency(purchase.pagado)}</span>
            </div>
            <div className="flex justify-between font-bold text-rose-400 border-t border-slate-800 pt-1">
              <span>Saldo Pendiente:</span>
              <span className="font-mono">{formatCurrency(purchase.saldo)}</span>
            </div>
          </div>

          {purchase.observaciones && (
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300">
              <strong>Observaciones:</strong> {purchase.observaciones}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {/* Edit button */}
          <button
            type="button"
            onClick={() => onEdit(purchase)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md"
          >
            <Edit3 className="w-4 h-4" />
            <span>Editar Compra</span>
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={() => onPrint(purchase)}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            title="Imprimir comprobante térmico"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Ticket</span>
          </button>

          {/* Pay balance button */}
          {isPending && !isAnulado && (
            <button
              type="button"
              onClick={() => onPayBalance(purchase)}
              className="py-2.5 px-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>Abonar</span>
            </button>
          )}

          {/* Anular button */}
          {!isAnulado && (
            <button
              type="button"
              onClick={() => onAnular(purchase)}
              className="py-2.5 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-950 border border-rose-800 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
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
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition"
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
