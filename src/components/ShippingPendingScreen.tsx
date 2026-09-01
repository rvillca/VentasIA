import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  Share2,
  DollarSign,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Order } from '../types';
import {
  formatCurrency,
  formatBoliviaPhone,
  completeOrderBalanceInFirestore,
} from '../lib/storage';
import { OrderPreparationCardModal } from './OrderPreparationCardModal';
import { useTheme } from '../contexts/ThemeContext';

interface ShippingPendingScreenProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onToggleStatus: (orderId: string, e?: React.MouseEvent) => void;
}

export const ShippingPendingScreen: React.FC<ShippingPendingScreenProps> = ({
  orders,
  onSelectOrder,
  onToggleStatus,
}) => {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [prepOrder, setPrepOrder] = useState<Order | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Filter only active, non-delivered, non-canceled orders
  const pendingOrders = useMemo(() => {
    return orders
      .filter((o) => o.estado === 'Abierto')
      .filter((o) => {
        if (filterPayment === 'unpaid') return o.saldo > 0;
        if (filterPayment === 'paid') return o.saldo <= 0;
        return true;
      })
      .filter((o) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          o.cliente.toLowerCase().includes(term) ||
          o.lugarEntrega.toLowerCase().includes(term) ||
          o.telefono.includes(term) ||
          `#${o.orderNumber}`.includes(term) ||
          o.productos.some((p) => p.nombre.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchTerm, filterPayment]);

  const totalPendingOrders = orders.filter((o) => o.estado === 'Abierto').length;
  const totalPendingSaldo = orders
    .filter((o) => o.estado === 'Abierto')
    .reduce((sum, o) => sum + Math.max(0, o.saldo), 0);
  const totalPaidPendingOrders = orders
    .filter((o) => o.estado === 'Abierto' && o.saldo <= 0).length;

  const handleQuickCompleteBalance = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    if (order.saldo <= 0) return;
    setCompletingId(order.id);
    try {
      await completeOrderBalanceInFirestore(order.id, order.total);
    } catch (err) {
      console.error('Error completing balance:', err);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6 space-y-5">
      {/* Header Banner */}
      <div
        className={`border rounded-3xl p-4 sm:p-6 shadow-sm transition-colors ${
          isDark
            ? 'bg-[#16234F] border-[#223368] text-white'
            : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight">
                  Pendientes de Envío & Despacho
                </h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isDark
                      ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border-[#FF6FA5]/30'
                      : 'bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20'
                  }`}
                >
                  {totalPendingOrders} en cola
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Prepara paquetes, envía fichas al grupo de WhatsApp y liquida cobros en destino
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`border rounded-2xl px-3.5 py-2 text-right ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <span className={`block text-[10px] font-bold uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Por Cobrar en Destino
              </span>
              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                {formatCurrency(totalPendingSaldo)}
              </span>
            </div>

            <div
              className={`border rounded-2xl px-3.5 py-2 text-right ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <span className={`block text-[10px] font-bold uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                100% Pagados
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {totalPaidPendingOrders} pedidos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}
          />
          <input
            id="shipping-search-input"
            type="text"
            placeholder="Buscar por clienta, destino, producto o # pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm focus:outline-none transition ${
              isDark
                ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
            }`}
          />
        </div>

        {/* Filter buttons */}
        <div
          className={`flex items-center gap-1.5 border p-1.5 rounded-2xl shrink-0 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <button
            type="button"
            onClick={() => setFilterPayment('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterPayment === 'all'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] shadow-sm'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Todos ({totalPendingOrders})
          </button>
          <button
            type="button"
            onClick={() => setFilterPayment('unpaid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterPayment === 'unpaid'
                ? 'bg-amber-600 text-white'
                : 'text-amber-600 dark:text-amber-400 hover:opacity-80'
            }`}
          >
            Con Saldo
          </button>
          <button
            type="button"
            onClick={() => setFilterPayment('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterPayment === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-600 dark:text-emerald-400 hover:opacity-80'
            }`}
          >
            Pagados ({totalPaidPendingOrders})
          </button>
        </div>
      </div>

      {/* Pending Orders List */}
      {pendingOrders.length === 0 ? (
        <div
          className={`border rounded-3xl p-8 sm:p-12 text-center space-y-3 ${
            isDark ? 'bg-[#16234F]/80 border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
            ¡No hay pedidos pendientes de envío!
          </h3>
          <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            {searchTerm
              ? 'No se encontraron resultados con ese criterio de búsqueda.'
              : 'Todos los pedidos activos han sido despachados y entregados satisfactoriamente.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {pendingOrders.map((order) => {
            const totalPiezas = order.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
            const isFullyPaid = order.saldo <= 0;

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className={`border rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group cursor-pointer space-y-3 relative overflow-hidden ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] hover:border-[#FF6FA5]/50'
                    : 'bg-white border-[#E8DFC8] hover:border-[#1A2B5C]/30'
                }`}
              >
                {/* Accent top stripe */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isFullyPaid ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />

                {/* Top: Order Number & Destination */}
                <div className="flex items-start justify-between gap-2 pt-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-black text-xs font-mono px-2 py-0.5 rounded-lg border ${
                          isDark
                            ? 'bg-[#0F1B3C] text-[#FF6FA5] border-[#223368]'
                            : 'bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]'
                        }`}
                      >
                        #{String(order.orderNumber).padStart(3, '0')}
                      </span>
                      <h3
                        className={`font-bold text-sm transition ${
                          isDark
                            ? 'text-white group-hover:text-[#FF6FA5]'
                            : 'text-[#1A2B5C] group-hover:text-[#253B7A]'
                        }`}
                      >
                        {order.cliente || 'Clienta sin nombre'}
                      </h3>
                    </div>
                    {order.lugarEntrega && (
                      <div
                        className={`flex items-center gap-1.5 mt-1 text-xs ${
                          isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#FF6FA5] shrink-0" />
                        <span className="font-bold truncate">{order.lugarEntrega}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment status badge */}
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border shrink-0 ${
                      isFullyPaid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30'
                    }`}
                  >
                    {isFullyPaid ? '✅ Pagado Total' : `⚠️ Saldo: ${formatCurrency(order.saldo)}`}
                  </span>
                </div>

                {/* Items Summary */}
                <div
                  className={`border rounded-2xl p-2.5 space-y-1 text-xs ${
                    isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between text-[10px] uppercase font-bold ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  >
                    <span>Artículos ({totalPiezas} piezas)</span>
                    <span>Total: {formatCurrency(order.total)}</span>
                  </div>
                  <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                    {order.productos.map((prod, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between text-xs ${
                          isDark ? 'text-[#E2E8F0]' : 'text-[#1A2B5C]'
                        }`}
                      >
                        <span className="truncate">
                          <strong className={isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}>
                            {prod.cantidad}x
                          </strong>{' '}
                          {prod.nombre}
                          {prod.variante && ` (${prod.variante})`}
                        </span>
                        <span className={`font-mono text-[11px] shrink-0 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                          {formatCurrency(prod.cantidad * prod.precioUnitario)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special observation */}
                {order.observaciones && order.observaciones.trim() && (
                  <p
                    className={`text-[11px] italic border rounded-xl px-2.5 py-1 truncate ${
                      isDark
                        ? 'bg-[#0F1B3C]/80 border-[#223368] text-[#9AA6C9]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#78716C]'
                    }`}
                  >
                    📝 {order.observaciones.trim()}
                  </p>
                )}

                {/* Quick Actions Bar */}
                <div
                  className={`flex flex-wrap items-center gap-2 pt-2 border-t ${
                    isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                  }`}
                >
                  {/* Preparation sheet / WhatsApp photo button */}
                  <button
                    id={`btn-prep-modal-${order.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrepOrder(order);
                    }}
                    className={`flex-1 py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer ${
                      isDark
                        ? 'bg-[#FF6FA5] text-[#0F1B3C] hover:bg-[#ff85b3]'
                        : 'bg-[#1A2B5C] text-white hover:bg-[#253B7A]'
                    }`}
                    title="Abrir ficha visual de preparación y foto para WhatsApp"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Ficha WhatsApp</span>
                  </button>

                  {/* 1-Click Complete balance button if pending */}
                  {!isFullyPaid && (
                    <button
                      id={`btn-complete-balance-${order.id}`}
                      type="button"
                      disabled={completingId === order.id}
                      onClick={(e) => handleQuickCompleteBalance(order, e)}
                      className="py-2 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Completar saldo en 1 clic (marcar 100% pagado)"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{completingId === order.id ? 'Guardando...' : 'Liquidar Saldo'}</span>
                    </button>
                  )}

                  {/* Mark as delivered button */}
                  <button
                    id={`btn-deliver-${order.id}`}
                    type="button"
                    onClick={(e) => onToggleStatus(order.id, e)}
                    className={`py-2 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
                      isDark
                        ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-white'
                        : 'bg-[#FBF7EF] hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
                    }`}
                    title="Marcar como entregado y despachado"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">Despachado</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preparation Modal */}
      {prepOrder && (
        <OrderPreparationCardModal
          order={prepOrder}
          onClose={() => setPrepOrder(null)}
        />
      )}
    </div>
  );
};
