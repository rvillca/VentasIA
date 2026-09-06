import React from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Gift,
  Crown,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Sparkles,
  Award,
} from 'lucide-react';
import { Order } from '../../types';
import { formatCurrency, formatBoliviaPhone, formatArticleItem } from '../../lib/storage';
import { useFinancialPrivacy } from '../../contexts/FinancialPrivacyContext';
import { TopClientData } from './TopClientsReport';

interface ClientDetailModalProps {
  client: TopClientData | null;
  onClose: () => void;
  onSendGiftWhatsApp: (client: TopClientData) => void;
  onSendWholesalerInviteWhatsApp: (client: TopClientData) => void;
  onSelectOrder?: (orderId: string) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onSendGiftWhatsApp,
  onSendWholesalerInviteWhatsApp,
}) => {
  const { formatBalance } = useFinancialPrivacy();

  if (!client) return null;

  return (
    <div
      id="client-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="client-detail-modal-content"
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E8DFC8] overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1A2B5C] via-[#243B7A] to-[#1A2B5C] text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              {client.tier === 'mayorista_vip' ? (
                <Crown className="w-6 h-6" />
              ) : client.isGiftCandidate ? (
                <Gift className="w-6 h-6" />
              ) : (
                <Award className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] text-white leading-tight">
                  {client.nombre}
                </h2>
                {client.tier === 'mayorista_vip' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-900 flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3" /> Mayorista VIP
                  </span>
                )}
                {client.isGiftCandidate && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/90 text-white flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Candidato a Regalo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-white/80 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-emerald-300" />
                  {formatBoliviaPhone(client.telefono)}
                </span>
                {client.destinoPrincipal && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-300" />
                    {client.destinoPrincipal}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Metrics + Actions + Order History */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E8DFC8]">
              <span className="text-[10px] font-bold text-[#78716C] uppercase block mb-0.5">
                Total Comprado
              </span>
              <span className="text-base sm:text-lg font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                {formatBalance(client.totalComprado)}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                Pagado: {formatBalance(client.totalPagado)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E8DFC8]">
              <span className="text-[10px] font-bold text-[#78716C] uppercase block mb-0.5">
                N° Pedidos
              </span>
              <span className="text-base sm:text-lg font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                {client.cantidadPedidos}
              </span>
              <span className="text-[10px] text-[#78716C] block mt-0.5">
                {client.cantidadPedidos === 1 ? 'Compra única' : 'Cliente recurrente'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF7EF] border border-[#E8DFC8]">
              <span className="text-[10px] font-bold text-[#78716C] uppercase block mb-0.5">
                Ticket Promedio
              </span>
              <span className="text-base sm:text-lg font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                {formatBalance(client.ticketPromedio)}
              </span>
              <span className="text-[10px] text-[#78716C] block mt-0.5">
                Por pedido
              </span>
            </div>

            <div className={`p-3 rounded-2xl border ${
              client.totalSaldo > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <span className={`text-[10px] font-bold uppercase block mb-0.5 ${
                client.totalSaldo > 0 ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                Estado de Cuenta
              </span>
              <span className={`text-base sm:text-lg font-black font-['Outfit',sans-serif] block ${
                client.totalSaldo > 0 ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {client.totalSaldo > 0 ? formatBalance(client.totalSaldo) : 'Al día (0)'}
              </span>
              <span className={`text-[10px] font-bold block mt-0.5 ${
                client.totalSaldo > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {client.totalSaldo > 0 ? 'Saldo por cobrar' : '100% Pagado'}
              </span>
            </div>
          </div>

          {/* Fidelization Action Buttons for Gifts & Wholesaler Community */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FDFBF7] to-[#F5EFE0] border border-[#E8DFC8] space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1A2B5C]">
                Herramientas de Fidelización & Reconocimiento
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onSendGiftWhatsApp(client)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Gift className="w-4 h-4 text-pink-200" />
                <span>Enviar Notificación de Regalo (WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={() => onSendWholesalerInviteWhatsApp(client)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-200" />
                <span>Invitar a Grupo Mayorista VIP (WhatsApp)</span>
              </button>
            </div>
          </div>

          {/* Top Products Purchased by this client */}
          {client.productosComprados && client.productosComprados.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#1A2B5C] flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-[#1A2B5C]" />
                Artículos Favoritos Más Comprados
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {client.productosComprados.slice(0, 4).map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-[#E8DFC8] bg-white flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[#1A2B5C] truncate pr-2">
                      {p.nombre}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#1A2B5C]/10 text-[#1A2B5C] font-black shrink-0 font-['Outfit',sans-serif]">
                      {p.cantidad} u.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#1A2B5C] flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#1A2B5C]" />
                Historial de Pedidos Realizados ({client.pedidos.length})
              </h4>
              <span className="text-[11px] text-[#78716C]">
                Último: {client.ultimoPedidoTexto}
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {client.pedidos.map((order) => {
                const dateStr = new Date(order.createdAt).toLocaleDateString('es-BO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const isPaid = (order.saldo || 0) <= 0;

                return (
                  <div
                    key={order.id}
                    className="p-3 rounded-xl border border-[#E8DFC8] bg-white hover:border-[#1A2B5C]/30 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#1A2B5C] text-white font-mono font-bold text-[11px]">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[11px] text-[#78716C]">{dateStr}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.estado === 'Entregado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.estado === 'Abierto'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {order.estado}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716C] mt-1 truncate max-w-sm">
                        {order.productos.map((p) => formatArticleItem(p)).join(', ')}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                        {formatBalance(order.total)}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isPaid ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isPaid ? '100% Pagado' : `Saldo: ${formatBalance(order.saldo)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FBF7EF] border-t border-[#E8DFC8] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#1A2B5C] hover:bg-[#243B7A] text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
