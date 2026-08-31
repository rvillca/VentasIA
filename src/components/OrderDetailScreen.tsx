import React, { useState } from 'react';
import {
  ArrowLeft,
  MessageCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Package,
  Calendar,
  Copy,
  Check,
  Printer,
  XCircle,
  AlertTriangle,
  User,
  Shield,
} from 'lucide-react';
import { Order } from '../types';
import {
  formatCurrency,
  generateWhatsAppReceiptText,
  getWhatsAppUrl,
} from '../lib/storage';
import { ThermalPrintModal } from './ThermalPrintModal';
import { useAuth } from '../contexts/AuthContext';

interface OrderDetailScreenProps {
  order: Order;
  onBack: () => void;
  onEdit: (order: Order) => void;
  onToggleStatus: (orderId: string) => void;
  onDelete: (orderId: string) => void;
  onAnular: (orderId: string, motivo: string) => void;
}

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({
  order,
  onBack,
  onEdit,
  onToggleStatus,
  onDelete,
  onAnular,
}) => {
  const { canDeleteOrders, isJefe, isSupervisor, isVendedor, userProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const isDelivered = order.estado === 'Entregado';
  const isAnulado = order.estado === 'Anulado';
  const hasPendingBalance = order.saldo > 0;
  const whatsAppUrl = getWhatsAppUrl(order);

  const handleCopyReceipt = () => {
    const text = generateWhatsAppReceiptText(order);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmAnulacion = () => {
    if (!motivoAnulacion.trim()) return;
    onAnular(order.id, motivoAnulacion.trim());
    setShowAnularModal(false);
    setMotivoAnulacion('');
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <div id="order-detail-container" className="max-w-3xl mx-auto px-4 py-4 sm:py-6 space-y-6">
        {/* Top navigation & action header */}
        <div className="flex items-center justify-between gap-2">
          <button
            id="detail-back-btn"
            onClick={onBack}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Ventas</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="detail-print-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-md shadow-purple-900/30 active:scale-95"
              title="Reimprimir ticket de pedido en impresora térmica"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket</span>
            </button>

            {!isAnulado && (
              <button
                id="detail-edit-btn"
                onClick={() => onEdit(order)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold border border-slate-700"
                title="Editar pedido"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}

            {/* VENDEDOR / SUPERVISOR / JEFE: Anular Venta */}
            {!isAnulado && (
              <button
                id="detail-anular-btn"
                onClick={() => setShowAnularModal(true)}
                className="p-2.5 bg-amber-950/60 hover:bg-amber-900/80 active:scale-95 text-amber-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold border border-amber-800/40"
                title="Anular venta (los vendedores pueden anular)"
              >
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Anular Venta</span>
              </button>
            )}

            {/* SOLO JEFE / ADMIN: Eliminar definitivamente */}
            {canDeleteOrders && (
              <button
                id="detail-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 bg-rose-950/60 hover:bg-rose-900/80 active:scale-95 text-rose-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold border border-rose-800/40"
                title="Eliminar permanentemente (Solo Jefe)"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Eliminar (Admin)</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal de Anulación de Venta */}
        {showAnularModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-white font-['Outfit',sans-serif]">
                  Anular Pedido #{order.orderNumber}
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Esta venta quedará registrada como <strong>Anulada</strong> para el control del supervisor y jefe. Por favor indica el motivo:
              </p>
              <textarea
                required
                rows={3}
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="ej: El cliente de TikTok canceló el pedido por demora / Producto sin stock..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnularModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!motivoAnulacion.trim()}
                  onClick={handleConfirmAnulacion}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Confirmar Anulación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Alert (Solo Jefe) */}
        {showDeleteConfirm && canDeleteOrders && (
          <div
            id="delete-confirm-box"
            className="p-4 bg-rose-950/90 border border-rose-600/60 rounded-2xl text-white space-y-3 shadow-2xl animate-fade-in"
          >
            <p className="font-bold text-sm text-rose-200">
              ¿Estás seguro de que deseas eliminar permanentemente este pedido #{order.orderNumber} de la base de datos?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onDelete(order.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white transition-colors"
              >
                Sí, eliminar definitivamente
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Banner if Anulado */}
        {isAnulado && (
          <div className="p-4 bg-rose-950/80 border border-rose-600/80 rounded-2xl text-rose-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>ESTA VENTA ESTÁ ANULADA</span>
            </div>
            {order.motivoAnulacion && (
              <p className="text-xs text-rose-300">
                <strong>Motivo:</strong> {order.motivoAnulacion}
              </p>
            )}
            {order.anuladoPor && (
              <p className="text-[11px] text-rose-400">
                Anulado por: {order.anuladoPor} · {order.anuladoAt ? new Date(order.anuladoAt).toLocaleString('es-BO') : ''}
              </p>
            )}
          </div>
        )}

        {/* Main Order Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black font-mono text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  VENTA #{String(order.orderNumber).padStart(3, '0')}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                    isAnulado
                      ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                      : isDelivered
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                  }`}
                >
                  {isAnulado ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Anulado</span>
                    </>
                  ) : isDelivered ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Entregado</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span>Abierto (En Preparación)</span>
                    </>
                  )}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit',sans-serif]">
                {order.cliente || 'Cliente sin nombre'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 capitalize">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {formattedDate}
                </span>
                {order.vendedorNombre && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Vendedor: <strong>{order.vendedorNombre}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Toggle Status Button (if not anulado) */}
            {!isAnulado && (
              <button
                id="detail-toggle-status-btn"
                onClick={() => onToggleStatus(order.id)}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                  isDelivered
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {isDelivered ? (
                  <>
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Reabrir Pedido</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marcar como Entregado</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Customer contact & Delivery details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Phone */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-950 flex items-center justify-center text-cyan-400 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Teléfono / WhatsApp
                  </span>
                  <span className="text-sm font-bold text-white">
                    {order.telefono || 'No registrado'}
                  </span>
                </div>
              </div>
              {order.telefono && (
                <a
                  href={`tel:${order.telefono}`}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  title="Llamar"
                >
                  Llamar
                </a>
              )}
            </div>

            {/* Delivery location */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-950 flex items-center justify-center text-indigo-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Lugar de Entrega
                </span>
                <span className="text-sm font-bold text-white truncate block">
                  {order.lugarEntrega || 'No especificado'}
                </span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {order.observaciones && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-yellow-400" />
                Observaciones / Notas
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {order.observaciones}
              </p>
            </div>
          )}
        </div>

        {/* Itemized Products Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2 border-b border-slate-800 pb-3">
            <Package className="w-5 h-5 text-cyan-400" />
            Detalle de Productos ({order.productos.length})
          </h2>

          <div className="divide-y divide-slate-800/80">
            {order.productos.map((item, idx) => {
              const subtotal = item.cantidad * item.precioUnitario;
              return (
                <div
                  key={item.id || idx}
                  className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-950 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {item.cantidad}x
                      </span>
                      <span className="text-sm sm:text-base font-bold text-white">
                        {item.nombre}
                      </span>
                    </div>
                    {item.variante && (
                      <span className="inline-block text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                        Variante: {item.variante}
                      </span>
                    )}
                    <p className="text-xs text-slate-400">
                      Precio unitario: {formatCurrency(item.precioUnitario)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400 block">Subtotal</span>
                    <span className="text-base font-black text-cyan-300 font-['Outfit',sans-serif]">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Breakdown Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2 border-b border-slate-800 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Estado Financiero
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Pedido
              </span>
              <span className="text-2xl font-black text-white font-['Outfit',sans-serif]">
                {formatCurrency(order.total)}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Monto Pagado / Abonado
              </span>
              <span className="text-2xl font-black text-emerald-300 font-['Outfit',sans-serif]">
                {formatCurrency(order.pagado)}
              </span>
            </div>

            <div
              className={`border rounded-xl p-4 ${
                hasPendingBalance
                  ? 'bg-amber-950/40 border-amber-500/40'
                  : 'bg-emerald-950/40 border-emerald-500/40'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-slate-300">
                Saldo Pendiente
              </span>
              <span
                className={`text-2xl font-black font-['Outfit',sans-serif] ${
                  hasPendingBalance ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {hasPendingBalance ? formatCurrency(order.saldo) : 'Bs. 0 (Pagado)'}
              </span>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTIONS: WHATSAPP + IMPRESIÓN */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              id="send-whatsapp-main-btn"
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-4 px-6 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] shadow-xl shadow-green-600/30 flex items-center justify-center gap-2.5 transition-all"
            >
              <MessageCircle className="w-5 h-5 fill-white/20" />
              <span>Enviar por WhatsApp</span>
            </a>

            <button
              id="print-ticket-main-btn"
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="py-4 px-6 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 active:scale-[0.99] shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2.5 transition-all"
            >
              <Printer className="w-5 h-5" />
              <span>Imprimir Ticket Térmico</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              id="copy-summary-btn"
              onClick={handleCopyReceipt}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">¡Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copiar Resumen de Cobro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Thermal Print Modal */}
      <ThermalPrintModal
        order={order}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </>
  );
};
