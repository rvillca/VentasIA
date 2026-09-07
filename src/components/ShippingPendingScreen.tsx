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
  User,
  Calendar,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Order } from '../types';
import {
  formatCurrency,
  formatBoliviaPhone,
  completeOrderBalanceInFirestore,
  formatArticleItem,
  getWhatsAppUrl,
} from '../lib/storage';
import { OrderPreparationCardModal } from './OrderPreparationCardModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface ShippingPendingScreenProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onToggleStatus: (orderId: string, e?: React.MouseEvent) => void;
}

type ShippingPeriod = 'this_month' | 'all_year';
type ShippingStatusFilter = 'pending' | 'delivered' | 'all';

// Operational labels requested by user:
// - "Listo para Despacho" (en vez de Abierto)
// - "En Camino / Enviado" (cuando tenga transportista o esté en tránsito)
// - "Entregado y Cobrado" (cuando corresponda)
// - "Anulado"
const getOperationalShippingStatus = (order: Order) => {
  if (order.estado === 'Anulado') {
    return {
      label: 'Anulado',
      badgeClass:
        'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30',
      Icon: XCircle,
      stripeClass: 'bg-rose-500',
    };
  }

  if (order.estado === 'Entregado') {
    const isFullyPaid = order.saldo <= 0;
    return {
      label: isFullyPaid ? 'Entregado y Cobrado' : 'Entregado (Saldo Pendiente)',
      badgeClass:
        'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30',
      Icon: CheckCircle2,
      stripeClass: 'bg-emerald-600',
    };
  }

  const hasShipper = Boolean(
    order.enviadoPorNombre ||
    order.despachadoPorNombre ||
    order.fechaEnvio ||
    order.despachadoAt
  );

  if (hasShipper) {
    return {
      label: 'En Camino / Enviado',
      badgeClass:
        'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500/30',
      Icon: Truck,
      stripeClass: 'bg-sky-500',
    };
  }

  return {
    label: 'Listo para Despacho',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30',
    Icon: Package,
    stripeClass: 'bg-amber-500',
  };
};

