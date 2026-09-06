import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Crown,
  Trophy,
  Users,
  Package,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ShoppingBag,
  DollarSign,
  Award,
  AlertCircle,
  XCircle,
  MapPin,
  Phone,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Order, OrderItem } from '../../types';
import { formatCurrency, formatBoliviaPhone } from '../../lib/storage';
import { useFinancialPrivacy } from '../../contexts/FinancialPrivacyContext';
import { useTheme } from '../../contexts/ThemeContext';

interface DailySalesReportProps {
  orders: Order[];
  range: 'today' | 'this_week' | '7days' | '30days' | 'this_month' | 'custom' | 'all';
  onRangeChange: (range: 'today' | 'this_week' | '7days' | '30days' | 'this_month' | 'custom' | 'all') => void;
  selectedSeller: string;
  onSellerChange: (seller: string) => void;
  allSellers: string[];
}

// Helper to convert date or ISO string to local YYYY-MM-DD
const toLocalDateKey = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper for human-readable Spanish date formatting
const formatDateSpanish = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m - 1, d);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return `${days[date.getDay()]}, ${d} de ${months[m - 1]} de ${y}`;
};

const formatShortDateSpanish = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const monthsShort = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  return `${d} ${monthsShort[m - 1]}`;
};

export const DailySalesReport: React.FC<DailySalesReportProps> = ({
  orders,
  range,
  onRangeChange,
  selectedSeller,
  onSellerChange,
  allSellers,
}) => {
  const { isDark } = useTheme();
  const { formatBalance, showBalances, toggleShowBalances } = useFinancialPrivacy();

  // The specific selected day for the daily breakdown view
  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const [userSelectedManually, setUserSelectedManually] = useState<boolean>(false);

  // Chart view mode: 'bar' or 'line'
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  // Product sorting mode: by total Bs or by quantity
  const [productSortBy, setProductSortBy] = useState<'totalBs' | 'cantidad'>('totalBs');
  const [productSearch, setProductSearch] = useState<string>('');

  // Seller filtering
  const sellerFilteredOrders = useMemo(() => {
    if (selectedSeller === 'all') return orders;
    return orders.filter(
      (o) => (o.vendedorNombre || 'Sin asignar') === selectedSeller
    );
  }, [orders, selectedSeller]);

  // Valid orders (excluding Anulado from sales)
  const validOrders = useMemo(() => {
    return sellerFilteredOrders.filter((o) => o.estado !== 'Anulado');
  }, [sellerFilteredOrders]);

  const canceledOrders = useMemo(() => {
    return sellerFilteredOrders.filter((o) => o.estado === 'Anulado');
  }, [sellerFilteredOrders]);

  // Daily map of all orders
  const dailyOrdersMap = useMemo(() => {
    const map = new Map<string, Order[]>();
    validOrders.forEach((o) => {
      const key = toLocalDateKey(o.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return map;
  }, [validOrders]);

  // Summary of all days that have orders, sorted descending by date
  const daysWithSalesSummary = useMemo(() => {
    const map = new Map<string, { count: number; totalBs: number }>();
    validOrders.forEach((o) => {
      const key = toLocalDateKey(o.createdAt);
      const cur = map.get(key) || { count: 0, totalBs: 0 };
      cur.count += 1;
      cur.totalBs += o.total || 0;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([dateKey, stats]) => ({
        dateKey,
        count: stats.count,
        totalBs: stats.totalBs,
        label: formatShortDateSpanish(dateKey),
        fullDate: formatDateSpanish(dateKey),
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [validOrders]);

  const latestDayWithOrders = daysWithSalesSummary.length > 0 ? daysWithSalesSummary[0].dateKey : todayKey;

  // Auto-select latest day with sales if today has 0 sales and user hasn't manually picked a day
  useEffect(() => {
    if (!userSelectedManually && daysWithSalesSummary.length > 0) {
      const todayOrdersCount = dailyOrdersMap.get(todayKey)?.length || 0;
      if (todayOrdersCount === 0 && daysWithSalesSummary[0].dateKey !== todayKey) {
        setSelectedDay(daysWithSalesSummary[0].dateKey);
      }
    }
  }, [daysWithSalesSummary, dailyOrdersMap, todayKey, userSelectedManually]);

  // Determine chart date range based on `range` filter
  const chartDaysList = useMemo(() => {
    const days: string[] = [];
    const now = new Date();

    if (range === 'today') {
      // Show 7 days up to today to give daily context
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        days.push(toLocalDateKey(d));
      }
    } else if (range === 'this_week') {
      // Current week: Monday to Sunday
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(toLocalDateKey(d));
      }
    } else if (range === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        days.push(toLocalDateKey(d));
      }
    } else if (range === 'this_month') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const daysInMonth = now.getDate(); // Up to today
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        days.push(toLocalDateKey(dateObj));
      }
    } else if (range === '30days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        days.push(toLocalDateKey(d));
      }
    } else {
      // 'all': get all unique days from orders or default last 14 days
      const keysSet = new Set<string>();
      validOrders.forEach((o) => keysSet.add(toLocalDateKey(o.createdAt)));
      if (keysSet.size === 0) {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          keysSet.add(toLocalDateKey(d));
        }
      }
      days.push(...Array.from(keysSet).sort());
    }

    return days;
  }, [range, validOrders]);

  // Aggregate data for the Chart
  const chartData = useMemo(() => {
    return chartDaysList.map((dateKey) => {
      const dayOrders = dailyOrdersMap.get(dateKey) || [];
      const totalVendido = dayOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const pedidosCount = dayOrders.length;
      const cobrado = dayOrders.reduce((acc, o) => acc + (o.pagado || 0), 0);
      const ticketPromedio = pedidosCount > 0 ? totalVendido / pedidosCount : 0;

      return {
        dateKey,
        shortLabel: formatShortDateSpanish(dateKey),
        fullDate: formatDateSpanish(dateKey),
        totalVendido,
        pedidosCount,
        cobrado,
        ticketPromedio,
      };
    });
  }, [chartDaysList, dailyOrdersMap]);

  // Overall metrics for the current active range filter
  const overallRangeOrders = useMemo(() => {
    const now = new Date();
    return validOrders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (range === 'today') {
        return orderDate.toDateString() === now.toDateString();
      } else if (range === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= past7;
      } else if (range === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= past30;
      } else if (range === 'this_month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [validOrders, range]);

  const overallTotalVendido = useMemo(
    () => overallRangeOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    [overallRangeOrders]
  );
  const overallPedidosCount = overallRangeOrders.length;
  const overallTicketPromedio =
    overallPedidosCount > 0 ? overallTotalVendido / overallPedidosCount : 0;

  // -------------------------------------------------------------
  // SPECIFIC SELECTED DAY METRICS & BREAKDOWN
  // -------------------------------------------------------------
  const dayOrders = useMemo(() => {
    return validOrders.filter((o) => toLocalDateKey(o.createdAt) === selectedDay);
  }, [validOrders, selectedDay]);

  const dayCanceledOrders = useMemo(() => {
    return canceledOrders.filter((o) => toLocalDateKey(o.createdAt) === selectedDay);
  }, [canceledOrders, selectedDay]);

  // 1. Total vendido ese día
  const dayTotalVendido = useMemo(
    () => dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    [dayOrders]
  );
  const dayTotalCobrado = useMemo(
    () => dayOrders.reduce((sum, o) => sum + (o.pagado || 0), 0),
    [dayOrders]
  );
  const dayTotalSaldo = useMemo(
    () => dayOrders.reduce((sum, o) => sum + (o.saldo || 0), 0),
    [dayOrders]
  );
  const dayPedidosCount = dayOrders.length;

  // 3. Ticket promedio del día
  const dayTicketPromedio =
    dayPedidosCount > 0 ? dayTotalVendido / dayPedidosCount : 0;

  // 1. Cliente que más compró ese día (nombre, monto, productos)
  const dayTopClient = useMemo(() => {
    if (dayOrders.length === 0) return null;

    interface ClientAgg {
      clientKey: string;
      nombre: string;
      telefono: string;
      lugarEntrega: string;
      totalMonto: number;
      totalPagado: number;
      totalSaldo: number;
      pedidosCount: number;
      productosMap: Map<string, { nombre: string; variante: string; cantidad: number; subtotal: number; precioUnitario: number }>;
    }

    const clientMap = new Map<string, ClientAgg>();

    dayOrders.forEach((o) => {
      const phoneDigits = (o.telefono || '').replace(/\D/g, '');
      const key = phoneDigits.length >= 7 ? phoneDigits : (o.cliente || 'Sin nombre').trim().toLowerCase();

      if (!clientMap.has(key)) {
        clientMap.set(key, {
          clientKey: key,
          nombre: (o.cliente || 'Sin nombre').trim(),
          telefono: o.telefono || '',
          lugarEntrega: o.lugarEntrega || '',
          totalMonto: 0,
          totalPagado: 0,
          totalSaldo: 0,
          pedidosCount: 0,
          productosMap: new Map(),
        });
      }

      const clientEntry = clientMap.get(key)!;
      if ((o.cliente || '').trim().length > clientEntry.nombre.length) {
        clientEntry.nombre = o.cliente.trim();
      }
      if (o.lugarEntrega && !clientEntry.lugarEntrega) {
        clientEntry.lugarEntrega = o.lugarEntrega;
      }
      clientEntry.totalMonto += o.total || 0;
      clientEntry.totalPagado += o.pagado || 0;
      clientEntry.totalSaldo += o.saldo || 0;
      clientEntry.pedidosCount += 1;

      // Add products
      (o.productos || []).forEach((p) => {
        const prodKey = `${p.nombre.trim()}_${(p.variante || '').trim()}`;
        if (!clientEntry.productosMap.has(prodKey)) {
          clientEntry.productosMap.set(prodKey, {
            nombre: p.nombre.trim(),
            variante: p.variante || '',
            cantidad: 0,
            subtotal: 0,
            precioUnitario: p.precioUnitario || 0,
          });
        }
        const itemEntry = clientEntry.productosMap.get(prodKey)!;
        itemEntry.cantidad += p.cantidad || 1;
        itemEntry.subtotal += (p.cantidad || 1) * (p.precioUnitario || 0);
      });
    });

    const sortedClients = Array.from(clientMap.values()).sort(
      (a, b) => b.totalMonto - a.totalMonto
    );

    if (sortedClients.length === 0) return null;

    const top = sortedClients[0];
    return {
      ...top,
      productos: Array.from(top.productosMap.values()).sort(
        (a, b) => b.subtotal - a.subtotal
      ),
      totalClientsTodayCount: sortedClients.length,
    };
  }, [dayOrders]);

  // 1. Desglose de ventas por vendedora ese día (nombre, cantidad de pedidos, total vendido)
  const daySellerBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        nombre: string;
        pedidosCount: number;
        totalVendido: number;
        totalCobrado: number;
        saldo: number;
      }
    >();

    dayOrders.forEach((o) => {
      const seller = o.vendedorNombre || 'Sin asignar';
      if (!map.has(seller)) {
        map.set(seller, {
          nombre: seller,
          pedidosCount: 0,
          totalVendido: 0,
          totalCobrado: 0,
          saldo: 0,
        });
      }
      const entry = map.get(seller)!;
      entry.pedidosCount += 1;
      entry.totalVendido += o.total || 0;
      entry.totalCobrado += o.pagado || 0;
      entry.saldo += o.saldo || 0;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        ticketPromedio: item.pedidosCount > 0 ? item.totalVendido / item.pedidosCount : 0,
        percentage:
          dayTotalVendido > 0
            ? Math.round((item.totalVendido / dayTotalVendido) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalVendido - a.totalVendido);
  }, [dayOrders, dayTotalVendido]);

  // 1. Lista de productos vendidos ese día con cantidad y monto por producto
  const dayProductsSold = useMemo(() => {
    const map = new Map<
      string,
      {
        nombre: string;
        variantesSet: Set<string>;
        cantidad: number;
        totalBs: number;
      }
    >();

    dayOrders.forEach((o) => {
      (o.productos || []).forEach((p) => {
        const prodName = p.nombre.trim();
        if (!map.has(prodName)) {
          map.set(prodName, {
            nombre: prodName,
            variantesSet: new Set(),
            cantidad: 0,
            totalBs: 0,
          });
        }
        const entry = map.get(prodName)!;
        entry.cantidad += p.cantidad || 1;
        entry.totalBs += (p.cantidad || 1) * (p.precioUnitario || 0);
        if (p.variante && p.variante.trim()) {
          entry.variantesSet.add(p.variante.trim());
        }
      });
    });

    const list = Array.from(map.values()).map((p) => ({
      nombre: p.nombre,
      variantes: Array.from(p.variantesSet),
      cantidad: p.cantidad,
      totalBs: p.totalBs,
      precioPromedio: p.cantidad > 0 ? p.totalBs / p.cantidad : 0,
      porcentajeTotal:
        dayTotalVendido > 0 ? Math.round((p.totalBs / dayTotalVendido) * 100) : 0,
    }));

    // Filter by search
    const filtered = productSearch.trim()
      ? list.filter((item) =>
          item.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
          item.variantes.some((v) => v.toLowerCase().includes(productSearch.toLowerCase()))
        )
      : list;

    // Sort
    return filtered.sort((a, b) => {
      if (productSortBy === 'totalBs') {
        return b.totalBs - a.totalBs || b.cantidad - a.cantidad;
      }
      return b.cantidad - a.cantidad || b.totalBs - a.totalBs;
    });
  }, [dayOrders, dayTotalVendido, productSearch, productSortBy]);

  // Navigation handlers for days
  const handlePrevDay = () => {
    setUserSelectedManually(true);
    const [y, m, d] = selectedDay.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    setSelectedDay(toLocalDateKey(prev));
  };

  const handleNextDay = () => {
    setUserSelectedManually(true);
    const [y, m, d] = selectedDay.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    setSelectedDay(toLocalDateKey(next));
  };

  const isSelectedToday = selectedDay === todayKey;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ------------------------------------------------------------- */}
      {/* FILTER & PERIOD SELECTION BAR */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`border rounded-2xl p-4 shadow-sm space-y-3.5 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Range Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => {
                onRangeChange('today');
                setSelectedDay(todayKey);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                range === 'today'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md'
                    : 'bg-[#1A2B5C] text-white font-black shadow-md'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Hoy (Diario)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onRangeChange('this_week');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                range === 'this_week'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md'
                    : 'bg-[#1A2B5C] text-white font-black shadow-md'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <span>⚡ Esta Semana</span>
            </button>

            <button
              type="button"
              onClick={() => onRangeChange('7days')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                range === '7days'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md'
                    : 'bg-[#1A2B5C] text-white font-black shadow-md'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Últimos 7 Días
            </button>

            <button
              type="button"
              onClick={() => onRangeChange('this_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                range === 'this_month'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md'
                    : 'bg-[#1A2B5C] text-white font-black shadow-md'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Este Mes
            </button>

            <button
              type="button"
              onClick={() => onRangeChange('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                range === 'all'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md'
                    : 'bg-[#1A2B5C] text-white font-black shadow-md'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Histórico Total
            </button>
          </div>

          {/* Seller Select */}
          {allSellers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Vendedor:
              </span>
              <select
                value={selectedSeller}
                onChange={(e) => onSellerChange(e.target.value)}
                className={`text-xs font-bold border rounded-xl px-2.5 py-1.5 focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] text-white border-[#223368]'
                    : 'bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]'
                }`}
              >
                <option value="all">Todos los vendedores</option>
                {allSellers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date Navigator for Specific Day selection */}
        <div
          className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
              📅 Día en Detalle:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Día anterior"
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] hover:bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                    : 'border-[#E8DFC8] hover:bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <input
                type="date"
                value={selectedDay}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDay(e.target.value);
                    setUserSelectedManually(true);
                  }
                }}
                className={`text-xs font-bold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              />

              <button
                type="button"
                onClick={handleNextDay}
                title="Día siguiente"
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  isDark
                    ? 'border-[#223368] hover:bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                    : 'border-[#E8DFC8] hover:bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {!isSelectedToday && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(todayKey);
                    setUserSelectedManually(true);
                  }}
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ml-1 ${
                    isDark
                      ? 'border-[#FF6FA5]/40 text-[#FF6FA5] hover:bg-[#FF6FA5]/10'
                      : 'border-[#1A2B5C]/30 text-[#1A2B5C] hover:bg-[#1A2B5C]/10'
                  }`}
                >
                  Ir a Hoy
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`font-extrabold capitalize ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}
            >
              {formatDateSpanish(selectedDay)}
            </span>
            {isSelectedToday && (
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isDark
                    ? 'bg-[#FF6FA5]/20 text-[#FF6FA5]'
                    : 'bg-[#1A2B5C]/10 text-[#1A2B5C]'
                }`}
              >
                Hoy
              </span>
            )}
          </div>
        </div>

        {/* Quick Date Pills for Days with Sales */}
        {daysWithSalesSummary.length > 0 && (
          <div
            className={`pt-2.5 border-t flex flex-wrap items-center gap-1.5 text-xs ${
              isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
            }`}
          >
            <span className={`text-[11px] font-bold mr-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              ⚡ Días con actividad reciente:
            </span>
            {daysWithSalesSummary.slice(0, 6).map((dayItem) => {
              const isSelected = selectedDay === dayItem.dateKey;
              const isToday = dayItem.dateKey === todayKey;
              return (
                <button
                  key={dayItem.dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDay(dayItem.dateKey);
                    setUserSelectedManually(true);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? isDark
                        ? 'bg-[#FF6FA5] text-[#0F1B3C] border-[#FF6FA5] shadow-sm font-black'
                        : 'bg-[#1A2B5C] text-white border-[#1A2B5C] shadow-sm font-black'
                      : isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-[#9AA6C9] hover:text-white hover:border-[#FF6FA5]/40'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#F5EFE0]'
                  }`}
                >
                  <span>{isToday ? 'Hoy' : dayItem.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isSelected
                        ? isDark
                          ? 'bg-[#0F1B3C]/30 text-[#0F1B3C]'
                          : 'bg-white/30 text-white'
                        : isDark
                        ? 'bg-[#16234F] text-[#FF6FA5]'
                        : 'bg-white text-[#1A2B5C] border border-[#E8DFC8]'
                    }`}
                  >
                    {dayItem.count} {dayItem.count === 1 ? 'venta' : 'ventas'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Zero Orders Warning Banner with 1-Click Jump to Last Active Day */}
      {dayOrders.length === 0 && (
        <div
          className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm ${
            isDark
              ? 'bg-[#16234F] border-amber-500/40 text-amber-200'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                {isSelectedToday
                  ? 'Hoy aún no se han registrado ventas en la base de datos.'
                  : `No se encontraron ventas para la fecha seleccionada (${formatDateSpanish(selectedDay)}).`}
              </p>
              {latestDayWithOrders !== selectedDay && daysWithSalesSummary.length > 0 && (
                <p className="text-xs opacity-90 mt-0.5">
                  El último día con ventas fue el <strong>{formatDateSpanish(latestDayWithOrders)}</strong> ({daysWithSalesSummary[0]?.count} pedidos registrados).
                </p>
              )}
            </div>
          </div>
          {latestDayWithOrders !== selectedDay && (
            <button
              type="button"
              onClick={() => {
                setSelectedDay(latestDayWithOrders);
                setUserSelectedManually(true);
              }}
              className="px-3.5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              Ver {formatShortDateSpanish(latestDayWithOrders)} ({daysWithSalesSummary[0]?.count} ventas)
            </button>
          )}
        </div>
      )}

      {/* Privacy Mode Banner if Balances are Hidden */}
      {!showBalances && (
        <div
          onClick={toggleShowBalances}
          className={`p-3 border rounded-2xl flex items-center justify-between gap-3 text-xs cursor-pointer transition shadow-sm ${
            isDark
              ? 'bg-[#16234F] border-[#223368] text-[#9AA6C9] hover:border-[#FF6FA5]/50'
              : 'bg-white border-[#E8DFC8] text-[#78716C] hover:border-[#1A2B5C]/40'
          }`}
          title="Haz clic para mostrar todos los montos monetarios"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">👁️</span>
            <span>
              <strong>Modo Privacidad Activo:</strong> Los importes se muestran protegidos como <span className="font-mono font-bold">Bs. •••••</span>.
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleShowBalances();
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition shrink-0"
          >
            Mostrar Montos Reales
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* KPI CARDS: OVERALL RANGE + SELECTED DAY HIGHLIGHT */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Vendido (Selected Day) */}
        <div
          onClick={toggleShowBalances}
          className={`border rounded-2xl p-4 shadow-sm cursor-pointer select-none transition ${
            isDark
              ? 'bg-[#16234F] border-[#223368] hover:border-[#FF6FA5]/50'
              : 'bg-white border-[#E8DFC8] hover:border-[#1A2B5C]/40'
          }`}
          title="Clic para ocultar/mostrar montos"
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}
            >
              Ventas del Día
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isDark ? 'bg-[#0F1B3C] text-[#FF6FA5]' : 'bg-[#FBF7EF] text-[#1A2B5C]'
              }`}
            >
              {isSelectedToday ? 'Hoy' : formatShortDateSpanish(selectedDay)}
            </span>
          </div>
          <span
            className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] block ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}
          >
            {formatBalance(dayTotalVendido)}
          </span>
          <span
            className={`text-[11px] block mt-0.5 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]/80'
            }`}
          >
            {dayPedidosCount} {dayPedidosCount === 1 ? 'pedido' : 'pedidos'} ese día
          </span>
        </div>

        {/* Ticket Promedio del Día */}
        <div
          onClick={toggleShowBalances}
          className={`border rounded-2xl p-4 shadow-sm cursor-pointer select-none transition ${
            isDark
              ? 'bg-[#16234F] border-[#223368] hover:border-[#FF6FA5]/50'
              : 'bg-white border-[#E8DFC8] hover:border-[#1A2B5C]/40'
          }`}
          title="Ticket Promedio = Total Vendido / Número de Pedidos"
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
              }`}
            >
              Ticket Promedio Día
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span
            className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] block ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}
          >
            {formatBalance(dayTicketPromedio)}
          </span>
          <span
            className={`text-[11px] block mt-0.5 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]/80'
            }`}
          >
            Promedio por pedido del día
          </span>
        </div>

        {/* Cobrado en Caja ese día */}
        <div
          onClick={toggleShowBalances}
          className={`border rounded-2xl p-4 shadow-sm cursor-pointer select-none transition ${
            isDark
              ? 'bg-[#16234F] border-emerald-500/30 hover:border-emerald-500/60'
              : 'bg-white border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
            Cobrado en Caja (Día)
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif] block">
            {formatBalance(dayTotalCobrado)}
          </span>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 block mt-0.5">
            Saldo por cobrar: <strong>{formatBalance(dayTotalSaldo)}</strong>
          </span>
        </div>

        {/* Total & Ticket del Periodo Seleccionado */}
        <div
          onClick={toggleShowBalances}
          className={`border rounded-2xl p-4 shadow-sm cursor-pointer select-none transition ${
            isDark
              ? 'bg-[#16234F] border-[#223368] hover:border-[#FF6FA5]/50'
              : 'bg-white border-[#E8DFC8] hover:border-[#1A2B5C]/40'
          }`}
          title="Métricas acumuladas del rango seleccionado arriba"
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}
            >
              Ticket Periodo ({range === 'today' ? 'Hoy' : range === '7days' ? '7 Días' : range === 'this_month' ? 'Mes' : 'Total'})
            </span>
            <Award className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span
            className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] block ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}
          >
            {formatBalance(overallTicketPromedio)}
          </span>
          <span
            className={`text-[11px] block mt-0.5 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]/80'
            }`}
          >
            Total periodo: {formatBalance(overallTotalVendido)} ({overallPedidosCount} ped.)
          </span>
        </div>
      </div>

      {/* Canceled orders warning if any on that day */}
      {dayCanceledOrders.length > 0 && (
        <div className="p-3.5 border rounded-2xl flex items-center justify-between text-xs bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800/40 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>Ventas Anuladas en este día:</strong> {dayCanceledOrders.length} pedido(s)
              anulado(s) por un valor de {formatBalance(dayCanceledOrders.reduce((sum, o) => sum + (o.total || 0), 0))}.
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. GRÁFICO DINÁMICO DE BARRAS O LÍNEA POR DÍA */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`border rounded-3xl p-5 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-inherit">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl border ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              {chartType === 'bar' ? (
                <BarChart3 className="w-4 h-4" />
              ) : (
                <LineChartIcon className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2
                className={`text-sm sm:text-base font-bold font-['Outfit',sans-serif] ${
                  isDark ? 'text-white' : 'text-[#1A2B5C]'
                }`}
              >
                Ventas Diarias en el Periodo ({chartDaysList.length} días)
              </h2>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Haz clic en cualquier barra o punto para inspeccionar el detalle completo de ese día.
              </p>
            </div>
          </div>

          {/* Toggle between Bar and Line Chart */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                chartType === 'bar'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black'
                    : 'bg-[#1A2B5C] text-white font-black'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Barras</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                chartType === 'line'
                  ? isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black'
                    : 'bg-[#1A2B5C] text-white font-black'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Línea</span>
            </button>
          </div>
        </div>

        {/* Chart Rendering */}
        <div className="h-64 sm:h-72 w-full pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[#78716C]">
              Sin datos de ventas en este periodo.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
              {chartType === 'bar' ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      const dataPoint = e.activePayload[0].payload;
                      if (dataPoint?.dateKey) {
                        setSelectedDay(dataPoint.dateKey);
                      }
                    }
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#223368' : '#E8DFC8'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#9AA6C9' : '#78716C',
                    }}
                    axisLine={{ stroke: isDark ? '#223368' : '#E8DFC8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#9AA6C9' : '#78716C',
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `Bs.${val}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div
                            className={`p-3 rounded-2xl border shadow-xl text-xs space-y-1 ${
                              isDark
                                ? 'bg-[#0F1B3C] border-[#223368] text-white'
                                : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                            }`}
                          >
                            <p className="font-extrabold text-[11px] opacity-80">{d.fullDate}</p>
                            <p className="text-sm font-black text-[#FF6FA5] dark:text-[#FF6FA5]">
                              Total: {formatBalance(d.totalVendido)}
                            </p>
                            <div className="flex items-center gap-3 pt-0.5 text-[11px] opacity-90">
                              <span>📦 {d.pedidosCount} pedidos</span>
                              <span>🎟️ Ticket: {formatBalance(d.ticketPromedio)}</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                              Cobrado en caja: {formatBalance(d.cobrado)}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="totalVendido"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => {
                      const isDaySelected = entry.dateKey === selectedDay;
                      const isToday = entry.dateKey === todayKey;
                      let barColor = isDark ? '#223368' : '#1A2B5C';
                      if (isDaySelected) {
                        barColor = '#FF6FA5';
                      } else if (isToday) {
                        barColor = '#10B981';
                      }
                      return <Cell key={`cell-${index}`} fill={barColor} />;
                    })}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      const dataPoint = e.activePayload[0].payload;
                      if (dataPoint?.dateKey) {
                        setSelectedDay(dataPoint.dateKey);
                      }
                    }
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#223368' : '#E8DFC8'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#9AA6C9' : '#78716C',
                    }}
                    axisLine={{ stroke: isDark ? '#223368' : '#E8DFC8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#9AA6C9' : '#78716C',
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `Bs.${val}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div
                            className={`p-3 rounded-2xl border shadow-xl text-xs space-y-1 ${
                              isDark
                                ? 'bg-[#0F1B3C] border-[#223368] text-white'
                                : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                            }`}
                          >
                            <p className="font-extrabold text-[11px] opacity-80">{d.fullDate}</p>
                            <p className="text-sm font-black text-[#FF6FA5] dark:text-[#FF6FA5]">
                              Total: {formatBalance(d.totalVendido)}
                            </p>
                            <div className="flex items-center gap-3 pt-0.5 text-[11px] opacity-90">
                              <span>📦 {d.pedidosCount} pedidos</span>
                              <span>🎟️ Ticket: {formatBalance(d.ticketPromedio)}</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                              Cobrado: {formatBalance(d.cobrado)}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalVendido"
                    stroke={isDark ? '#FF6FA5' : '#1A2B5C'}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: isDark ? '#FF6FA5' : '#1A2B5C',
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 7,
                      fill: '#FF6FA5',
                    }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] pt-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6FA5]" />
              <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>
                Día seleccionado ({formatShortDateSpanish(selectedDay)})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>
                Hoy
              </span>
            </div>
          </div>
          <span className={`text-[11px] font-semibold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Total periodo:{' '}
            <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>
              {formatBalance(overallTotalVendido)}
            </strong>
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. SELECCIÓN DIARIA EN PROFUNDIDAD: CLIENTE TOP, VENDEDORAS & PRODUCTOS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ======================================================= */}
        {/* CLIENTE QUE MÁS COMPRÓ ESE DÍA (NOMBRE, MONTO, PRODUCTOS) */}
        {/* ======================================================= */}
        <div
          className={`lg:col-span-5 border rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between border-b pb-3 border-inherit">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    className={`text-sm sm:text-base font-bold font-['Outfit',sans-serif] ${
                      isDark ? 'text-white' : 'text-[#1A2B5C]'
                    }`}
                  >
                    Cliente Top del Día
                  </h3>
                  <span className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Mayor compra registrada en esta fecha
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  isDark ? 'bg-[#0F1B3C] text-amber-400' : 'bg-[#FBF7EF] text-amber-800'
                }`}
              >
                Top #1
              </span>
            </div>

            {dayTopClient ? (
              <div className="space-y-3.5 pt-3">
                {/* Client Main Info Badge */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">👑</span>
                      <h4
                        className={`text-sm sm:text-base font-black ${
                          isDark ? 'text-white' : 'text-[#1A2B5C]'
                        }`}
                      >
                        {dayTopClient.nombre}
                      </h4>
                    </div>

                    {dayTopClient.telefono && (
                      <p
                        className={`text-xs flex items-center gap-1.5 ${
                          isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                        }`}
                      >
                        <Phone className="w-3 h-3" />
                        <span>{formatBoliviaPhone(dayTopClient.telefono)}</span>
                      </p>
                    )}

                    {dayTopClient.lugarEntrega && (
                      <p
                        className={`text-[11px] flex items-center gap-1.5 line-clamp-1 ${
                          isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0 text-amber-500" />
                        <span className="truncate">{dayTopClient.lugarEntrega}</span>
                      </p>
                    )}
                  </div>

                  {/* Total spent by top client */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-base sm:text-lg font-black font-mono block ${
                        isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                      }`}
                    >
                      {formatBalance(dayTopClient.totalMonto)}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                      Cobrado: {formatBalance(dayTopClient.totalPagado)}
                    </span>
                    {dayTopClient.totalSaldo > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                        Saldo: {formatBalance(dayTopClient.totalSaldo)}
                      </span>
                    )}
                  </div>
                </div>

                {/* List of Products bought by this Top Client that day */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                      }`}
                    >
                      Artículos Comprados ({dayTopClient.productos.length}):
                    </span>
                    <span className="text-[10px] text-[#78716C]">
                      {dayTopClient.pedidosCount} {dayTopClient.pedidosCount === 1 ? 'pedido' : 'pedidos'}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {dayTopClient.productos.map((prod, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          isDark
                            ? 'bg-[#0F1B3C]/70 border-[#223368]'
                            : 'bg-white border-[#E8DFC8]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${
                              isDark
                                ? 'bg-[#FF6FA5]/20 text-[#FF6FA5]'
                                : 'bg-[#1A2B5C]/10 text-[#1A2B5C]'
                            }`}
                          >
                            {prod.cantidad}x
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`font-bold truncate ${
                                isDark ? 'text-white' : 'text-[#1A2B5C]'
                              }`}
                            >
                              {prod.nombre}
                            </p>
                            {prod.variante && (
                              <p className="text-[10px] text-[#78716C] truncate">
                                {prod.variante}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-black font-mono block ${
                              isDark ? 'text-white' : 'text-[#1A2B5C]'
                            }`}
                          >
                            {formatBalance(prod.subtotal)}
                          </span>
                          <span className="text-[10px] opacity-70 block">
                            @{formatBalance(prod.precioUnitario)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-[#78716C] opacity-40" />
                <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  No se registraron ventas en esta fecha.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDay(todayKey)}
                  className={`text-xs font-bold underline cursor-pointer ${
                    isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                  }`}
                >
                  Ver ventas de hoy
                </button>
              </div>
            )}
          </div>

          {dayTopClient && dayTopClient.totalClientsTodayCount > 1 && (
            <div
              className={`pt-3 border-t text-[11px] flex items-center justify-between ${
                isDark ? 'border-[#223368] text-[#9AA6C9]' : 'border-[#E8DFC8] text-[#78716C]'
              }`}
            >
              <span>
                Total clientes que compraron hoy: <strong>{dayTopClient.totalClientsTodayCount}</strong>
              </span>
              <span className="text-[10px] opacity-80">
                Ticket promedio:{' '}
                <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>
                  {formatBalance(dayTicketPromedio)}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* ======================================================= */}
        {/* DESGLOSE DE VENTAS POR VENDEDORA ESE DÍA */}
        {/* ======================================================= */}
        <div
          className={`lg:col-span-7 border rounded-3xl p-5 shadow-sm space-y-4 transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-inherit">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3
                  className={`text-sm sm:text-base font-bold font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  Desglose por Vendedora (Día)
                </h3>
                <span className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Pedidos registrados, total vendido y cobrado por persona
                </span>
              </div>
            </div>

            <span
              className={`text-xs font-bold ${
                isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
              }`}
            >
              Total día: {formatBalance(dayTotalVendido)}
            </span>
          </div>

          <div className="space-y-3">
            {daySellerBreakdown.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Users className="w-8 h-8 mx-auto text-[#78716C] opacity-40" />
                <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  Sin ventas de vendedoras en esta fecha.
                </p>
              </div>
            ) : (
              daySellerBreakdown.map((seller, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border space-y-2.5 transition ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] hover:border-[#FF6FA5]/40'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] hover:border-[#1A2B5C]/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            : isDark
                            ? 'bg-[#16234F] text-[#9AA6C9]'
                            : 'bg-white text-[#1A2B5C] border border-[#E8DFC8]'
                        }`}
                      >
                        {idx === 0 ? '👑 1' : `#${idx + 1}`}
                      </div>

                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            isDark ? 'text-white' : 'text-[#1A2B5C]'
                          }`}
                        >
                          {seller.nombre}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-[#78716C]">
                          <span>
                            <strong>{seller.pedidosCount}</strong> {seller.pedidosCount === 1 ? 'pedido' : 'pedidos'}
                          </span>
                          <span>•</span>
                          <span>Ticket prom: {formatBalance(seller.ticketPromedio)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm sm:text-base font-black font-mono block ${
                          isDark ? 'text-white' : 'text-[#1A2B5C]'
                        }`}
                      >
                        {formatBalance(seller.totalVendido)}
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
                        Cobrado: {formatBalance(seller.totalCobrado)}
                      </span>
                      {seller.saldo > 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block">
                          Saldo: {formatBalance(seller.saldo)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Percentage Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] opacity-80">
                      <span>Participación en ventas del día</span>
                      <span className="font-bold">{seller.percentage}%</span>
                    </div>
                    <div
                      className={`w-full h-1.5 rounded-full overflow-hidden ${
                        isDark ? 'bg-[#16234F]' : 'bg-[#E8DFC8]'
                      }`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#1A2B5C] to-[#FF6FA5] dark:from-[#FF6FA5] dark:to-pink-500"
                        style={{ width: `${Math.max(4, seller.percentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* 1. LISTA COMPLETA DE PRODUCTOS VENDIDOS ESE DÍA (CANTIDAD Y MONTO) */}
      {/* ======================================================= */}
      <div
        className={`border rounded-3xl p-5 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-inherit">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl border ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3
                className={`text-sm sm:text-base font-bold font-['Outfit',sans-serif] ${
                  isDark ? 'text-white' : 'text-[#1A2B5C]'
                }`}
              >
                Productos Vendidos el {formatShortDateSpanish(selectedDay)} ({dayProductsSold.length} distintos)
              </h3>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Detalle exacto de cantidades despachadas y monto generado en Bolivianos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search within products */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar artículo..."
                className={`text-xs rounded-xl pl-8 pr-3 py-1.5 border focus:outline-none ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              />
            </div>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() =>
                setProductSortBy((prev) =>
                  prev === 'totalBs' ? 'cantidad' : 'totalBs'
                )
              }
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] hover:border-[#FF6FA5] text-white'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] hover:border-[#1A2B5C] text-[#1A2B5C]'
              }`}
              title="Alternar ordenamiento por monto o unidades"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>
                {productSortBy === 'totalBs' ? 'Mayor Monto (Bs.)' : 'Mayor Cantidad (u)'}
              </span>
            </button>
          </div>
        </div>

        {dayProductsSold.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Package className="w-8 h-8 mx-auto text-[#78716C] opacity-40" />
            <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              {productSearch
                ? 'No se encontraron artículos con ese término.'
                : 'Sin productos vendidos en esta fecha.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row on desktop */}
            <div
              className={`hidden md:grid grid-cols-12 gap-3 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider opacity-70 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}
            >
              <span className="col-span-6">Producto y Variantes</span>
              <span className="col-span-2 text-center">Unidades Vendidas</span>
              <span className="col-span-2 text-right">Precio Promedio</span>
              <span className="col-span-2 text-right">Total Generado</span>
            </div>

            {dayProductsSold.map((prod, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border flex flex-col md:grid md:grid-cols-12 md:items-center gap-2 md:gap-3 transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] hover:border-[#FF6FA5]/40'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] hover:border-[#1A2B5C]/30'
                }`}
              >
                {/* Product Name & Variants */}
                <div className="md:col-span-6 flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                      idx < 3
                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                        : isDark
                        ? 'bg-[#16234F] text-[#9AA6C9]'
                        : 'bg-white text-[#1A2B5C] border border-[#E8DFC8]'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h4
                      className={`text-xs sm:text-sm font-bold truncate ${
                        isDark ? 'text-white' : 'text-[#1A2B5C]'
                      }`}
                    >
                      {prod.nombre}
                    </h4>
                    {prod.variantes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {prod.variantes.map((v, vIdx) => (
                          <span
                            key={vIdx}
                            className={`text-[10px] px-1.5 py-0.2 rounded border ${
                              isDark
                                ? 'bg-[#16234F] border-[#223368] text-[#9AA6C9]'
                                : 'bg-white border-[#E8DFC8] text-[#78716C]'
                            }`}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Units Sold */}
                <div className="md:col-span-2 flex md:justify-center items-center gap-1.5">
                  <span className="text-[11px] md:hidden text-[#78716C]">Cantidad:</span>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                      isDark
                        ? 'bg-[#FF6FA5]/20 text-[#FF6FA5]'
                        : 'bg-[#1A2B5C]/10 text-[#1A2B5C]'
                    }`}
                  >
                    {prod.cantidad} {prod.cantidad === 1 ? 'unidad' : 'unidades'}
                  </span>
                </div>

                {/* Avg Unit Price */}
                <div className="md:col-span-2 flex md:justify-end items-center gap-1.5 text-right">
                  <span className="text-[11px] md:hidden text-[#78716C]">P. Promedio:</span>
                  <span
                    className={`text-xs font-semibold ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  >
                    {formatCurrency(prod.precioPromedio)} / u
                  </span>
                </div>

                {/* Total Bs Amount */}
                <div className="md:col-span-2 flex md:justify-end items-center justify-between md:justify-items-end text-right">
                  <span className="text-[11px] md:hidden text-[#78716C]">Total:</span>
                  <div>
                    <span
                      className={`text-sm sm:text-base font-black font-mono block ${
                        isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                      }`}
                    >
                      {formatCurrency(prod.totalBs)}
                    </span>
                    <span className="text-[10px] opacity-70 block">
                      {prod.porcentajeTotal}% del día
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LISTA COMPLETA DE PEDIDOS DEL DÍA SELECCIONADO (AUDITORÍA RÁPIDA) */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`border rounded-3xl p-5 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl border ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3
                className={`text-sm sm:text-base font-bold font-['Outfit',sans-serif] ${
                  isDark ? 'text-white' : 'text-[#1A2B5C]'
                }`}
              >
                Pedidos Registrados el {formatShortDateSpanish(selectedDay)} ({dayOrders.length})
              </h3>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Auditoría rápida de órdenes concretadas en esta fecha
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-bold ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}
          >
            Ticket promedio: <strong>{formatBalance(dayTicketPromedio)}</strong>
          </span>
        </div>

        {dayOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#78716C]">
            No hay pedidos efectivos registrados en este día.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {dayOrders.map((o) => {
              const timeStr = new Date(o.createdAt).toLocaleTimeString('es-BO', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={o.id}
                  className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8]'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span
                      className={`font-black font-mono text-xs px-2.5 py-1 rounded-xl shrink-0 ${
                        isDark
                          ? 'bg-[#16234F] text-[#FF6FA5]'
                          : 'bg-white border border-[#E8DFC8] text-[#1A2B5C]'
                      }`}
                    >
                      #{o.orderNumber}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <h5
                          className={`text-xs sm:text-sm font-bold ${
                            isDark ? 'text-white' : 'text-[#1A2B5C]'
                          }`}
                        >
                          {o.cliente}
                        </h5>
                        <span className="text-[10px] text-[#78716C]">• {timeStr}</span>
                      </div>

                      <p
                        className={`text-[11px] line-clamp-1 ${
                          isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                        }`}
                      >
                        {(o.productos || [])
                          .map((p) => `${p.cantidad}x ${p.nombre}`)
                          .join(', ')}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-[#78716C] mt-0.5">
                        <span>Vendido por: <strong>{o.vendedorNombre || 'Sin asignar'}</strong></span>
                        {o.lugarEntrega && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{o.lugarEntrega}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-inherit">
                    <span
                      className={`text-sm font-black font-mono ${
                        isDark ? 'text-white' : 'text-[#1A2B5C]'
                      }`}
                    >
                      {formatBalance(o.total)}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Pagado: {formatBalance(o.pagado)}
                      </span>
                      {o.saldo > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Saldo: {formatBalance(o.saldo)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
