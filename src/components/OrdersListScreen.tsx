import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  Package,
  MapPin,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  X,
  Printer,
  XCircle,
  User,
  DollarSign,
  Share2,
  Truck,
  Calendar,
  Archive,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import {
  formatCurrency,
  getWhatsAppUrl,
  completeOrderBalanceInFirestore,
  formatArticleItem,
} from '../lib/storage';
import { ThermalPrintModal } from './ThermalPrintModal';
import { OrderPreparationCardModal } from './OrderPreparationCardModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFinancialPrivacy } from '../contexts/FinancialPrivacyContext';
import { BalanceToggleBtn } from './BalanceToggleBtn';
import { computeMonthlySalesStats } from '../lib/roleMetrics';

interface OrdersListScreenProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onNewOrder: () => void;
  onToggleStatus: (orderId: string, e: React.MouseEvent) => void;
}

type FilterType = 'all' | 'Abierto' | 'Entregado' | 'with_balance' | 'Anulado';
type SalesDateFilter = 'today' | 'this_week' | 'this_month' | 'all' | 'archivados';

export const OrdersListScreen: React.FC<OrdersListScreenProps> = ({
  orders = [],
  onSelectOrder,
  onNewOrder,
  onToggleStatus,
}) => {
  const { userProfile, role, isJefe, isSupervisor, isVendedor } = useAuth();
  const { isDark } = useTheme();
  const { showBalances, formatBalance, toggleShowBalances } = useFinancialPrivacy();
  const isVendedorRole = isVendedor || role === 'vendedor';

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  // Default: Mostrar solo los pedidos registrados EL DÍA DE HOY
  const [dateFilter, setDateFilter] = useState<SalesDateFilter>('today');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [prepOrder, setPrepOrder] = useState<Order | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Active orders (non-archived) for standard monthly calculations
  const activeOrders = useMemo(() => orders.filter((o) => !o.archivado), [orders]);

  // Monthly stats and comparison for Vendedora & counts
  const monthlySalesStats = useMemo(() => computeMonthlySalesStats(activeOrders), [activeOrders]);

  // Total orders today count (including open and pending balance orders, excluding archived)
  const todayOrdersCount = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      if (o.archivado) return false;
      const isOpen = o.estado === 'Abierto';
      const hasPendingBalance = o.saldo > 0 && o.estado !== 'Anulado';
      if (isOpen || hasPendingBalance) return true;

      const d = new Date(o.createdAt);
      return (
        !isNaN(d.getTime()) &&
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [orders]);

  // Total orders this week count (including open and pending balance orders, excluding archived)
  const weekOrdersCount = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

    return orders.filter((o) => {
      if (o.archivado) return false;
      const isOpen = o.estado === 'Abierto';
      const hasPendingBalance = o.saldo > 0 && o.estado !== 'Anulado';
      if (isOpen || hasPendingBalance) return true;

      const d = new Date(o.createdAt);
      return !isNaN(d.getTime()) && d >= monday && d <= sunday;
    }).length;
  }, [orders]);

  // Total orders this month count (including open and pending balance orders, excluding archived)
  const monthOrdersCount = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      if (o.archivado) return false;
      const isOpen = o.estado === 'Abierto';
      const hasPendingBalance = o.saldo > 0 && o.estado !== 'Anulado';
      if (isOpen || hasPendingBalance) return true;

      const d = new Date(o.createdAt);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [orders]);

  // Total archived orders count
  const archivedOrdersCount = useMemo(() => {
    return orders.filter((o) => !!o.archivado).length;
  }, [orders]);

  // Date Filter matching
  const isDateInSelectedRange = (order: Order) => {
    // If viewing archived, only show archived records
    if (dateFilter === 'archivados') {
      return !!order.archivado;
    }
    // For all regular date filters, exclude archived records
    if (order.archivado) {
      return false;
    }

    if (dateFilter === 'all') return true;

    // Regla de negocio solicitada: En los filtros de 'today', 'this_week' y 'this_month',
    // SIEMPRE deben estar los datos de las ventas que aún están con saldo pendiente (> 0) o abiertas ('Abierto')
    const hasPendingBalance = order.saldo > 0 && order.estado !== 'Anulado';
    const isOpen = order.estado === 'Abierto';
    if (isOpen || hasPendingBalance) {
      return true;
    }

    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return true;
    const now = new Date();

    if (dateFilter === 'today') {
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }

    if (dateFilter === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      return d >= monday && d <= sunday;
    }

    if (dateFilter === 'this_month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    return true;
  };

  // Orders scoped to the chosen date period
  const dateScopedOrders = useMemo(() => {
    return orders.filter((o) => isDateInSelectedRange(o));
  }, [orders, dateFilter]);

  // Financial summary counters for the selected period (excluding Anulados)
  const validOrders = dateScopedOrders.filter((o) => o.estado !== 'Anulado');
  const totalOrders = dateScopedOrders.length;
  const openOrders = dateScopedOrders.filter((o) => o.estado === 'Abierto').length;
  const deliveredOrders = dateScopedOrders.filter((o) => o.estado === 'Entregado').length;
  const canceledOrders = dateScopedOrders.filter((o) => o.estado === 'Anulado').length;
  const withBalanceOrders = dateScopedOrders.filter((o) => o.saldo > 0 && o.estado !== 'Anulado').length;

  const totalVendido = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCobrado = validOrders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  const totalPorCobrar = validOrders.reduce((sum, o) => sum + (o.saldo || 0), 0);

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

  // Filtered orders calculation
  const filteredOrders = useMemo(() => {
    return dateScopedOrders.filter((order) => {
      // Text search match
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        order.cliente.toLowerCase().includes(term) ||
        order.telefono.includes(term) ||
        order.lugarEntrega.toLowerCase().includes(term) ||
        order.observaciones.toLowerCase().includes(term) ||
        (order.vendedorNombre && order.vendedorNombre.toLowerCase().includes(term)) ||
        String(order.orderNumber).includes(term) ||
        order.productos.some((p) => p.nombre.toLowerCase().includes(term));

      // Status chip match
      let matchFilter = true;
      if (filter === 'Abierto') matchFilter = order.estado === 'Abierto';
      else if (filter === 'Entregado') matchFilter = order.estado === 'Entregado';
      else if (filter === 'with_balance') matchFilter = order.saldo > 0 && order.estado !== 'Anulado';
      else if (filter === 'Anulado') matchFilter = order.estado === 'Anulado';

      return matchSearch && matchFilter;
    });
  }, [dateScopedOrders, searchTerm, filter]);

  return (
    <>
      <div id="orders-list-screen" className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-5 pb-24">
        {/* Top Header & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1
              className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}
            >
              <span>Ventas y Pedidos</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? 'text-[#FF6FA5] bg-[#FF6FA5]/10 border-[#FF6FA5]/30'
                  : 'text-[#1A2B5C] bg-[#E8DFC8]/60 border-[#E8DFC8]'
              }`}>
                🌸 Kawaii Store
              </span>
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Registros en vivo, liquidación rápida de saldos y preparación para empaque
            </p>
          </div>

          <button
            id="create-order-top-btn"
            onClick={onNewOrder}
            className={`py-2.5 px-5 rounded-2xl font-black text-sm active:scale-95 shadow-lg flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer ${
              isDark
                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25 border border-[#FF6FA5]/50'
                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nueva Venta</span>
          </button>
        </div>

        {/* Financial or Count Summary Cards */}
        {isVendedorRole ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
            {/* Ventas Registradas (Mes) */}
            <div
              className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
                isDark
                  ? 'bg-[#16234F] border-[#223368] text-white'
                  : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Ventas registradas
              </span>
              <span className="text-lg sm:text-2xl font-black font-['Outfit',sans-serif]">
                {monthlySalesStats.currentMonthCount} {monthlySalesStats.currentMonthCount === 1 ? 'pedido' : 'pedidos'}
              </span>
              <span
                className={`text-[10px] block mt-0.5 ${
                  isDark ? 'text-[#9AA6C9]/70' : 'text-[#78716C]/80'
                }`}
              >
                Este mes en curso
              </span>
            </div>

            {/* Entregados */}
            <div
              className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
                isDark
                  ? 'bg-[#16234F] border-[#4FD1B5]/30 text-white'
                  : 'bg-[#E6FFFA] border-[#99F6E4] text-[#0F766E]'
              }`}
            >
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
                  isDark ? 'text-[#4FD1B5]' : 'text-[#0D9488]'
                }`}
              >
                Entregados
              </span>
              <span
                className={`text-lg sm:text-2xl font-black font-['Outfit',sans-serif] ${
                  isDark ? 'text-[#4FD1B5]' : 'text-[#0F766E]'
                }`}
              >
                {monthlySalesStats.deliveredCount} {monthlySalesStats.deliveredCount === 1 ? 'pedido' : 'pedidos'}
              </span>
              <span
                className={`text-[10px] block mt-0.5 ${
                  isDark ? 'text-[#4FD1B5]/80' : 'text-[#0D9488]/80'
                }`}
              >
                Despachados con éxito
              </span>
            </div>

            {/* Con saldo pendiente (sin monto) */}
            <div
              className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
                isDark
                  ? 'bg-[#16234F] border-[#FFA26B]/30 text-white'
                  : 'bg-[#FFF7ED] border-[#FED7AA] text-[#C2410C]'
              }`}
            >
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
                  isDark ? 'text-[#FFA26B]' : 'text-[#EA580C]'
                }`}
              >
                Con saldo pendiente
              </span>
              <span
                className={`text-lg sm:text-2xl font-black font-['Outfit',sans-serif] ${
                  isDark ? 'text-[#FFA26B]' : 'text-[#C2410C]'
                }`}
              >
                {monthlySalesStats.pendingBalanceCount} {monthlySalesStats.pendingBalanceCount === 1 ? 'pedido' : 'pedidos'}
              </span>
              <span
                className={`text-[10px] block mt-0.5 ${
                  isDark ? 'text-[#FFA26B]/80' : 'text-[#EA580C]/80'
                }`}
              >
                Por cobrar
              </span>
            </div>
          </div>
        ) : (
          /* Live Business Balance Cards (Jefe, Supervisor) */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Resumen Financiero
              </span>
              <BalanceToggleBtn size="sm" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
              {/* Total Vendido */}
              <div
                onClick={toggleShowBalances}
                className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors cursor-pointer select-none group ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white hover:border-[#FF6FA5]/40'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C] hover:border-[#1A2B5C]/30'
                }`}
                title="Haz clic para mostrar u ocultar saldos"
              >
                <span
                  className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Total Ventas Activas
                </span>
                <span className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] block">
                  {formatBalance(totalVendido)}
                </span>
                <span
                  className={`text-[10px] block mt-0.5 ${
                    isDark ? 'text-[#9AA6C9]/70' : 'text-[#78716C]/80'
                  }`}
                >
                  {validOrders.length} pedidos
                </span>
              </div>

              {/* Total Cobrado */}
              <div
                onClick={toggleShowBalances}
                className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors cursor-pointer select-none group ${
                  isDark
                    ? 'bg-[#16234F] border-[#4FD1B5]/30 hover:border-[#4FD1B5]'
                    : 'bg-[#E6FFFA] border-[#99F6E4] hover:border-[#2DD4BF]'
                }`}
                title="Haz clic para mostrar u ocultar saldos"
              >
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
                  isDark ? 'text-[#4FD1B5]' : 'text-[#0D9488]'
                }`}>
                  Cobrado en Caja
                </span>
                <span
                  className={`text-lg sm:text-xl font-black font-['Outfit',sans-serif] block ${
                    isDark ? 'text-[#4FD1B5]' : 'text-[#0F766E]'
                  }`}
                >
                  {formatBalance(totalCobrado)}
                </span>
                <span
                  className={`text-[10px] block mt-0.5 ${
                    isDark ? 'text-[#4FD1B5]/80' : 'text-[#0D9488]/80'
                  }`}
                >
                  QR / Efectivo recibido
                </span>
              </div>

              {/* Total Por Cobrar (Saldos) */}
              <div
                onClick={toggleShowBalances}
                className={`col-span-2 sm:col-span-1 border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors cursor-pointer select-none group ${
                  isDark
                    ? 'bg-[#16234F] border-[#FFA26B]/30 hover:border-[#FFA26B]'
                    : 'bg-[#FFF7ED] border-[#FED7AA] hover:border-[#FB923C]'
                }`}
                title="Haz clic para mostrar u ocultar saldos"
              >
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
                  isDark ? 'text-[#FFA26B]' : 'text-[#EA580C]'
                }`}>
                  Por Cobrar (Saldos)
                </span>
                <span
                  className={`text-lg sm:text-xl font-black font-['Outfit',sans-serif] block ${
                    isDark ? 'text-[#FFA26B]' : 'text-[#C2410C]'
                  }`}
                >
                  {formatBalance(totalPorCobrar)}
                </span>
                <span
                  className={`text-[10px] block mt-0.5 ${
                    isDark ? 'text-[#FFA26B]/80' : 'text-[#EA580C]/80'
                  }`}
                >
                  Pendientes de cobro
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div
          className={`border rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3 transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          {/* Date Period Filter Bar - Default is 'today' as requested */}
          <div
            className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b ${
              isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span
                className={`text-[11px] font-black uppercase tracking-wider pl-1 pr-1.5 flex items-center gap-1 shrink-0 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#FF6FA5]" />
                <span>Fecha:</span>
              </span>

              {/* Botón: Solo Hoy (Default) */}
              <button
                type="button"
                id="filter-date-today"
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dateFilter === 'today'
                    ? isDark
                      ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                      : 'bg-[#1A2B5C] text-white font-black shadow-sm'
                    : isDark
                    ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                    : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
                }`}
              >
                <span>⚡ Solo Hoy</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    dateFilter === 'today'
                      ? isDark
                        ? 'bg-[#0F1B3C]/30 text-[#0F1B3C]'
                        : 'bg-white/25 text-white'
                      : isDark
                      ? 'bg-[#16234F] text-[#FF6FA5]'
                      : 'bg-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  {todayOrdersCount}
                </span>
              </button>

              {/* Botón: Esta Semana */}
              <button
                type="button"
                id="filter-date-this-week"
                onClick={() => setDateFilter('this_week')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dateFilter === 'this_week'
                    ? isDark
                      ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                      : 'bg-[#1A2B5C] text-white font-black shadow-sm'
                    : isDark
                    ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                    : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
                }`}
              >
                <span>Esta Semana</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    dateFilter === 'this_week'
                      ? isDark
                        ? 'bg-[#0F1B3C]/30 text-[#0F1B3C]'
                        : 'bg-white/25 text-white'
                      : isDark
                      ? 'bg-[#16234F] text-[#FF6FA5]'
                      : 'bg-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  {weekOrdersCount}
                </span>
              </button>

              {/* Botón: Este Mes */}
              <button
                type="button"
                id="filter-date-this-month"
                onClick={() => setDateFilter('this_month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dateFilter === 'this_month'
                    ? isDark
                      ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                      : 'bg-[#1A2B5C] text-white font-black shadow-sm'
                    : isDark
                    ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                    : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
                }`}
              >
                <span>Este Mes</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    dateFilter === 'this_month'
                      ? isDark
                        ? 'bg-[#0F1B3C]/30 text-[#0F1B3C]'
                        : 'bg-white/25 text-white'
                      : isDark
                      ? 'bg-[#16234F] text-[#FF6FA5]'
                      : 'bg-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  {monthOrdersCount}
                </span>
              </button>

              {/* Botón: Todo el Histórico */}
              <button
                type="button"
                id="filter-date-all"
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dateFilter === 'all'
                    ? isDark
                      ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-sm'
                      : 'bg-[#1A2B5C] text-white font-black shadow-sm'
                    : isDark
                    ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                    : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
                }`}
              >
                <span>Todo el Histórico</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    dateFilter === 'all'
                      ? isDark
                        ? 'bg-[#0F1B3C]/30 text-[#0F1B3C]'
                        : 'bg-white/25 text-white'
                      : isDark
                      ? 'bg-[#16234F] text-[#9AA6C9]'
                      : 'bg-[#E8DFC8] text-[#78716C]'
                  }`}
                >
                  {orders.length}
                </span>
              </button>

              {/* Botón: Ver Archivados */}
              {(isJefe || isSupervisor || archivedOrdersCount > 0) && (
                <button
                  type="button"
                  id="filter-date-archivados"
                  onClick={() => setDateFilter('archivados')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    dateFilter === 'archivados'
                      ? isDark
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-amber-500 text-white font-black shadow-sm'
                      : isDark
                      ? 'bg-[#0F1B3C] text-amber-400 hover:text-white border border-[#223368]'
                      : 'bg-[#FBF7EF] text-amber-800 hover:text-amber-950 border border-[#E8DFC8]'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Ver Archivados</span>
                  {archivedOrdersCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        dateFilter === 'archivados'
                          ? 'bg-black/20 text-current'
                          : isDark
                          ? 'bg-amber-950/60 text-amber-300'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {archivedOrdersCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {dateFilter === 'today' ? (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Mostrando hoy + pendientes/abiertos</span>
                </span>
              ) : dateFilter === 'this_week' ? (
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Mostrando semana + pendientes/abiertos</span>
                </span>
              ) : dateFilter === 'this_month' ? (
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Mostrando mes + pendientes/abiertos</span>
                </span>
              ) : dateFilter === 'archivados' ? (
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                  <span>Mostrando pedidos archivados</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDateFilter('today')}
                  className={`text-[11px] font-bold underline transition cursor-pointer ${
                    isDark ? 'text-[#FF6FA5] hover:text-white' : 'text-[#1A2B5C] hover:text-[#253B7A]'
                  }`}
                >
                  Volver a ver solo hoy
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search
              className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}
            />
            <input
              id="search-orders-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, teléfono, vendedora, producto o # pedido..."
              className={`w-full border rounded-xl py-2.5 pl-10 pr-9 text-sm focus:outline-none transition-all ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
                  isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips Bar (Todos, Abiertos, Entregados, Con Saldo, Anulados) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                filter === 'all'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black border-[#FF6FA5] shadow-sm'
                    : 'bg-[#1A2B5C] text-white font-bold border-[#1A2B5C] shadow-sm'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border-[#223368]'
                  : 'bg-[#F5EFE0] text-[#1A2B5C] hover:bg-[#EBE2CF] border-[#E8DFC8]'
              }`}
            >
              Todos ({totalOrders})
            </button>

            <button
              onClick={() => setFilter('Abierto')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                filter === 'Abierto'
                  ? isDark
                    ? 'bg-[#B39DDB] text-[#2E1065] font-black border-[#B39DDB] shadow-sm'
                    : 'bg-[#1A2B5C] text-white font-bold border-[#1A2B5C] shadow-sm'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#B39DDB] hover:text-white border-[#223368]'
                  : 'bg-[#F5EFE0] text-[#1A2B5C] hover:bg-[#EBE2CF] border-[#E8DFC8]'
              }`}
            >
              Abiertos ({openOrders})
            </button>

            <button
              onClick={() => setFilter('Entregado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                filter === 'Entregado'
                  ? isDark
                    ? 'bg-[#4FD1B5] text-[#064E3B] font-black border-[#4FD1B5] shadow-sm'
                    : 'bg-[#0F766E] text-white font-bold border-[#0F766E] shadow-sm'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#4FD1B5] hover:text-white border-[#223368]'
                  : 'bg-[#E6FFFA] text-[#0F766E] hover:bg-[#CCFBF1] border-[#99F6E4]'
              }`}
            >
              Entregados ({deliveredOrders})
            </button>

            <button
              onClick={() => setFilter('with_balance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                filter === 'with_balance'
                  ? isDark
                    ? 'bg-[#FFA26B] text-[#7C2D12] font-black border-[#FFA26B] shadow-sm'
                    : 'bg-[#C2410C] text-white font-bold border-[#C2410C] shadow-sm'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#FFA26B] hover:text-white border-[#223368]'
                  : 'bg-[#FFF7ED] text-[#C2410C] hover:bg-[#FFEDD5] border-[#FED7AA]'
              }`}
            >
              Con Saldo ({withBalanceOrders})
            </button>

            {canceledOrders > 0 && (
              <button
                onClick={() => setFilter('Anulado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                  filter === 'Anulado'
                    ? isDark
                      ? 'bg-[#FCA5A5] text-[#881337] font-black border-[#FCA5A5] shadow-sm'
                      : 'bg-[#DC2626] text-white font-bold border-[#DC2626] shadow-sm'
                    : isDark
                    ? 'bg-[#0F1B3C] text-rose-300 hover:text-white border-[#223368]'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                }`}
              >
                Anulados ({canceledOrders})
              </button>
            )}
          </div>
        </div>

        {/* Orders Cards List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            /* Empty State */
            <div
              id="empty-orders-view"
              className={`text-center py-12 px-4 border border-dashed rounded-3xl space-y-4 shadow-sm ${
                isDark
                  ? 'bg-[#16234F]/60 border-[#223368] text-[#9AA6C9]'
                  : 'bg-white border-[#E8DFC8] text-[#78716C]'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                  isDark
                    ? 'bg-[#0F1B3C] text-[#FF6FA5]'
                    : 'bg-[#F5EFE0] text-[#1A2B5C]'
                }`}
              >
                <Package className="w-7 h-7" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3
                  className={`text-base font-bold font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  {dateFilter === 'today'
                    ? 'No hay pedidos registrados el día de hoy'
                    : 'No se encontraron ventas'}
                </h3>
                <p className="text-xs">
                  {searchTerm || filter !== 'all'
                    ? 'Prueba modificando la búsqueda o el filtro seleccionado.'
                    : dateFilter === 'today'
                    ? 'Aún no se han registrado pedidos hoy. Puedes registrar uno nuevo o consultar las ventas anteriores.'
                    : 'Registra tu primera venta con los artículos y cotización en Bs.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {dateFilter === 'today' && orders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('all')}
                    className={`py-2 px-4 rounded-xl font-bold text-xs border transition cursor-pointer ${
                      isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-white hover:bg-[#1A2B5C]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#EBE2CF]'
                    }`}
                  >
                    Ver Todo el Histórico ({orders.length} pedidos)
                  </button>
                )}
                <button
                  id="empty-new-order-btn"
                  onClick={onNewOrder}
                  className={`py-2 px-5 rounded-xl font-black text-xs shadow-md inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                    isDark
                      ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/30'
                      : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/30'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Nueva Venta</span>
                </button>
              </div>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isDelivered = order.estado === 'Entregado';
              const isAnulado = order.estado === 'Anulado';
              const hasPendingBalance = order.saldo > 0 && !isAnulado;
              const itemsCount = order.productos.reduce(
                (s, p) => s + (p.cantidad || 1),
                0
              );

              // Date breakdown
              const orderDateObj = new Date(order.createdAt);
              const isTodayOrder = !isNaN(orderDateObj.getTime()) && orderDateObj.toDateString() === new Date().toDateString();
              const formattedDateStr = !isNaN(orderDateObj.getTime())
                ? orderDateObj.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) +
                  ' · ' +
                  orderDateObj.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={order.id}
                  id={`order-card-${order.id}`}
                  onClick={() => onSelectOrder(order)}
                  className={`group relative border rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                    isAnulado
                      ? isDark
                        ? 'bg-[#16234F]/40 border-rose-950/40 opacity-70'
                        : 'bg-rose-50/40 border-rose-200 opacity-70'
                      : isDark
                      ? 'bg-[#16234F] hover:bg-[#1B2B60] border-[#223368] hover:border-[#FF6FA5]/40 text-white'
                      : 'bg-white hover:bg-[#FCF9F3] border-[#E8DFC8] hover:border-[#1A2B5C]/40 text-[#1A2B5C]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    {/* Order Number & Customer Name */}
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-mono text-xs font-black px-2.5 py-1 rounded-xl border ${
                          isDark
                            ? 'text-[#FF6FA5] bg-[#0F1B3C] border-[#223368]'
                            : 'text-[#1A2B5C] bg-[#F5EFE0] border-[#E8DFC8]'
                        }`}
                      >
                        #{String(order.orderNumber).padStart(3, '0')}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3
                            className={`text-base font-bold transition-colors font-['Outfit',sans-serif] ${
                              isDark
                                ? 'text-white group-hover:text-[#FF6FA5]'
                                : 'text-[#1A2B5C] group-hover:text-[#1A2B5C]'
                            }`}
                          >
                            {order.cliente || 'Clienta sin nombre'}
                          </h3>

                          {/* Badge when displayed in Today/Week/Month due to pending balance or open status */}
                          {dateFilter !== 'all' && dateFilter !== 'archivados' && !isTodayOrder && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border flex items-center gap-1 shrink-0 ${
                                isDark
                                  ? 'bg-amber-950/70 text-amber-300 border-amber-800/50'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                              title={hasPendingBalance ? 'Con saldo pendiente por cobrar' : 'Pedido abierto en proceso'}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>{hasPendingBalance ? 'Saldo pendiente' : 'Abierto activo'}</span>
                            </span>
                          )}

                          {order.vendedorNombre && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1 border shrink-0 ${
                                isDark
                                  ? 'text-[#9AA6C9] bg-[#0F1B3C] border-[#223368]'
                                  : 'text-[#78716C] bg-[#F5EFE0] border-[#E8DFC8]'
                              }`}
                              title="Vendedora que registró la venta"
                            >
                              <User className={`w-3 h-3 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                              <span>{order.vendedorNombre}</span>
                            </span>
                          )}
                          {isDelivered && (order.enviadoPorNombre || order.despachadoPorNombre) && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1 border shrink-0 ${
                                isDark
                                  ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800/40'
                                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                              }`}
                              title={`Despachado / Enviado por ${order.enviadoPorNombre || order.despachadoPorNombre}`}
                            >
                              <Truck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Enviado: {order.enviadoPorNombre || order.despachadoPorNombre}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                          {order.telefono && (
                            <div
                              className={`flex items-center gap-1 ${
                                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                              }`}
                            >
                              <Phone className={`w-3 h-3 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                              <span>{order.telefono}</span>
                            </div>
                          )}
                          {formattedDateStr && (
                            <div
                              className={`flex items-center gap-1 text-[11px] ${
                                isDark ? 'text-[#9AA6C9]/70' : 'text-[#78716C]/70'
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{formattedDateStr}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isAnulado ? (
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 border ${
                            isDark
                              ? 'bg-[#FCA5A5] text-[#881337] border-[#FCA5A5]'
                              : 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-700" />
                          <span>Anulado</span>
                        </span>
                      ) : (
                        <button
                          id={`toggle-status-${order.id}`}
                          onClick={(e) => onToggleStatus(order.id, e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                            isDelivered
                              ? isDark
                                ? 'bg-[#4FD1B5] hover:bg-[#38b2ac] text-[#064E3B] border border-[#4FD1B5]'
                                : 'bg-[#CCFBF1] hover:bg-[#99F6E4] text-[#0F766E] border border-[#99F6E4]'
                              : isDark
                              ? 'bg-[#B39DDB] hover:bg-[#9575cd] text-[#2E1065] border border-[#B39DDB]'
                              : 'bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#5B21B6] border border-[#DDD6FE]'
                          }`}
                          title="Toca para cambiar estado"
                        >
                          {isDelivered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#064E3B]" />
                              <span>Entregado</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-[#2E1065] animate-pulse" />
                              <span>Abierto</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Products Preview Chips */}
                  <div
                    className={`rounded-xl p-2.5 mb-3 border ${
                      isDark
                        ? 'bg-[#0F1B3C]/80 border-[#223368]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8]'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${
                        isDark ? 'text-white font-bold' : 'text-[#1A2B5C] font-bold'
                      }`}
                    >
                      <Package className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'} shrink-0`} />
                      <span>
                        {itemsCount} {itemsCount === 1 ? 'artículo' : 'artículos'}:
                      </span>
                    </div>
                    <p
                      className={`text-xs line-clamp-1 ${
                        isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                      }`}
                    >
                      {order.productos
                        .map((p) => formatArticleItem(p))
                        .join(', ')}
                    </p>
                    {order.lugarEntrega && (
                      <div
                        className={`flex items-center gap-1 text-[11px] mt-1.5 pt-1.5 border-t ${
                          isDark
                            ? 'text-[#9AA6C9] border-[#223368]'
                            : 'text-[#78716C] border-[#E8DFC8]'
                        }`}
                      >
                        <MapPin className={`w-3 h-3 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'} shrink-0`} />
                        <span className="truncate">{order.lugarEntrega}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Badges & Action Buttons */}
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 pt-1 border-t ${
                      isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                    }`}
                  >
                    {isVendedorRole ? (
                      /* Clean Payment Status Indicator without money amounts for Vendedora */
                      <div className="flex items-center gap-2">
                        {isAnulado ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                            isDark ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50' : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Anulado</span>
                          </span>
                        ) : hasPendingBalance ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                            isDark ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Saldo Pendiente</span>
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                            isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Totalmente Pagado</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Full Financial Breakdown for Boss & Supervisor */
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div>
                          <span
                            className={`block text-[10px] uppercase font-bold ${
                              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                            }`}
                          >
                            Total
                          </span>
                          <span
                            className={`text-sm sm:text-base font-black font-['Outfit',sans-serif] tracking-tight ${
                              isDark ? 'text-white' : 'text-[#1A2B5C]'
                            }`}
                          >
                            {formatBalance(order.total)}
                          </span>
                        </div>

                        <div
                          className={`h-6 w-px ${
                            isDark ? 'bg-[#223368]' : 'bg-[#E8DFC8]'
                          }`}
                        />

                        <div>
                          <span
                            className={`block text-[10px] uppercase font-bold ${
                              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                            }`}
                          >
                            Saldo
                          </span>
                          <span
                            className={`text-sm sm:text-base font-black font-['Outfit',sans-serif] tracking-tight ${
                              isAnulado
                                ? 'text-[#9AA6C9] line-through'
                                : hasPendingBalance
                                ? isDark ? 'text-[#FFA26B]' : 'text-[#C2410C]'
                                : isDark ? 'text-[#4FD1B5]' : 'text-[#0F766E]'
                            }`}
                          >
                            {isAnulado
                              ? 'Anulado'
                              : hasPendingBalance
                              ? formatBalance(order.saldo)
                              : (showBalances ? 'Bs. 0 (Pagado)' : 'Bs. •••••')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="flex items-center gap-1.5">
                      {/* 1-Click Quick Complete Balance (Boss / Supervisor only) */}
                      {!isVendedorRole && hasPendingBalance && (
                        <button
                          id={`complete-balance-list-${order.id}`}
                          type="button"
                          disabled={completingId === order.id}
                          onClick={(e) => handleQuickCompleteBalance(order, e)}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center gap-1 transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer ${
                            isDark
                              ? 'bg-[#4FD1B5] hover:bg-[#38b2ac] text-[#064E3B]'
                              : 'bg-[#0F766E] hover:bg-[#0D9488] text-white'
                          }`}
                          title="Completar saldo en 1 clic (marcar pagado al 100%)"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{completingId === order.id ? '...' : 'Liquidar Saldo'}</span>
                        </button>
                      )}

                      {/* Warehouse Preparation Photo & WhatsApp Slip */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrepOrder(order);
                        }}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm active:scale-95 cursor-pointer ${
                          isDark
                            ? 'bg-[#1E2D5A] hover:bg-[#283C75] text-[#FF6FA5] border border-[#223368]'
                            : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border border-[#E8DFC8]'
                        }`}
                        title="Ficha visual de empaque para WhatsApp"
                      >
                        <Package className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                        <span className="hidden sm:inline">Ficha WhatsApp</span>
                      </button>

                      {/* Thermal Ticket */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintOrder(order);
                        }}
                        className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold border cursor-pointer ${
                          isDark
                            ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-white border-[#223368]'
                            : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border-[#E8DFC8]'
                        }`}
                        title="Imprimir ticket térmico"
                      >
                        <Printer className={`w-3.5 h-3.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                        <span className="hidden sm:inline">Ticket</span>
                      </button>

                      {/* WhatsApp Receipt link */}
                      <a
                        href={getWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold border ${
                          isDark
                            ? 'bg-[#4FD1B5]/20 hover:bg-[#4FD1B5]/30 text-[#4FD1B5] border-[#4FD1B5]/40'
                            : 'bg-[#CCFBF1] hover:bg-[#99F6E4] text-[#0F766E] border-[#99F6E4]'
                        }`}
                        title="Enviar comprobante por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>

                      <div
                        className={`p-1 transition-colors ${
                          isDark
                            ? 'text-[#9AA6C9] group-hover:text-[#FF6FA5]'
                            : 'text-[#78716C] group-hover:text-[#1A2B5C]'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) - Always visible on screen for easy sales registration */}
      <div className="fixed bottom-6 right-6 z-30 sm:bottom-8 sm:right-8 pointer-events-none">
        <button
          id="fab-new-order-btn"
          type="button"
          onClick={onNewOrder}
          className={`pointer-events-auto group flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 font-black text-xs sm:text-sm rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
            isDark
              ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/40 border border-[#FF6FA5]'
              : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/40 border border-[#1A2B5C]'
          }`}
          title="Registrar Nueva Venta (Botón Rápido Flotante)"
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-200 ${
            isDark ? 'bg-[#0F1B3C]/15 text-[#0F1B3C]' : 'bg-white/20 text-white'
          }`}>
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="font-['Outfit',sans-serif] tracking-tight font-black">
            + Nueva Venta
          </span>
        </button>
      </div>

      {/* Direct Thermal Print Modal from List */}
      {printOrder && (
        <ThermalPrintModal
          order={printOrder}
          isOpen={!!printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}

      {/* Preparation Modal */}
      {prepOrder && (
        <OrderPreparationCardModal
          order={prepOrder}
          onClose={() => setPrepOrder(null)}
        />
      )}
    </>
  );
};