export const ShippingPendingScreen: React.FC<ShippingPendingScreenProps> = ({
  orders,
  onSelectOrder,
  onToggleStatus,
}) => {
  const { isDark } = useTheme();
  const { isVendedor, role } = useAuth();
  const isVendedorRole = isVendedor || role === 'vendedor';

  // State: default to 'this_month' and 'pending' (pedidos pendientes de enviar)
  const [shippingPeriod, setShippingPeriod] = useState<ShippingPeriod>('this_month');
  const [shippingStatusFilter, setShippingStatusFilter] = useState<ShippingStatusFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [prepOrder, setPrepOrder] = useState<Order | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Date helper without time
  const formatShippingDate = (dateStr: string | number | Date | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Check if date belongs to selected period (this_month vs all_year)
  const isDateInShippingPeriod = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const now = new Date();

    if (shippingPeriod === 'all_year') {
      return d.getFullYear() === now.getFullYear();
    }

    // Default 'this_month':
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  // Base orders filtered by year/month period (excluding canceled and archived)
  const periodOrders = useMemo(() => {
    return orders.filter((o) => !o.archivado && o.estado !== 'Anulado' && isDateInShippingPeriod(o.createdAt));
  }, [orders, shippingPeriod]);

  // Metric counts for the active period
  const totalPendingInPeriod = periodOrders.filter((o) => o.estado === 'Abierto').length;
  const totalDeliveredInPeriod = periodOrders.filter((o) => o.estado === 'Entregado').length;
  const totalPendingSaldo = periodOrders
    .filter((o) => o.estado === 'Abierto')
    .reduce((sum, o) => sum + Math.max(0, o.saldo), 0);
  const totalPaidPendingOrders = periodOrders
    .filter((o) => o.estado === 'Abierto' && o.saldo <= 0).length;

  // Filtered orders to display
  const displayedOrders = useMemo(() => {
    return periodOrders
      .filter((o) => {
        // Status filter: pending (Abierto) by default, or delivered (Entregado), or all
        if (shippingStatusFilter === 'pending') return o.estado === 'Abierto';
        if (shippingStatusFilter === 'delivered') return o.estado === 'Entregado';
        return true;
      })
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
          (o.vendedorNombre && o.vendedorNombre.toLowerCase().includes(term)) ||
          o.productos.some((p) => p.nombre.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [periodOrders, shippingStatusFilter, filterPayment, searchTerm]);

  const handleQuickCompleteBalance = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    if (order.saldo <= 0 || order.estado === 'Anulado') return;
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight">
                  Envíos & Despachos
                </h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isDark
                      ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border-[#FF6FA5]/30'
                      : 'bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20'
                  }`}
                >
                  {totalPendingInPeriod} listos para enviar
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                    isDark ? 'bg-[#0F1B3C] text-[#9AA6C9]' : 'bg-[#F5EFE0] text-[#78716C]'
                  }`}
                >
                  {shippingPeriod === 'this_month' ? '📅 Mes Actual' : '🗓️ Histórico Anual'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Organización clara de paquetes listos para enviar, fichas de WhatsApp y cobros en entrega
              </p>
            </div>
          </div>

          {/* Quick Metrics & Annual Toggle Button */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Botón: Ver todo el año / Ver solo este mes */}
            <button
              type="button"
              id="btn-toggle-shipping-period"
              onClick={() => setShippingPeriod((prev) => (prev === 'this_month' ? 'all_year' : 'this_month'))}
              className={`px-3.5 py-2 rounded-2xl font-bold text-xs border transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                shippingPeriod === 'all_year'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] border-[#FF6FA5] shadow-[#FF6FA5]/25'
                    : 'bg-[#1A2B5C] text-white border-[#1A2B5C] shadow-[#1A2B5C]/25'
                  : isDark
                  ? 'bg-[#0F1B3C] text-white hover:border-[#FF6FA5] border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#1A2B5C] hover:border-[#1A2B5C] border-[#E8DFC8]'
              }`}
              title="Cambia entre el mes actual y todo el año"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{shippingPeriod === 'this_month' ? '🗓️ Ver todo el año' : '📅 Ver solo este mes'}</span>
            </button>

            <div
              className={`border rounded-2xl px-3.5 py-2 text-right ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <span className={`block text-[10px] font-bold uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                {isVendedorRole ? 'Con Saldo Pendiente' : 'Por Cobrar en Destino'}
              </span>
              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                {isVendedorRole
                  ? `${periodOrders.filter((o) => o.estado === 'Abierto' && o.saldo > 0).length} pedidos`
                  : formatCurrency(totalPendingSaldo)}
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

      {/* Primary Status & Payment Filter Bar */}
      <div
        className={`border rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Status Category Tabs: Pendientes (Default) vs Entregados */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-gray-100 dark:border-[#223368]">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <span className={`text-[11px] font-black uppercase tracking-wider pl-1 pr-1 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              Estado de Envío:
            </span>

            {/* Tab: Pendientes de enviar (Default) */}
            <button
              type="button"
              id="shipping-tab-pending"
              onClick={() => setShippingStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                shippingStatusFilter === 'pending'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                    : 'bg-[#1A2B5C] text-white font-black shadow-sm'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendientes de Enviar ({totalPendingInPeriod})</span>
            </button>

            {/* Tab: Ya entregados */}
            <button
              type="button"
              id="shipping-tab-delivered"
              onClick={() => setShippingStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                shippingStatusFilter === 'delivered'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ya Entregados ({totalDeliveredInPeriod})</span>
            </button>

            {/* Tab: Todos */}
            <button
              type="button"
              id="shipping-tab-all"
              onClick={() => setShippingStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                shippingStatusFilter === 'all'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                    : 'bg-[#1A2B5C] text-white font-black shadow-sm'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
              }`}
            >
              Todos ({periodOrders.length})
            </button>
          </div>

          <div className="text-[11px] font-semibold text-[#78716C] dark:text-[#9AA6C9]">
            {shippingPeriod === 'this_month' ? 'Periodo: Mes en curso' : 'Periodo: Histórico anual completo'}
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
              placeholder="Buscar por cliente, destino, vendedora, producto o # pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full border rounded-xl py-2 pl-10 pr-4 text-xs sm:text-sm focus:outline-none transition ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
              }`}
            />
          </div>

          {/* Quick Payment filter */}
          <div
            className={`flex items-center gap-1.5 border p-1 rounded-xl shrink-0 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <button
              type="button"
              onClick={() => setFilterPayment('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterPayment === 'all'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] shadow-xs'
                    : 'bg-[#1A2B5C] text-white shadow-xs'
                  : isDark
                  ? 'text-[#9AA6C9] hover:text-white'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Todos los cobros
            </button>
            <button
              type="button"
              onClick={() => setFilterPayment('unpaid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterPayment === 'paid'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-600 dark:text-emerald-400 hover:opacity-80'
              }`}
            >
              100% Pagados
            </button>
          </div>
        </div>
      </div>

      {/* Displayed Orders List */}
      {displayedOrders.length === 0 ? (
        <div
          className={`border rounded-3xl p-8 sm:p-12 text-center space-y-3 ${
            isDark ? 'bg-[#16234F]/80 border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
            {shippingStatusFilter === 'pending'
              ? '¡No hay pedidos pendientes de envío!'
              : 'No se encontraron pedidos con este filtro'}
          </h3>
          <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            {searchTerm
              ? 'No se encontraron resultados con ese criterio de búsqueda.'
              : shippingStatusFilter === 'pending'
              ? 'Todos los pedidos de este periodo han sido despachados y entregados satisfactoriamente.'
              : 'Prueba cambiando los filtros de fecha o estado de envío.'}
          </p>
          {shippingPeriod === 'this_month' && (
            <button
              type="button"
              onClick={() => setShippingPeriod('all_year')}
              className="mt-2 py-2 px-4 rounded-xl border text-xs font-bold transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Consultar todo el historial del año
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {displayedOrders.map((order) => {
            const totalPiezas = order.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
            const isFullyPaid = order.saldo <= 0;
            const isDelivered = order.estado === 'Entregado';
            const statusInfo = getOperationalShippingStatus(order);
            const StatusIcon = statusInfo.Icon;

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
                  className={`absolute top-0 left-0 right-0 h-1.5 ${statusInfo.stripeClass}`}
                />

                {/* Top: Order #, Date, Human Status Label */}
                <div className="flex items-start justify-between gap-2 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
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
                        className={`font-black text-sm sm:text-base transition ${
                          isDark
                            ? 'text-white group-hover:text-[#FF6FA5]'
                            : 'text-[#1A2B5C] group-hover:text-[#253B7A]'
                        }`}
                      >
                        {order.cliente || 'Cliente sin nombre'}
                      </h3>
                    </div>

                    {/* Clean Date without time */}
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-[#78716C] dark:text-[#9AA6C9]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatShippingDate(order.createdAt)}
                      </span>
                      {order.telefono && (
                        <span className="flex items-center gap-1 text-[#1A2B5C] dark:text-white">
                          <Phone className="w-3 h-3" />
                          {formatBoliviaPhone(order.telefono)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Claridad Visual: Estado en Lenguaje Operativo Claro */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${statusInfo.badgeClass}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>
                </div>

                {/* Location & Seller Info */}
                <div className="space-y-1 text-xs">
                  {order.lugarEntrega && (
                    <div
                      className={`flex items-center gap-1.5 font-bold ${
                        isDark ? 'text-white' : 'text-[#1A2B5C]'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-[#FF6FA5] shrink-0" />
                      <span className="truncate">Destino: {order.lugarEntrega}</span>
                    </div>
                  )}
                  {order.vendedorNombre && (
                    <div
                      className={`flex items-center gap-1 text-[11px] font-semibold ${
                        isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                      }`}
                    >
                      <User className="w-3 h-3 text-[#FF6FA5]" />
                      <span>Vendedor(a): {order.vendedorNombre}</span>
                    </div>
                  )}
                </div>

                {/* Clear Human Delivery & Payment Instruction Strip */}
                <div
                  className={`rounded-2xl p-2.5 text-xs font-bold border flex items-center justify-between gap-2 ${
                    isFullyPaid
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-300'
                      : 'bg-amber-50/90 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isFullyPaid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {isFullyPaid
                        ? 'Cobro 100% Pagado (Entrega directa, no cobrar dinero)'
                        : isVendedorRole
                        ? 'Cobrar saldo pendiente al cliente al momento de la entrega'
                        : `Cobrar en destino: ${formatCurrency(order.saldo)} al entregar`}
                    </span>
                  </div>
                  {!isVendedorRole && (
                    <span className="font-black text-xs font-mono shrink-0">
                      Total: {formatCurrency(order.total)}
                    </span>
                  )}
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
                    <span>Artículos para empaque ({totalPiezas} piezas)</span>
                    <span className="text-[10px] text-gray-400">Detalle</span>
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
                          {formatArticleItem(prod)}
                        </span>
                        {!isVendedorRole ? (
                          <span className={`font-mono text-[11px] shrink-0 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                            {formatCurrency(prod.cantidad * prod.precioUnitario)}
                          </span>
                        ) : (
                          <span className={`text-[11px] font-semibold shrink-0 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                            Cant: {prod.cantidad}
                          </span>
                        )}
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

                  {/* 1-Click Complete balance button if pending (Only Supervisor and Jefe) */}
                  {!isFullyPaid && !isVendedorRole && (
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

                  {/* Mark as delivered or toggle status */}
                  <button
                    id={`btn-deliver-${order.id}`}
                    type="button"
                    onClick={(e) => onToggleStatus(order.id, e)}
                    className={`py-2 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      isDelivered
                        ? isDark
                          ? 'bg-[#0F1B3C] border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                        : isDark
                        ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-white'
                        : 'bg-[#FBF7EF] hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
                    }`}
                    title={isDelivered ? 'Hacer clic para marcar como no despachado' : 'Marcar como entregado y despachado'}
                  >
                    {isDelivered ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Entregado</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Marcar Entregado</span>
                      </>
                    )}
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
          isOpen={!!prepOrder}
          onClose={() => setPrepOrder(null)}
          onDelivered={() => {
            onToggleStatus(prepOrder.id);
            setPrepOrder(null);
          }}
        />
      )}
    </div>
  );
};
