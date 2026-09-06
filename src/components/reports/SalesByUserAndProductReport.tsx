import React, { useState, useMemo } from 'react';
import {
  Users,
  Package,
  TrendingUp,
  Search,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Award,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Calendar,
  Layers,
  BarChart2,
} from 'lucide-react';
import { Order } from '../../types';
import { useFinancialPrivacy } from '../../contexts/FinancialPrivacyContext';
import { useTheme } from '../../contexts/ThemeContext';

interface SalesByUserAndProductReportProps {
  orders: Order[];
  onSelectOrder?: (orderId: string) => void;
}

type PeriodFilter = 'this_week' | 'this_month' | '7days' | '30days' | 'today' | 'all';
type ViewSection = 'users' | 'products' | 'both';

export const SalesByUserAndProductReport: React.FC<SalesByUserAndProductReportProps> = ({
  orders,
  onSelectOrder,
}) => {
  const { isDark } = useTheme();
  const { formatBalance } = useFinancialPrivacy();

  const [period, setPeriod] = useState<PeriodFilter>('this_week');
  const [viewSection, setViewSection] = useState<ViewSection>('both');
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedSellerOrdersModal, setSelectedSellerOrdersModal] = useState<{
    sellerName: string;
    orders: Order[];
  } | null>(null);

  // Filter orders by chosen period
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      if (o.estado === 'Anulado') return false; // Exclude canceled orders from performance
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return false;

      if (period === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (period === 'this_week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(now);
        mon.setDate(diff);
        mon.setHours(0, 0, 0, 0);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        sun.setHours(23, 59, 59, 999);
        return orderDate >= mon && orderDate <= sun;
      }
      if (period === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= past7;
      }
      if (period === 'this_month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (period === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= past30;
      }
      return true; // 'all'
    });
  }, [orders, period]);

  // Total sales in this period
  const totalPeriodSales = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  }, [filteredOrders]);

  const totalPeriodOrders = filteredOrders.length;
  const averageTicket = totalPeriodOrders > 0 ? totalPeriodSales / totalPeriodOrders : 0;

  // -------------------------------------------------------------
  // USERS / VENDEDORAS BREAKDOWN
  // -------------------------------------------------------------
  const usersStats = useMemo(() => {
    const map = new Map<
      string,
      {
        sellerName: string;
        totalSales: number;
        totalCollected: number;
        totalPending: number;
        ordersCount: number;
        deliveredCount: number;
        openCount: number;
        orders: Order[];
      }
    >();

    filteredOrders.forEach((o) => {
      const seller = (o.vendedorNombre || 'Sin Asignar').trim();
      const existing = map.get(seller) || {
        sellerName: seller,
        totalSales: 0,
        totalCollected: 0,
        totalPending: 0,
        ordersCount: 0,
        deliveredCount: 0,
        openCount: 0,
        orders: [],
      };

      existing.totalSales += o.total || 0;
      existing.totalCollected += o.pagado || 0;
      existing.totalPending += o.saldo || 0;
      existing.ordersCount += 1;
      if (o.estado === 'Entregado') existing.deliveredCount += 1;
      else existing.openCount += 1;
      existing.orders.push(o);

      map.set(seller, existing);
    });

    const list = Array.from(map.values()).map((item) => {
      const avg = item.ordersCount > 0 ? item.totalSales / item.ordersCount : 0;
      const share = totalPeriodSales > 0 ? (item.totalSales / totalPeriodSales) * 100 : 0;
      return {
        ...item,
        averageTicket: avg,
        salesShare: share,
      };
    });

    // Sort descending by totalSales
    return list.sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredOrders, totalPeriodSales]);

  // -------------------------------------------------------------
  // PRODUCTS BREAKDOWN
  // -------------------------------------------------------------
  const productsStats = useMemo(() => {
    const map = new Map<
      string,
      {
        nombre: string;
        totalUnits: number;
        totalRevenue: number;
        variants: Map<string, number>;
        ordersCount: number;
      }
    >();

    filteredOrders.forEach((o) => {
      const orderProducts = o.productos || [];
      const seenInOrder = new Set<string>();

      orderProducts.forEach((it) => {
        const name = (it.nombre || 'Artículo').trim();
        const existing = map.get(name) || {
          nombre: name,
          totalUnits: 0,
          totalRevenue: 0,
          variants: new Map<string, number>(),
          ordersCount: 0,
        };

        const qty = it.cantidad || 1;
        const lineTotal = (it.precioUnitario || 0) * qty;
        existing.totalUnits += qty;
        existing.totalRevenue += lineTotal;

        const variant = (it.variante || 'Estándar').trim();
        existing.variants.set(variant, (existing.variants.get(variant) || 0) + qty);

        if (!seenInOrder.has(name)) {
          existing.ordersCount += 1;
          seenInOrder.add(name);
        }

        map.set(name, existing);
      });
    });

    const list = Array.from(map.values()).map((p) => {
      const avgPrice = p.totalUnits > 0 ? p.totalRevenue / p.totalUnits : 0;
      const share = totalPeriodSales > 0 ? (p.totalRevenue / totalPeriodSales) * 100 : 0;

      // Find top variant
      let topVariant = 'Estándar';
      let maxVarQty = 0;
      p.variants.forEach((qty, vName) => {
        if (qty > maxVarQty) {
          maxVarQty = qty;
          topVariant = vName;
        }
      });

      return {
        nombre: p.nombre,
        totalUnits: p.totalUnits,
        totalRevenue: p.totalRevenue,
        ordersCount: p.ordersCount,
        avgPrice,
        share,
        topVariant,
      };
    });

    // Sort descending by total units sold, then revenue
    return list.sort((a, b) => b.totalUnits - a.totalUnits || b.totalRevenue - a.totalRevenue);
  }, [filteredOrders, totalPeriodSales]);

  // Filtered products list for search
  const displayedProducts = useMemo(() => {
    if (!productSearch.trim()) return productsStats;
    const term = productSearch.toLowerCase();
    return productsStats.filter((p) => p.nombre.toLowerCase().includes(term));
  }, [productsStats, productSearch]);

  const totalUnitsSold = useMemo(() => {
    return productsStats.reduce((acc, p) => acc + p.totalUnits, 0);
  }, [productsStats]);

  const periodLabel = useMemo(() => {
    if (period === 'today') return 'Hoy';
    if (period === 'this_week') return 'Esta Semana';
    if (period === '7days') return 'Últimos 7 Días';
    if (period === 'this_month') return 'Este Mes';
    if (period === '30days') return 'Últimos 30 Días';
    return 'Todo el Historial';
  }, [period]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header and Filter Controls */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark
            ? 'bg-gradient-to-r from-[#16234F] to-[#1A2B5C] border-[#223368]'
            : 'bg-gradient-to-r from-white via-[#FBF7EF] to-white border-[#E8DFC8]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#1A2B5C] text-white flex items-center gap-1 shadow-sm">
              <Users className="w-3 h-3 text-[#FF6FA5]" /> Rendimiento de Equipo & Catálogo
            </span>
            <span className={`text-xs font-semibold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Periodo: <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>{periodLabel}</strong>
            </span>
          </div>
          <h2
            className={`text-lg sm:text-xl font-black font-['Outfit',sans-serif] ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}
          >
            Datos de Ventas por Usuarios y Productos
          </h2>
          <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Supervisión detallada de vendedoras, volúmenes de venta, ticket promedio y artículos con mayor rotación.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-[#E8DFC8] dark:border-[#223368] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setPeriod('this_week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === 'this_week'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                : 'text-[#78716C] dark:text-[#9AA6C9] hover:text-[#1A2B5C] dark:hover:text-white'
            }`}
          >
            ⚡ Esta Semana
          </button>
          <button
            type="button"
            onClick={() => setPeriod('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === 'this_month'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                : 'text-[#78716C] dark:text-[#9AA6C9] hover:text-[#1A2B5C] dark:hover:text-white'
            }`}
          >
            📅 Este Mes
          </button>
          <button
            type="button"
            onClick={() => setPeriod('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === '7days'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                : 'text-[#78716C] dark:text-[#9AA6C9] hover:text-[#1A2B5C] dark:hover:text-white'
            }`}
          >
            7 Días
          </button>
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === 'today'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                : 'text-[#78716C] dark:text-[#9AA6C9] hover:text-[#1A2B5C] dark:hover:text-white'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === 'all'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                : 'text-[#78716C] dark:text-[#9AA6C9] hover:text-[#1A2B5C] dark:hover:text-white'
            }`}
          >
            Todo
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Total Vendido ({periodLabel})
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              Bs
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
            {formatBalance(totalPeriodSales)}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {totalPeriodOrders} {totalPeriodOrders === 1 ? 'pedido cerrado' : 'pedidos cerrados'}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Vendedoras Activas
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
            {usersStats.length}
          </div>
          <p className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Líder: <strong className="text-amber-500">{usersStats[0]?.sellerName || 'N/A'}</strong>
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Ticket Promedio
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
            {formatBalance(averageTicket)}
          </div>
          <p className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Promedio por pedido registrado
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Unidades Vendidas
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
            {totalUnitsSold.toLocaleString()} u.
          </div>
          <p className={`text-[11px] font-semibold mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            En {productsStats.length} artículos diferentes
          </p>
        </div>
      </div>

      {/* View Switcher: Usuarios vs Productos vs Ambos */}
      <div className="flex items-center justify-between gap-3 border-b pb-3 border-[#E8DFC8] dark:border-[#223368]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewSection('both')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewSection === 'both'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                : 'bg-white dark:bg-[#16234F] text-[#78716C] dark:text-[#9AA6C9] border border-[#E8DFC8] dark:border-[#223368]'
            }`}
          >
            <Layers className="w-4 h-4" /> Vista Integral (Ambos)
          </button>
          <button
            type="button"
            onClick={() => setViewSection('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewSection === 'users'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                : 'bg-white dark:bg-[#16234F] text-[#78716C] dark:text-[#9AA6C9] border border-[#E8DFC8] dark:border-[#223368]'
            }`}
          >
            <Users className="w-4 h-4 text-blue-500" /> 1. Ventas por Usuarios ({usersStats.length})
          </button>
          <button
            type="button"
            onClick={() => setViewSection('products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewSection === 'products'
                ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                : 'bg-white dark:bg-[#16234F] text-[#78716C] dark:text-[#9AA6C9] border border-[#E8DFC8] dark:border-[#223368]'
            }`}
          >
            <Package className="w-4 h-4 text-amber-500" /> 2. Ventas por Productos ({productsStats.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: VENTAS POR USUARIOS / VENDEDORAS */}
      {(viewSection === 'both' || viewSection === 'users') && (
        <div
          className={`border rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    className={`font-black text-base sm:text-lg font-['Outfit',sans-serif] ${
                      isDark ? 'text-white' : 'text-[#1A2B5C]'
                    }`}
                  >
                    1. Rendimiento y Ventas por Vendedora / Usuario
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Ranking ordenado por volumen total vendido en {periodLabel.toLowerCase()}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table of Users */}
          <div className="overflow-x-auto rounded-2xl border border-[#E8DFC8] dark:border-[#223368]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className={isDark ? 'bg-[#0F1B3C] text-[#9AA6C9]' : 'bg-[#FBF7EF] text-[#78716C]'}>
                  <th className="py-3 px-3.5 font-bold">#</th>
                  <th className="py-3 px-3.5 font-bold">Usuario / Vendedora</th>
                  <th className="py-3 px-3.5 font-bold text-center">Pedidos</th>
                  <th className="py-3 px-3.5 font-bold text-right">Total Vendido</th>
                  <th className="py-3 px-3.5 font-bold text-right">Ticket Prom.</th>
                  <th className="py-3 px-3.5 font-bold text-right">Saldo Pendiente</th>
                  <th className="py-3 px-3.5 font-bold text-center">% del Total</th>
                  <th className="py-3 px-3.5 font-bold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFC8] dark:divide-[#223368]">
                {usersStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#78716C] dark:text-[#9AA6C9]">
                      No hay registros de ventas para usuarios en este periodo.
                    </td>
                  </tr>
                ) : (
                  usersStats.map((u, idx) => (
                    <tr
                      key={u.sellerName}
                      className={`transition ${
                        isDark ? 'hover:bg-[#1E2D5A]' : 'hover:bg-[#FAF6ED]'
                      }`}
                    >
                      <td className="py-3.5 px-3.5 font-black">
                        {idx === 0 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center font-black text-xs shadow-sm">
                            🥇
                          </span>
                        ) : idx === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-stone-900 flex items-center justify-center font-black text-xs">
                            🥈
                          </span>
                        ) : idx === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#78716C] dark:text-[#9AA6C9]">
                            #{idx + 1}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-xs">
                            {u.sellerName.slice(0, 2).toUpperCase()}
                          </span>
                          <span className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>
                            {u.sellerName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-bold">
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#1A2B5C]/10 dark:bg-white/10 text-[#1A2B5C] dark:text-white">
                          {u.ordersCount} ventas
                        </span>
                        <div className="text-[10px] text-[#78716C] dark:text-[#9AA6C9] mt-0.5">
                          {u.deliveredCount} ent. · {u.openCount} ab.
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">
                        {formatBalance(u.totalSales)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-bold text-[#1A2B5C] dark:text-[#9AA6C9]">
                        {formatBalance(u.averageTicket)}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-bold">
                        {u.totalPending > 0 ? (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            {formatBalance(u.totalPending)}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            Al día
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-xs text-[#1A2B5C] dark:text-white">
                            {u.salesShare.toFixed(1)}%
                          </span>
                          <div className="w-16 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-[#FF6FA5] rounded-full"
                              style={{ width: `${Math.min(u.salesShare, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedSellerOrdersModal({ sellerName: u.sellerName, orders: u.orders })}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#1A2B5C] text-white hover:bg-[#243B7A] transition shadow-sm flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver ventas</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: VENTAS POR PRODUCTOS */}
      {(viewSection === 'both' || viewSection === 'products') && (
        <div
          className={`border rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3
                  className={`font-black text-base sm:text-lg font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  2. Ranking de Artículos & Productos Más Vendidos
                </h3>
                <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Productos ordenados por rotación de unidades y recaudación en {periodLabel.toLowerCase()}.
                </p>
              </div>
            </div>

            {/* Search Input for Products */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[#78716C] dark:text-[#9AA6C9] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar artículo..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-xl border focus:outline-none ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white focus:border-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:border-[#1A2B5C]'
                }`}
              />
            </div>
          </div>

          {/* Table of Products */}
          <div className="overflow-x-auto rounded-2xl border border-[#E8DFC8] dark:border-[#223368]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className={isDark ? 'bg-[#0F1B3C] text-[#9AA6C9]' : 'bg-[#FBF7EF] text-[#78716C]'}>
                  <th className="py-3 px-3.5 font-bold">#</th>
                  <th className="py-3 px-3.5 font-bold">Producto / Artículo</th>
                  <th className="py-3 px-3.5 font-bold">Variante Top</th>
                  <th className="py-3 px-3.5 font-bold text-center">Unidades</th>
                  <th className="py-3 px-3.5 font-bold text-right">Recaudación (Bs.)</th>
                  <th className="py-3 px-3.5 font-bold text-right">Precio Prom.</th>
                  <th className="py-3 px-3.5 font-bold text-center">% de Ventas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFC8] dark:divide-[#223368]">
                {displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#78716C] dark:text-[#9AA6C9]">
                      No se encontraron productos para el periodo o criterio de búsqueda seleccionado.
                    </td>
                  </tr>
                ) : (
                  displayedProducts.slice(0, 30).map((p, idx) => (
                    <tr
                      key={p.nombre}
                      className={`transition ${
                        isDark ? 'hover:bg-[#1E2D5A]' : 'hover:bg-[#FAF6ED]'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-black">
                        {idx === 0 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center font-black text-xs shadow-sm">
                            🥇
                          </span>
                        ) : idx === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-stone-900 flex items-center justify-center font-black text-xs">
                            🥈
                          </span>
                        ) : idx === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#78716C] dark:text-[#9AA6C9]">
                            #{idx + 1}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-[#FF6FA5] shrink-0" />
                          <span className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>
                            {p.nombre}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#78716C] dark:text-[#9AA6C9]">
                          En {p.ordersCount} pedidos distintos
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {p.topVariant}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          {p.totalUnits} u.
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">
                        {formatBalance(p.totalRevenue)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-[#1A2B5C] dark:text-[#9AA6C9]">
                        {formatBalance(p.avgPrice)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-xs text-[#1A2B5C] dark:text-white">
                            {p.share.toFixed(1)}%
                          </span>
                          <div className="w-14 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-[#FF6FA5] rounded-full"
                              style={{ width: `${Math.min(p.share, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Orders for a Specific Seller */}
      {selectedSellerOrdersModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            <div className="p-4 sm:p-5 border-b border-[#E8DFC8] dark:border-[#223368] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#78716C] dark:text-[#9AA6C9] uppercase tracking-wider">
                  Ventas Registradas
                </span>
                <h3 className={`text-lg font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  Vendedora: {selectedSellerOrdersModal.sellerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSellerOrdersModal(null)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center justify-center font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {selectedSellerOrdersModal.orders.map((o) => (
                <div
                  key={o.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                    isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#FF6FA5]">#{o.orderNumber}</span>
                      <span className="font-bold">{o.cliente}</span>
                      <span
                        className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${
                          o.estado === 'Entregado'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {o.estado}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                      {new Date(o.createdAt).toLocaleDateString('es-BO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {(o.productos || []).map((p) => `${p.cantidad}x ${p.nombre}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-sm text-emerald-600 font-['Outfit',sans-serif]">
                      {formatBalance(o.total)}
                    </div>
                    {o.saldo > 0 && (
                      <span className="text-[10px] font-bold text-amber-600">
                        Debe: {formatBalance(o.saldo)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#E8DFC8] dark:border-[#223368] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSellerOrdersModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1A2B5C] text-white hover:bg-[#243B7A] transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
