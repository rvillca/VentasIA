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
  Sparkles,
  Share2,
  Truck,
  UserCheck,
} from 'lucide-react';
import { Order } from '../types';
import {
  formatCurrency,
  generateWhatsAppReceiptText,
  getWhatsAppUrl,
  completeOrderBalanceInFirestore,
  formatArticleItem,
} from '../lib/storage';
import { ThermalPrintModal } from './ThermalPrintModal';
import { OrderPreparationCardModal } from './OrderPreparationCardModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

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
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [isCompletingBalance, setIsCompletingBalance] = useState(false);

  const isDelivered = order.estado === 'Entregado';
  const isAnulado = order.estado === 'Anulado';
  const hasPendingBalance = order.saldo > 0 && !isAnulado;
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

  const handleCompleteBalance = async () => {
    if (!hasPendingBalance) return;
    setIsCompletingBalance(true);
    try {
      await completeOrderBalanceInFirestore(order.id, order.total);
    } catch (err) {
      console.error('Error completing balance:', err);
    } finally {
      setIsCompletingBalance(false);
    }
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            id="detail-back-btn"
            onClick={onBack}
            className={`p-2.5 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 border cursor-pointer ${
              isDark
                ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Ventas</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Warehouse prep slip for WhatsApp */}
            <button
              id="detail-prep-modal-btn"
              onClick={() => setIsPrepModalOpen(true)}
              className={`p-2.5 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 border cursor-pointer ${
                isDark
                  ? 'bg-[#1E2D5A] hover:bg-[#283C75] text-[#FF6FA5] border-[#223368]'
                  : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border-[#E8DFC8]'
              }`}
              title="Abrir ficha visual de preparación para WhatsApp / Almacén"
            >
              <Package className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
              <span>Ficha WhatsApp</span>
            </button>

            <button
              id="detail-print-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className={`p-2.5 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 border cursor-pointer ${
                isDark
                  ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                  : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
              }`}
              title="Reimprimir ticket de pedido en impresora térmica"
            >
              <Printer className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
              <span>Ticket</span>
            </button>

            {!isAnulado && (
              <button
                id="detail-edit-btn"
                onClick={() => onEdit(order)}
                className={`p-2.5 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 border cursor-pointer ${
                  isDark
                    ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                    : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
                }`}
                title="Editar pedido"
              >
                <Edit3 className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}

            {/* VENDEDOR / SUPERVISOR / JEFE: Anular Venta */}
            {!isAnulado && (
              <button
                id="detail-anular-btn"
                onClick={() => setShowAnularModal(true)}
                className={`p-2.5 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 border cursor-pointer ${
                  isDark
                    ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-800/40'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                }`}
                title="Anular venta"
              >
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Anular</span>
              </button>
            )}

            {/* SOLO JEFE / ADMIN: Eliminar definitivamente */}
            {canDeleteOrders && (
              <button
                id="detail-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer"
                title="Eliminar permanentemente (Solo Jefa)"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal de Anulación de Venta */}
        {showAnularModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up ${
              isDark ? 'bg-[#16234F] border-[#FFA26B]/50' : 'bg-white border-[#E8DFC8]'
            }`}>
              <div className={`flex items-center gap-3 ${isDark ? 'text-[#FFA26B]' : 'text-[#C2410C]'}`}>
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className={`text-lg font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  Anular Pedido #{order.orderNumber}
                </h3>
              </div>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Esta venta quedará registrada como <strong>Anulada</strong> para el control. Por favor indica el motivo:
              </p>
              <textarea
                required
                rows={3}
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="ej: La clienta canceló por demora / Sin stock..."
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FFA26B]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnularModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                    isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-white border-[#223368]'
                      : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border-[#E8DFC8]'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!motivoAnulacion.trim()}
                  onClick={handleConfirmAnulacion}
                  className={`px-4 py-2 rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? 'bg-[#FFA26B] hover:bg-[#ff8f4d] text-[#7C2D12]'
                      : 'bg-[#C2410C] hover:bg-[#9A3412] text-white'
                  }`}
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
            className={`p-4 border rounded-2xl space-y-3 shadow-2xl animate-fade-in ${
              isDark ? 'bg-rose-950/90 border-rose-700/60 text-white' : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <p className="font-bold text-sm">
              ¿Estás segura de que deseas eliminar permanentemente este pedido #{order.orderNumber} de la base de datos?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onDelete(order.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Sí, eliminar definitivamente
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors border cursor-pointer ${
                  isDark
                    ? 'bg-[#0F1B3C] hover:bg-[#16234F] text-white border-[#223368]'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Banner if Anulado */}
        {isAnulado && (
          <div className={`p-4 border rounded-2xl space-y-1 ${
            isDark ? 'bg-rose-950/80 border-rose-700/80 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              <XCircle className="w-5 h-5 text-rose-500" />
              <span>ESTA VENTA ESTÁ ANULADA</span>
            </div>
            {order.motivoAnulacion && (
              <p className="text-xs">
                <strong>Motivo:</strong> {order.motivoAnulacion}
              </p>
            )}
            {order.anuladoPor && (
              <p className="text-[11px] opacity-80">
                Anulado por: {order.anuladoPor} · {order.anuladoAt ? new Date(order.anuladoAt).toLocaleString('es-BO') : ''}
              </p>
            )}
          </div>
        )}

        {/* Main Order Header Card */}
        <div className={`border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
            isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-black font-mono px-2.5 py-1 rounded-xl border ${
                  isDark
                    ? 'text-[#FF6FA5] bg-[#0F1B3C] border-[#223368]'
                    : 'text-[#1A2B5C] bg-[#F5EFE0] border-[#E8DFC8]'
                }`}>
                  VENTA #{String(order.orderNumber).padStart(3, '0')}
                </span>
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                    isAnulado
                      ? isDark
                        ? 'bg-[#FCA5A5] text-[#881337] border-[#FCA5A5]'
                        : 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                      : isDelivered
                      ? isDark
                        ? 'bg-[#4FD1B5] text-[#064E3B] border-[#4FD1B5]'
                        : 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]'
                      : isDark
                      ? 'bg-[#B39DDB] text-[#2E1065] border-[#B39DDB]'
                      : 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]'
                  }`}
                >
                  {isAnulado ? (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Anulado</span>
                    </>
                  ) : isDelivered ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Entregado</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>Abierto (En Preparación)</span>
                    </>
                  )}
                </span>
              </div>
              <h1 className={`text-2xl sm:text-3xl font-black font-['Outfit',sans-serif] ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                {order.cliente || 'Clienta sin nombre'}
              </h1>
              <div className={`flex flex-wrap items-center gap-3 text-xs mt-1 capitalize ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                <span className="flex items-center gap-1">
                  <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                  {formattedDate}
                </span>
                {order.vendedorNombre && (
                  <span className={`flex items-center gap-1 font-medium ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    <User className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                    Vendedora: <strong>{order.vendedorNombre}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Toggle Status Button (if not anulado) */}
            {!isAnulado && (
              <button
                id="detail-toggle-status-btn"
                onClick={() => onToggleStatus(order.id)}
                className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer ${
                  isDelivered
                    ? isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-white border border-[#223368]'
                      : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border border-[#E8DFC8]'
                    : isDark
                    ? 'bg-[#4FD1B5] hover:bg-[#38b2ac] text-[#064E3B]'
                    : 'bg-[#0F766E] hover:bg-[#0D9488] text-white'
                }`}
              >
                {isDelivered ? (
                  <>
                    <Clock className="w-4 h-4" />
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

          {/* Responsables: Venta vs Despacho / Envío */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Venta Registrada Por */}
            <div className={`border rounded-2xl p-3.5 flex items-center gap-3 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#16234F] text-[#FF6FA5]' : 'bg-[#E8DFC8]/60 text-[#1A2B5C]'
              }`}>
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}>
                  Venta Registrada Por
                </span>
                <span className={`text-sm font-bold truncate block ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  {order.vendedorNombre || 'Sin asignar'}
                </span>
              </div>
            </div>

            {/* Envío / Despacho Realizado Por */}
            <div className={`border rounded-2xl p-3.5 flex items-center gap-3 ${
              isDelivered
                ? isDark
                  ? 'bg-emerald-950/40 border-emerald-800/50'
                  : 'bg-emerald-50/60 border-emerald-200'
                : isDark
                ? 'bg-[#0F1B3C] border-[#223368]'
                : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDelivered
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : isDark
                  ? 'bg-[#16234F] text-amber-400'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                  isDelivered
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isDark
                    ? 'text-[#9AA6C9]'
                    : 'text-[#78716C]'
                }`}>
                  {isDelivered ? 'Envío / Despacho Realizado Por' : 'Estado de Despacho'}
                </span>
                <span className={`text-sm font-bold truncate block ${
                  isDelivered
                    ? isDark
                      ? 'text-emerald-300'
                      : 'text-emerald-900'
                    : isDark
                    ? 'text-amber-300'
                    : 'text-amber-800'
                }`}>
                  {isDelivered
                    ? order.enviadoPorNombre || order.despachadoPorNombre || order.vendedorNombre || 'Despachado'
                    : '⏳ Pendiente de despacho'}
                </span>
                {isDelivered && (order.fechaEnvio || order.despachadoAt) && (
                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 block">
                    {new Date(order.fechaEnvio || order.despachadoAt!).toLocaleString('es-BO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer contact & Delivery details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Phone */}
            <div className={`border rounded-2xl p-3.5 flex items-center justify-between gap-2 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-[#16234F] text-[#FF6FA5]' : 'bg-[#E8DFC8]/60 text-[#1A2B5C]'
                }`}>
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}>
                    Teléfono / WhatsApp
                  </span>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    {order.telefono || 'No registrado'}
                  </span>
                </div>
              </div>
              {order.telefono && (
                <a
                  href={`tel:${order.telefono}`}
                  className={`p-2 rounded-xl text-xs font-semibold border ${
                    isDark
                      ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                      : 'bg-white hover:bg-[#EBE2CF] text-[#1A2B5C] border-[#E8DFC8]'
                  }`}
                  title="Llamar"
                >
                  Llamar
                </a>
              )}
            </div>

            {/* Delivery location */}
            <div className={`border rounded-2xl p-3.5 flex items-center gap-3 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#16234F] text-[#B39DDB]' : 'bg-[#E8DFC8]/60 text-[#1A2B5C]'
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}>
                  Lugar de Entrega / Envío
                </span>
                <span className={`text-sm font-bold truncate block ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  {order.lugarEntrega || 'No especificado'}
                </span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {order.observaciones && (
            <div className={`border rounded-2xl p-3.5 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}>
              <span className={`block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                Observaciones / Notas
              </span>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                {order.observaciones}
              </p>
            </div>
          )}
        </div>

        {/* Itemized Products Card */}
        <div className={`border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <h2 className={`text-base sm:text-lg font-bold font-['Outfit',sans-serif] flex items-center gap-2 border-b pb-3 ${
            isDark ? 'text-white border-[#223368]' : 'text-[#1A2B5C] border-[#E8DFC8]'
          }`}>
            <Package className={`w-5 h-5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
            Detalle de Artículos ({order.productos.length})
          </h2>

          <div className={`divide-y ${isDark ? 'divide-[#223368]' : 'divide-[#E8DFC8]'}`}>
            {order.productos.map((item, idx) => {
              const subtotal = item.cantidad * item.precioUnitario;
              return (
                <div
                  key={item.id || idx}
                  className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                        {formatArticleItem(item)}
                      </span>
                    </div>
                    {item.cantidad > 1 && (
                      <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                        Precio unitario: {formatCurrency(item.precioUnitario)} c/u
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs block ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Subtotal</span>
                    <span className={`text-base font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Breakdown Card with 1-Click Complete Balance */}
        <div className={`border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
          }`}>
            <h2 className={`text-base font-bold font-['Outfit',sans-serif] flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}>
              <DollarSign className={`w-5 h-5 ${isDark ? 'text-[#4FD1B5]' : 'text-[#0F766E]'}`} />
              Estado Financiero (Bolivianos)
            </h2>

            {/* 1-Click Complete Balance Button */}
            {hasPendingBalance && (
              <button
                id="complete-balance-direct-btn"
                type="button"
                disabled={isCompletingBalance}
                onClick={handleCompleteBalance}
                className={`py-2 px-3.5 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition disabled:opacity-50 cursor-pointer ${
                  isDark
                    ? 'bg-[#4FD1B5] hover:bg-[#38b2ac] text-[#064E3B]'
                    : 'bg-[#0F766E] hover:bg-[#0D9488] text-white'
                }`}
                title="Completar saldo inmediatamente sin entrar a editar"
              >
                <DollarSign className="w-4 h-4" />
                <span>{isCompletingBalance ? 'Completando...' : 'Liquidar Saldo (100% Pagado)'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className={`border rounded-2xl p-4 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Total Pedido
              </span>
              <span className={`text-2xl font-black font-['Outfit',sans-serif] ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                {formatCurrency(order.total)}
              </span>
            </div>

            <div className={`border rounded-2xl p-4 ${
              isDark ? 'bg-[#0F1B3C] border-[#4FD1B5]/30' : 'bg-[#E6FFFA] border-[#99F6E4]'
            }`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                isDark ? 'text-[#4FD1B5]' : 'text-[#0D9488]'
              }`}>
                Monto Pagado / Abonado
              </span>
              <span className={`text-2xl font-black font-['Outfit',sans-serif] ${
                isDark ? 'text-[#4FD1B5]' : 'text-[#0F766E]'
              }`}>
                {formatCurrency(order.pagado)}
              </span>
            </div>

            <div
              className={`border rounded-2xl p-4 flex flex-col justify-between ${
                hasPendingBalance
                  ? isDark
                    ? 'bg-[#0F1B3C] border-[#FFA26B]/40'
                    : 'bg-[#FFF7ED] border-[#FED7AA]'
                  : isDark
                  ? 'bg-[#0F1B3C] border-[#4FD1B5]/40'
                  : 'bg-[#E6FFFA] border-[#99F6E4]'
              }`}
            >
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                  hasPendingBalance
                    ? isDark ? 'text-[#FFA26B]' : 'text-[#EA580C]'
                    : isDark ? 'text-[#4FD1B5]' : 'text-[#0D9488]'
                }`}>
                  Saldo Pendiente
                </span>
                <span
                  className={`text-2xl font-black font-['Outfit',sans-serif] ${
                    hasPendingBalance
                      ? isDark ? 'text-[#FFA26B]' : 'text-[#C2410C]'
                      : isDark ? 'text-[#4FD1B5]' : 'text-[#0F766E]'
                  }`}
                >
                  {hasPendingBalance ? formatCurrency(order.saldo) : 'Bs. 0 (Pagado)'}
                </span>
              </div>
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
              className={`py-4 px-6 rounded-2xl font-black text-base active:scale-[0.99] shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#4FD1B5] hover:bg-[#38b2ac] text-[#064E3B] shadow-[#4FD1B5]/25'
                  : 'bg-[#0F766E] hover:bg-[#0D9488] text-white shadow-[#0F766E]/25'
              }`}
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>Enviar Recibo WhatsApp</span>
            </a>

            <button
              id="print-ticket-main-btn"
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className={`py-4 px-6 rounded-2xl font-black text-base active:scale-[0.99] shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
              }`}
            >
              <Printer className="w-5 h-5" />
              <span>Imprimir Ticket Térmico</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              id="prep-ticket-secondary-btn"
              onClick={() => setIsPrepModalOpen(true)}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                isDark
                  ? 'bg-[#1E2D5A] hover:bg-[#283C75] text-[#FF6FA5] border-[#223368]'
                  : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border-[#E8DFC8]'
              }`}
            >
              <Package className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
              <span>Ficha WhatsApp para Almacén / Empaque</span>
            </button>

            <button
              id="copy-summary-btn"
              onClick={handleCopyReceipt}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                isDark
                  ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                  : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">¡Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
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

      {/* Warehouse Dispatch Preparation Slip Modal */}
      {isPrepModalOpen && (
        <OrderPreparationCardModal
          order={order}
          onClose={() => setIsPrepModalOpen(false)}
        />
      )}
    </>
  );
};
