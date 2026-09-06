import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Award,
  Package,
  Users,
  DollarSign,
  FileText,
  Download,
  Search,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  ArrowUpDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
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
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Order } from '../../types';
import { formatCurrency } from '../../lib/storage';
import { useFinancialPrivacy } from '../../contexts/FinancialPrivacyContext';
import { BalanceToggleBtn } from '../BalanceToggleBtn';
import {
  ExecutiveSummaryModal,
  ExecutiveSummaryData,
} from './ExecutiveSummaryModal';

interface ComparativeSalesReportProps {
  orders: Order[];
  allSellers?: string[];
  onNavigateToDaily?: () => void;
}

type PeriodMode = 'semanal' | 'mensual';

// Helper to convert date to YYYY-MM-DD
const toLocalDateKey = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Start of week (Monday 00:00:00)
const getStartOfWeek = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  // In JS, 0 is Sunday, 1 is Monday.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// End of week (Sunday 23:59:59.999)
const getEndOfWeek = (startDate: Date): Date => {
  const end = new Date(startDate);
  end.setDate(startDate.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Start of month (1st day 00:00:00)
const getStartOfMonth = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth(), 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

// End of month (last day 23:59:59.999)
const getEndOfMonth = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
};

const formatShortDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

const MONTH_NAMES_ES = [
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

const DAYS_SHORT_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const ComparativeSalesReport: React.FC<ComparativeSalesReportProps> = ({
  orders,
  allSellers = [],
  onNavigateToDaily,
}) => {
  const { formatBalance, toggleShowBalances } = useFinancialPrivacy();

  // Mode: 'semanal' or 'mensual'
  const [periodMode, setPeriodMode] = useState<PeriodMode>('semanal');

  // Offset: 0 = current cycle (current week or current month), -1 = previous, etc.
  const [cycleOffset, setCycleOffset] = useState<number>(0);

  // Selected seller filter
  const [selectedSeller, setSelectedSeller] = useState<string>('all');

  // Chart type toggles
  const [timelineChartType, setTimelineChartType] = useState<'bar' | 'line'>('bar');
  const [breakdownChartType, setBreakdownChartType] = useState<'donut' | 'bar'>('donut');

  // Product sorting & search
  const [productSortBy, setProductSortBy] = useState<'totalBs' | 'cantidad'>('totalBs');
  const [productSearch, setProductSearch] = useState<string>('');

  // Executive summary modal state
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState<boolean>(false);

  // Filter out canceled orders
  const validOrders = useMemo(() => {
    return orders.filter((o) => o.estado !== 'Anulado');
  }, [orders]);

  // Apply seller filter if active
  const filteredOrders = useMemo(() => {
    if (selectedSeller === 'all') return validOrders;
    return validOrders.filter(
      (o) => (o.vendedorNombre || 'Sin asignar') === selectedSeller
    );
  }, [validOrders, selectedSeller]);

  // -------------------------------------------------------------
  // CALCULATE DATE BOUNDARIES (CURRENT CYCLE VS PREVIOUS CYCLE)
  // -------------------------------------------------------------
  const periodDates = useMemo(() => {
    const now = new Date();

    if (periodMode === 'semanal') {
      // Base date shifted by cycleOffset weeks
      const baseDate = new Date(now.getTime() + cycleOffset * 7 * 24 * 60 * 60 * 1000);
      const currentStart = getStartOfWeek(baseDate);
      const currentEnd = getEndOfWeek(currentStart);

      // Previous week
      const previousStart = new Date(currentStart);
      previousStart.setDate(currentStart.getDate() - 7);
      const previousEnd = getEndOfWeek(previousStart);

      const currentLabel = `Semana del ${formatShortDate(currentStart)} al ${formatShortDate(currentEnd)} (${currentStart.getFullYear()})`;
      const previousLabel = `Semana del ${formatShortDate(previousStart)} al ${formatShortDate(previousEnd)}`;

      return {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentLabel,
        previousLabel,
        isCurrent: cycleOffset === 0,
      };
    } else {
      // Monthly mode
      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth() + cycleOffset;
      const targetDate = new Date(currentYear, currentMonthIndex, 1);

      const currentStart = getStartOfMonth(targetDate);
      const currentEnd = getEndOfMonth(targetDate);

      const prevTargetDate = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
      const previousStart = getStartOfMonth(prevTargetDate);
      const previousEnd = getEndOfMonth(prevTargetDate);

      const currentLabel = `${MONTH_NAMES_ES[currentStart.getMonth()]} ${currentStart.getFullYear()}`;
      const previousLabel = `${MONTH_NAMES_ES[previousStart.getMonth()]} ${previousStart.getFullYear()}`;

      return {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentLabel,
        previousLabel,
        isCurrent: cycleOffset === 0,
      };
    }
  }, [periodMode, cycleOffset]);

  // Orders in current and previous periods
  const currentPeriodOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= periodDates.currentStart && d <= periodDates.currentEnd;
    });
  }, [filteredOrders, periodDates]);

  const previousPeriodOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= periodDates.previousStart && d <= periodDates.previousEnd;
    });
  }, [filteredOrders, periodDates]);

  // -------------------------------------------------------------
  // CURRENT PERIOD METRICS
  // -------------------------------------------------------------
  const currentTotalVentas = useMemo(() => {
    return currentPeriodOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [currentPeriodOrders]);

  const currentOrdersCount = currentPeriodOrders.length;
  const currentTicketPromedio =
    currentOrdersCount > 0 ? currentTotalVentas / currentOrdersCount : 0;

  const currentTotalCobrado = useMemo(() => {
    return currentPeriodOrders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  }, [currentPeriodOrders]);

  const currentTotalPorCobrar = Math.max(0, currentTotalVentas - currentTotalCobrado);

  const currentPorcentajeCobrado =
    currentTotalVentas > 0 ? (currentTotalCobrado / currentTotalVentas) * 100 : 0;

  const currentTotalUnits = useMemo(() => {
    return currentPeriodOrders.reduce((acc, o) => {
      const itemsCount = (o.productos || []).reduce((s, it) => s + (it.cantidad || 0), 0);
      return acc + itemsCount;
    }, 0);
  }, [currentPeriodOrders]);

  // -------------------------------------------------------------
  // PREVIOUS PERIOD METRICS
  // -------------------------------------------------------------
  const previousTotalVentas = useMemo(() => {
    return previousPeriodOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [previousPeriodOrders]);

  const previousOrdersCount = previousPeriodOrders.length;
  const previousTicketPromedio =
    previousOrdersCount > 0 ? previousTotalVentas / previousOrdersCount : 0;

  const previousTotalCobrado = useMemo(() => {
    return previousPeriodOrders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  }, [previousPeriodOrders]);

  const previousTotalPorCobrar = Math.max(0, previousTotalVentas - previousTotalCobrado);

  const previousTotalUnits = useMemo(() => {
    return previousPeriodOrders.reduce((acc, o) => {
      const itemsCount = (o.productos || []).reduce((s, it) => s + (it.cantidad || 0), 0);
      return acc + itemsCount;
    }, 0);
  }, [previousPeriodOrders]);

  // -------------------------------------------------------------
  // GROWTH / COMPARATIVE PERCENTAGES
  // -------------------------------------------------------------
  const calcGrowth = (current: number, previous: number): number | null => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  const growthVentasPercent = calcGrowth(currentTotalVentas, previousTotalVentas);
  const growthOrdersPercent = calcGrowth(currentOrdersCount, previousOrdersCount);
  const growthTicketPercent = calcGrowth(currentTicketPromedio, previousTicketPromedio);
  const growthCobradoPercent = calcGrowth(currentTotalCobrado, previousTotalCobrado);
  const growthUnitsPercent = calcGrowth(currentTotalUnits, previousTotalUnits);

  const diffVentasBs = currentTotalVentas - previousTotalVentas;

  // -------------------------------------------------------------
  // TIMELINE CHART DATA (COMPARISON DAY-BY-DAY OR WEEK-BY-WEEK)
  // -------------------------------------------------------------
  const timelineComparisonData = useMemo(() => {
    if (periodMode === 'semanal') {
      // 7 days: Monday to Sunday
      return DAYS_SHORT_ES.map((dayLabel, index) => {
        // Current period day date
        const curDay = new Date(periodDates.currentStart);
        curDay.setDate(periodDates.currentStart.getDate() + index);
        const curKey = toLocalDateKey(curDay);

        // Previous period day date
        const prevDay = new Date(periodDates.previousStart);
        prevDay.setDate(periodDates.previousStart.getDate() + index);
        const prevKey = toLocalDateKey(prevDay);

        const curOrders = currentPeriodOrders.filter(
          (o) => toLocalDateKey(o.createdAt) === curKey
        );
        const prevOrders = previousPeriodOrders.filter(
          (o) => toLocalDateKey(o.createdAt) === prevKey
        );

        const currentVentas = curOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        const previousVentas = prevOrders.reduce((acc, o) => acc + (o.total || 0), 0);

        return {
          name: dayLabel,
          label: `${dayLabel} (${formatShortDate(curDay)})`,
          currentVentas,
          previousVentas,
          curOrdersCount: curOrders.length,
          prevOrdersCount: prevOrders.length,
        };
      });
    } else {
      // Monthly mode: divide into 4 or 5 weeks of the month
      const weeksData = [
        { name: 'Semana 1 (1-7)', startDay: 1, endDay: 7 },
        { name: 'Semana 2 (8-14)', startDay: 8, endDay: 14 },
        { name: 'Semana 3 (15-21)', startDay: 15, endDay: 21 },
        { name: 'Semana 4 (22-28)', startDay: 22, endDay: 28 },
        { name: 'Semana 5 (29+)', startDay: 29, endDay: 31 },
      ];

      return weeksData.map((w) => {
        const curOrders = currentPeriodOrders.filter((o) => {
          const d = new Date(o.createdAt);
          const dayNum = d.getDate();
          return dayNum >= w.startDay && dayNum <= w.endDay;
        });

        const prevOrders = previousPeriodOrders.filter((o) => {
          const d = new Date(o.createdAt);
          const dayNum = d.getDate();
          return dayNum >= w.startDay && dayNum <= w.endDay;
        });

        const currentVentas = curOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        const previousVentas = prevOrders.reduce((acc, o) => acc + (o.total || 0), 0);

        return {
          name: w.name,
          label: w.name,
          currentVentas,
          previousVentas,
          curOrdersCount: curOrders.length,
          prevOrdersCount: prevOrders.length,
        };
      });
    }
  }, [
    periodMode,
    periodDates,
    currentPeriodOrders,
    previousPeriodOrders,
  ]);

  // -------------------------------------------------------------
  // TOP PRODUCTS RANKING (CURRENT PERIOD VS PREVIOUS)
  // -------------------------------------------------------------
  const topProducts = useMemo(() => {
    // Current period products
    const currentMap = new Map<string, { cantidad: number; totalBs: number }>();
    currentPeriodOrders.forEach((o) => {
      (o.productos || []).forEach((it) => {
        const name = (it.nombre || 'Artículo').trim();
        const existing = currentMap.get(name) || { cantidad: 0, totalBs: 0 };
        existing.cantidad += it.cantidad || 0;
        existing.totalBs += (it.cantidad || 0) * (it.precioUnitario || 0);
        currentMap.set(name, existing);
      });
    });

    // Previous period products for comparison
    const previousMap = new Map<string, { cantidad: number; totalBs: number }>();
    previousPeriodOrders.forEach((o) => {
      (o.productos || []).forEach((it) => {
        const name = (it.nombre || 'Artículo').trim();
        const existing = previousMap.get(name) || { cantidad: 0, totalBs: 0 };
        existing.cantidad += it.cantidad || 0;
        existing.totalBs += (it.cantidad || 0) * (it.precioUnitario || 0);
        previousMap.set(name, existing);
      });
    });

    const list = Array.from(currentMap.entries()).map(([name, data]) => {
      const prevData = previousMap.get(name);
      const prevQty = prevData?.cantidad || 0;
      const prevTotalBs = prevData?.totalBs || 0;
      const sharePercent =
        currentTotalVentas > 0 ? (data.totalBs / currentTotalVentas) * 100 : 0;
      const qtyDiff = data.cantidad - prevQty;
      const isNew = !prevData || prevQty === 0;

      return {
        name,
        cantidad: data.cantidad,
        totalBs: data.totalBs,
        prevQty,
        prevTotalBs,
        qtyDiff,
        isNew,
        sharePercent,
        avgPrice: data.cantidad > 0 ? data.totalBs / data.cantidad : 0,
      };
    });

    // Sort by selection
    list.sort((a, b) => {
      if (productSortBy === 'totalBs') {
        return b.totalBs - a.totalBs;
      }
      return b.cantidad - a.cantidad;
    });

    return list;
  }, [currentPeriodOrders, previousPeriodOrders, currentTotalVentas, productSortBy]);

  const filteredTopProducts = useMemo(() => {
    if (!productSearch.trim()) return topProducts;
    const term = productSearch.toLowerCase();
    return topProducts.filter((p) => p.name.toLowerCase().includes(term));
  }, [topProducts, productSearch]);

  const maxProductVal = useMemo(() => {
    if (topProducts.length === 0) return 1;
    return productSortBy === 'totalBs'
      ? Math.max(...topProducts.map((p) => p.totalBs))
      : Math.max(...topProducts.map((p) => p.cantidad));
  }, [topProducts, productSortBy]);

  // -------------------------------------------------------------
  // SELLERS PERFORMANCE RANKING
  // -------------------------------------------------------------
  const sellersRanking = useMemo(() => {
    const map = new Map<
      string,
      { count: number; total: number; cobrado: number }
    >();

    currentPeriodOrders.forEach((o) => {
      const seller = o.vendedorNombre || 'Sin asignar';
      const existing = map.get(seller) || { count: 0, total: 0, cobrado: 0 };
      existing.count += 1;
      existing.total += o.total || 0;
      existing.cobrado += o.pagado || 0;
      map.set(seller, existing);
    });

    // Previous period data for comparison
    const prevMap = new Map<string, { total: number; count: number }>();
    previousPeriodOrders.forEach((o) => {
      const seller = o.vendedorNombre || 'Sin asignar';
      const existing = prevMap.get(seller) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += o.total || 0;
      prevMap.set(seller, existing);
    });

    const list = Array.from(map.entries()).map(([name, data]) => {
      const prev = prevMap.get(name);
      const prevTotal = prev?.total || 0;
      const prevCount = prev?.count || 0;
      const ticketPromedio = data.count > 0 ? data.total / data.count : 0;
      const sharePercent =
        currentTotalVentas > 0 ? (data.total / currentTotalVentas) * 100 : 0;
      const growthPercent = calcGrowth(data.total, prevTotal);
      const porCobrar = Math.max(0, data.total - data.cobrado);

      return {
        name,
        count: data.count,
        total: data.total,
        cobrado: data.cobrado,
        porCobrar,
        ticketPromedio,
        sharePercent,
        prevTotal,
        prevCount,
        growthPercent,
      };
    });

    list.sort((a, b) => b.total - a.total);
    return list;
  }, [currentPeriodOrders, previousPeriodOrders, currentTotalVentas]);

  // -------------------------------------------------------------
  // DONUT / BREAKDOWN CHART DATA (COBRADO VS SALDO PENDIENTE)
  // -------------------------------------------------------------
  const collectionsDonutData = useMemo(() => {
    return [
      {
        name: 'Cobrado en Caja',
        value: currentTotalCobrado,
        color: '#059669', // Emerald
      },
      {
        name: 'Saldo Pendiente',
        value: currentTotalPorCobrar,
        color: '#D97706', // Amber
      },
    ];
  }, [currentTotalCobrado, currentTotalPorCobrar]);

  // -------------------------------------------------------------
  // EXECUTIVE SUMMARY DATA OBJECT PREPARATION
  // -------------------------------------------------------------
  const executiveSummaryData: ExecutiveSummaryData = useMemo(() => {
    return {
      periodType: periodMode === 'semanal' ? 'semana' : 'mes',
      periodLabel: periodDates.currentLabel,
      previousPeriodLabel: periodDates.previousLabel,
      generatedAt: new Date().toLocaleString('es-BO', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
      current: {
        totalVentas: currentTotalVentas,
        ordersCount: currentOrdersCount,
        ticketPromedio: currentTicketPromedio,
        totalCobrado: currentTotalCobrado,
        totalPorCobrar: currentTotalPorCobrar,
        porcentajeCobrado: currentPorcentajeCobrado,
        totalUnits: currentTotalUnits,
      },
      previous: {
        totalVentas: previousTotalVentas,
        ordersCount: previousOrdersCount,
        ticketPromedio: previousTicketPromedio,
        totalCobrado: previousTotalCobrado,
        totalPorCobrar: previousTotalPorCobrar,
        totalUnits: previousTotalUnits,
      },
      growth: {
        ventasPercent: growthVentasPercent,
        ordersPercent: growthOrdersPercent,
        ticketPercent: growthTicketPercent,
        cobradoPercent: growthCobradoPercent,
      },
      topProducts: topProducts.slice(0, 10).map((p) => ({
        name: p.name,
        cantidad: p.cantidad,
        totalBs: p.totalBs,
        sharePercent: p.sharePercent,
      })),
      topSellers: sellersRanking.map((s) => ({
        name: s.name,
        count: s.count,
        total: s.total,
        ticketPromedio: s.ticketPromedio,
        cobrado: s.cobrado,
        porCobrar: s.porCobrar,
        sharePercent: s.sharePercent,
      })),
    };
  }, [
    periodMode,
    periodDates,
    currentTotalVentas,
    currentOrdersCount,
    currentTicketPromedio,
    currentTotalCobrado,
    currentTotalPorCobrar,
    currentPorcentajeCobrado,
    currentTotalUnits,
    previousTotalVentas,
    previousOrdersCount,
    previousTicketPromedio,
    previousTotalCobrado,
    previousTotalPorCobrar,
    previousTotalUnits,
    growthVentasPercent,
    growthOrdersPercent,
    growthTicketPercent,
    growthCobradoPercent,
    topProducts,
    sellersRanking,
  ]);

  // Export CSV of this comparative view
  const handleExportComparativeCSV = () => {
    const lines: string[] = [];
    lines.push(`REPORTE COMPARATIVO DE VENTAS - IMPORTADORA CHIQUIMINISOS`);
    lines.push(`Modo: ${periodMode === 'semanal' ? 'Semanal' : 'Mensual'}`);
    lines.push(`Período Actual: ${periodDates.currentLabel}`);
    lines.push(`Período Anterior: ${periodDates.previousLabel}`);
    lines.push('');

    lines.push('--- COMPARATIVA PRINCIPAL ---');
    lines.push('Métrica,Período Actual,Período Anterior,Diferencia Bs.,Crecimiento %');
    lines.push(
      `Total Ventas (Bs.),${currentTotalVentas.toFixed(2)},${previousTotalVentas.toFixed(2)},${(
        currentTotalVentas - previousTotalVentas
      ).toFixed(2)},${growthVentasPercent !== null ? growthVentasPercent.toFixed(1) + '%' : 'N/A'}`
    );
    lines.push(
      `Pedidos Concretados,${currentOrdersCount},${previousOrdersCount},${
        currentOrdersCount - previousOrdersCount
      },${growthOrdersPercent !== null ? growthOrdersPercent.toFixed(1) + '%' : 'N/A'}`
    );
    lines.push(
      `Ticket Promedio (Bs.),${currentTicketPromedio.toFixed(2)},${previousTicketPromedio.toFixed(
        2
      )},${(currentTicketPromedio - previousTicketPromedio).toFixed(2)},${
        growthTicketPercent !== null ? growthTicketPercent.toFixed(1) + '%' : 'N/A'
      }`
    );
    lines.push(
      `Cobrado en Caja (Bs.),${currentTotalCobrado.toFixed(2)},${previousTotalCobrado.toFixed(2)},${(
        currentTotalCobrado - previousTotalCobrado
      ).toFixed(2)},${growthCobradoPercent !== null ? growthCobradoPercent.toFixed(1) + '%' : 'N/A'}`
    );
    lines.push(
      `Saldo por Cobrar (Bs.),${currentTotalPorCobrar.toFixed(2)},${previousTotalPorCobrar.toFixed(
        2
      )},${(currentTotalPorCobrar - previousTotalPorCobrar).toFixed(2)},-`
    );
    lines.push('');

    lines.push('--- TOP PRODUCTOS VENDIDOS ---');
    lines.push('Posición,Artículo,Cant Actual (u),Cant Anterior (u),Variación Cant,Total Facturado (Bs.),Precio Prom (Bs.),% Participación');
    topProducts.forEach((p, idx) => {
      lines.push(
        `#${idx + 1},"${p.name.replace(/"/g, '""')}",${p.cantidad},${p.prevQty},${p.qtyDiff},${p.totalBs.toFixed(2)},${p.avgPrice.toFixed(2)},${p.sharePercent.toFixed(1)}%`
      );
    });
    lines.push('');

    lines.push('--- DESEMPEÑO POR VENDEDORA ---');
    lines.push('Posición,Vendedora,Pedidos,Total Vendido (Bs.),Ticket Promedio (Bs.),Cobrado (Bs.),Saldo Pendiente (Bs.),% Participación,Crecimiento %');
    sellersRanking.forEach((s, idx) => {
      lines.push(
        `#${idx + 1},"${s.name.replace(/"/g, '""')}",${s.count},${s.total.toFixed(2)},${s.ticketPromedio.toFixed(2)},${s.cobrado.toFixed(2)},${s.porCobrar.toFixed(2)},${s.sharePercent.toFixed(1)}%,${s.growthPercent !== null ? s.growthPercent.toFixed(1) + '%' : 'N/A'}`
      );
    });

    const csvContent = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Comparativo_${periodMode}_${toLocalDateKey(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderGrowthBadge = (percent: number | null, size: 'sm' | 'md' = 'sm') => {
    if (percent === null) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
          <Minus className="w-3 h-3" /> N/A
        </span>
      );
    }

    const isPositive = percent > 0;
    const isZero = Math.abs(percent) < 0.01;

    if (isZero) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
          <Minus className="w-3 h-3" /> 0.0%
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 font-black rounded-full ${
          size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[11px] px-2 py-0.5'
        } ${
          isPositive
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
            : 'bg-rose-50 text-rose-700 border border-rose-300'
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        )}
        <span>{isPositive ? '+' : ''}{percent.toFixed(1)}%</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROLS BAR: MODE SWITCHER, PERIOD NAVIGATION, ACTIONS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-[#E8DFC8] rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-[#E8DFC8]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1A2B5C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                <ArrowUpDown className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-base sm:text-lg font-black font-['Outfit',sans-serif] text-[#1A2B5C]">
                Análisis Comparativo {periodMode === 'semanal' ? 'Semanal' : 'Mensual'}
              </h2>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              Comparación homóloga entre ciclos continuos con métricas de crecimiento
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Executive Summary Button (Primary Action) */}
            <button
              type="button"
              onClick={() => setIsExecutiveModalOpen(true)}
              className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm active:scale-95 shadow-md flex items-center justify-center gap-2 transition cursor-pointer bg-[#1A2B5C] hover:bg-[#15234A] text-white"
              title="Generar informe ejecutivo imprimible o exportable"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Resumen Ejecutivo</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportComparativeCSV}
              className="py-2.5 px-3.5 rounded-xl font-bold text-xs active:scale-95 shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer bg-white hover:bg-[#F5EFE0] border border-[#E8DFC8] text-[#1A2B5C]"
              title="Descargar datos comparativos en CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {/* Financial Privacy Toggle */}
            <BalanceToggleBtn size="sm" />
          </div>
        </div>

        {/* Filters and Navigation Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Period Mode Selector (Semanal vs Mensual) */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#FBF7EF] border border-[#E8DFC8]">
            <button
              type="button"
              onClick={() => {
                setPeriodMode('semanal');
                setCycleOffset(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                periodMode === 'semanal'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Semana vs. Semana</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPeriodMode('mensual');
                setCycleOffset(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                periodMode === 'mensual'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mes vs. Mes</span>
            </button>
          </div>

          {/* Stepper Navigation: Previous / Next Cycle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCycleOffset((prev) => prev - 1)}
              className="p-2 rounded-xl border border-[#E8DFC8] bg-white hover:bg-[#FBF7EF] text-[#1A2B5C] transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Ir al ciclo anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <div className="px-3.5 py-1.5 rounded-xl bg-[#FBF7EF] border border-[#E8DFC8] text-center min-w-[200px]">
              <span className="text-xs font-black text-[#1A2B5C] block">
                {periodDates.currentLabel}
              </span>
              <span className="text-[10px] text-[#78716C] block">
                Vs. {periodDates.previousLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCycleOffset((prev) => Math.min(0, prev + 1))}
              disabled={cycleOffset === 0}
              className={`p-2 rounded-xl border border-[#E8DFC8] transition flex items-center gap-1 text-xs font-bold ${
                cycleOffset === 0
                  ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-400'
                  : 'bg-white hover:bg-[#FBF7EF] text-[#1A2B5C] cursor-pointer'
              }`}
              title="Ir al ciclo siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {cycleOffset !== 0 && (
              <button
                type="button"
                onClick={() => setCycleOffset(0)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer flex items-center gap-1"
                title="Volver al período actual"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Hoy</span>
              </button>
            )}
          </div>

          {/* Seller Filter */}
          {allSellers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#78716C]">Vendedora:</span>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="text-xs font-bold border rounded-xl px-3 py-1.5 focus:outline-none transition bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]"
              >
                <option value="all">Todo el equipo</option>
                {allSellers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. COMPARATIVE KPI CARDS WITH % GROWTH BADGES */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Facturado */}
        <div
          onClick={toggleShowBalances}
          className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8] cursor-pointer select-none hover:border-[#1A2B5C]/40 transition group"
          title="Haz clic para alternar privacidad de saldos"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
              Total Ventas (Bs.)
            </span>
            {renderGrowthBadge(growthVentasPercent)}
          </div>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] block text-[#1A2B5C]">
            {formatBalance(currentTotalVentas)}
          </span>
          <div className="flex items-center justify-between text-[11px] text-[#78716C] mt-1 pt-1 border-t border-[#E8DFC8]/60">
            <span>Ant: {formatBalance(previousTotalVentas)}</span>
            <span className={`font-bold font-mono ${diffVentasBs >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {diffVentasBs >= 0 ? '+' : ''}{diffVentasBs.toFixed(0)} Bs.
            </span>
          </div>
        </div>

        {/* Metric 2: Cantidad de Pedidos */}
        <div className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8] select-none hover:border-[#1A2B5C]/40 transition">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
              Pedidos Concretados
            </span>
            {renderGrowthBadge(growthOrdersPercent)}
          </div>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] block text-[#1A2B5C]">
            {currentOrdersCount}
          </span>
          <div className="flex items-center justify-between text-[11px] text-[#78716C] mt-1 pt-1 border-t border-[#E8DFC8]/60">
            <span>Ant: {previousOrdersCount} peds</span>
            <span className="font-bold text-[#1A2B5C]">
              {currentOrdersCount - previousOrdersCount >= 0 ? '+' : ''}
              {currentOrdersCount - previousOrdersCount} pedidos
            </span>
          </div>
        </div>

        {/* Metric 3: Ticket Promedio */}
        <div
          onClick={toggleShowBalances}
          className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8] cursor-pointer select-none hover:border-[#1A2B5C]/40 transition"
          title="Haz clic para alternar privacidad de saldos"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A2B5C]">
              Ticket Promedio
            </span>
            {renderGrowthBadge(growthTicketPercent)}
          </div>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] block text-[#1A2B5C]">
            {formatBalance(currentTicketPromedio)}
          </span>
          <div className="flex items-center justify-between text-[11px] text-[#78716C] mt-1 pt-1 border-t border-[#E8DFC8]/60">
            <span>Ant: {formatBalance(previousTicketPromedio)}</span>
            <span className="text-[#78716C]/80">por cliente</span>
          </div>
        </div>

        {/* Metric 4: Cobrado en Caja vs Saldo */}
        <div
          onClick={toggleShowBalances}
          className="border rounded-2xl p-4 shadow-sm bg-white border-emerald-200 cursor-pointer select-none hover:border-emerald-400 transition"
          title="Haz clic para alternar privacidad de saldos"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Cobrado en Caja
            </span>
            <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {currentPorcentajeCobrado.toFixed(1)}% Cobrado
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 font-['Outfit',sans-serif] block">
            {formatBalance(currentTotalCobrado)}
          </span>
          <div className="flex items-center justify-between text-[11px] text-amber-700 mt-1 pt-1 border-t border-emerald-100 font-bold">
            <span>Saldo: {formatBalance(currentTotalPorCobrar)}</span>
            <span className="text-emerald-700">QR / Ef.</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHARTS SECTION: TIMELINE COMPARISON + DONUT COBRADO/SALDO */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Timeline Comparison (Current vs Previous) */}
        <div className="lg:col-span-7 bg-white border border-[#E8DFC8] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-[#E8DFC8]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1A2B5C]" />
              <h3 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                Comparativa de Ventas: {periodMode === 'semanal' ? 'Día por Día' : 'Por Semanas del Mes'}
              </h3>
            </div>

            {/* Toggle Bar vs Line */}
            <div className="flex items-center gap-1 bg-[#FBF7EF] p-1 rounded-xl border border-[#E8DFC8]">
              <button
                type="button"
                onClick={() => setTimelineChartType('bar')}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  timelineChartType === 'bar'
                    ? 'bg-[#1A2B5C] text-white shadow-xs font-bold'
                    : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
                title="Ver como gráfico de barras"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTimelineChartType('line')}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  timelineChartType === 'line'
                    ? 'bg-[#1A2B5C] text-white shadow-xs font-bold'
                    : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
                title="Ver como gráfico de líneas"
              >
                <LineChartIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {timelineChartType === 'bar' ? (
                <BarChart data={timelineComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DFC8" vertical={false} opacity={0.6} />
                  <XAxis dataKey="name" stroke="#78716C" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#78716C"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const curVal = (payload[0]?.value as number) || 0;
                        const prevVal = (payload[1]?.value as number) || 0;
                        const diff = curVal - prevVal;
                        return (
                          <div className="bg-[#1A2B5C] text-white p-3 rounded-xl shadow-xl border border-white/20 text-xs space-y-1.5 min-w-[190px]">
                            <p className="font-bold text-amber-300 border-b border-white/20 pb-1">
                              {label}
                            </p>
                            <div className="flex justify-between items-center text-white">
                              <span>Período Actual:</span>
                              <strong className="font-mono text-emerald-300">{formatBalance(curVal)}</strong>
                            </div>
                            <div className="flex justify-between items-center text-white/80">
                              <span>Período Anterior:</span>
                              <span className="font-mono">{formatBalance(prevVal)}</span>
                            </div>
                            <div className="pt-1 border-t border-white/10 flex justify-between items-center text-[10px]">
                              <span>Diferencia:</span>
                              <strong className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {diff >= 0 ? '+' : ''}{formatBalance(diff)}
                              </strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs font-bold text-[#1A2B5C]">
                        {value === 'currentVentas'
                          ? `Ciclo Actual (${periodDates.currentLabel.split('(')[0]})`
                          : `Ciclo Anterior (${periodDates.previousLabel})`}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="currentVentas"
                    name="currentVentas"
                    fill="#1A2B5C"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="previousVentas"
                    name="previousVentas"
                    fill="#D97706"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    opacity={0.8}
                  />
                </BarChart>
              ) : (
                <LineChart data={timelineComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DFC8" vertical={false} opacity={0.6} />
                  <XAxis dataKey="name" stroke="#78716C" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#78716C"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const curVal = (payload[0]?.value as number) || 0;
                        const prevVal = (payload[1]?.value as number) || 0;
                        return (
                          <div className="bg-[#1A2B5C] text-white p-3 rounded-xl shadow-xl border border-white/20 text-xs space-y-1">
                            <p className="font-bold text-amber-300">{label}</p>
                            <p className="text-emerald-300">Actual: {formatBalance(curVal)}</p>
                            <p className="text-white/80">Anterior: {formatBalance(prevVal)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs font-bold text-[#1A2B5C]">
                        {value === 'currentVentas' ? 'Ciclo Actual' : 'Ciclo Anterior'}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="currentVentas"
                    stroke="#1A2B5C"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#1A2B5C' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="previousVentas"
                    stroke="#D97706"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#D97706' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Donut / Bar Cobrado vs Saldo Pendiente */}
        <div className="lg:col-span-5 bg-white border border-[#E8DFC8] rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                  Cobrado vs. Saldo Pendiente
                </h3>
              </div>

              <div className="flex items-center gap-1 bg-[#FBF7EF] p-1 rounded-xl border border-[#E8DFC8]">
                <button
                  type="button"
                  onClick={() => setBreakdownChartType('donut')}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    breakdownChartType === 'donut'
                      ? 'bg-[#1A2B5C] text-white shadow-xs font-bold'
                      : 'text-[#78716C] hover:text-[#1A2B5C]'
                  }`}
                  title="Gráfico de dona"
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownChartType('bar')}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    breakdownChartType === 'bar'
                      ? 'bg-[#1A2B5C] text-white shadow-xs font-bold'
                      : 'text-[#78716C] hover:text-[#1A2B5C]'
                  }`}
                  title="Gráfico de barra acumulada"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Donut Visualization */}
            {breakdownChartType === 'donut' ? (
              <div className="h-52 sm:h-56 relative flex items-center justify-center my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={collectionsDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {collectionsDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatBalance(Number(val) || 0), 'Monto']}
                      contentStyle={{
                        backgroundColor: '#1A2B5C',
                        color: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-emerald-700">
                    {currentPorcentajeCobrado.toFixed(0)}%
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#78716C]">
                    Cobrado
                  </span>
                </div>
              </div>
            ) : (
              /* Stacked Bar Alternative */
              <div className="space-y-4 my-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-emerald-700">Cobrado: {currentPorcentajeCobrado.toFixed(1)}%</span>
                    <span className="text-amber-700">
                      Pendiente: {(100 - currentPorcentajeCobrado).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-5 w-full bg-amber-100 rounded-xl overflow-hidden flex shadow-inner">
                    <div
                      className="h-full bg-emerald-600 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, currentPorcentajeCobrado))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#FBF7EF] rounded-xl border border-[#E8DFC8] space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#78716C]">Total Facturado:</span>
                    <strong className="text-[#1A2B5C] font-mono">{formatBalance(currentTotalVentas)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700">Cobrado Real:</span>
                    <strong className="text-emerald-700 font-mono">{formatBalance(currentTotalCobrado)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-700">Cuentas por Cobrar:</span>
                    <strong className="text-amber-700 font-mono">{formatBalance(currentTotalPorCobrar)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Collection Status Indicators */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E8DFC8]">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                Cobrado en Caja
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono block mt-0.5">
                {formatBalance(currentTotalCobrado)}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {currentPorcentajeCobrado.toFixed(1)}% recaudado
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">
                Saldo por Cobrar
              </span>
              <span className="text-sm sm:text-base font-black text-amber-800 font-mono block mt-0.5">
                {formatBalance(currentTotalPorCobrar)}
              </span>
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                {(100 - currentPorcentajeCobrado).toFixed(1)}% pendiente
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. RANKINGS SECTION: VENDEDORAS (SELLER) & TOP PRODUCTS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RANKING DE VENDEDORAS */}
        <div className="lg:col-span-6 bg-white border border-[#E8DFC8] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                  Ranking de Vendedoras del Período
                </h3>
                <p className="text-xs text-[#78716C]">
                  Total vendido, cantidad de pedidos y ticket promedio
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-[#1A2B5C] bg-[#FBF7EF] border border-[#E8DFC8] px-2.5 py-1 rounded-xl">
              {sellersRanking.length} vendedoras
            </span>
          </div>

          <div className="space-y-3">
            {sellersRanking.length === 0 ? (
              <p className="text-xs py-8 text-center text-[#78716C]">
                Sin ventas registradas en este período.
              </p>
            ) : (
              sellersRanking.map((seller, idx) => (
                <div
                  key={seller.name}
                  className="p-3.5 rounded-2xl border border-[#E8DFC8] bg-[#FBF7EF] hover:bg-[#F5EFE0] transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center bg-[#1A2B5C] text-white shrink-0 shadow-xs">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#1A2B5C] truncate">
                          {seller.name}
                        </h4>
                        <p className="text-[11px] text-[#78716C] flex items-center gap-2">
                          <span>{seller.count} pedidos</span>
                          <span>•</span>
                          <span>Ticket Prom: <strong>{formatBalance(seller.ticketPromedio)}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono block text-[#1A2B5C]">
                        {formatBalance(seller.total)}
                      </span>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {renderGrowthBadge(seller.growthPercent)}
                      </div>
                    </div>
                  </div>

                  {/* Progress and Cobrado Details */}
                  <div className="pt-2 border-t border-[#E8DFC8]/60 flex items-center justify-between text-[11px] text-[#78716C]">
                    <span className="text-emerald-700 font-bold">
                      Cobrado: {formatBalance(seller.cobrado)}
                    </span>
                    <span className="text-amber-700">
                      Saldo pend: {formatBalance(seller.porCobrar)}
                    </span>
                    <span className="font-semibold text-stone-500">
                      {seller.sharePercent.toFixed(1)}% del total
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RANKING DE PRODUCTOS MÁS VENDIDOS */}
        <div className="lg:col-span-6 bg-white border border-[#E8DFC8] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-[#E8DFC8]">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#1A2B5C]" />
              <div>
                <h3 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                  Top Productos del Período
                </h3>
                <p className="text-xs text-[#78716C]">
                  Cantidad despachada y facturación acumulada
                </p>
              </div>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 bg-[#FBF7EF] p-1 rounded-xl border border-[#E8DFC8]">
              <button
                type="button"
                onClick={() => setProductSortBy('totalBs')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-bold ${
                  productSortBy === 'totalBs'
                    ? 'bg-[#1A2B5C] text-white shadow-xs'
                    : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                Por Monto (Bs.)
              </button>
              <button
                type="button"
                onClick={() => setProductSortBy('cantidad')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-bold ${
                  productSortBy === 'cantidad'
                    ? 'bg-[#1A2B5C] text-white shadow-xs'
                    : 'text-[#78716C] hover:text-[#1A2B5C]'
                }`}
              >
                Por Unidades
              </button>
            </div>
          </div>

          {/* Product Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar artículo en el ranking..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[#FBF7EF] border border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:outline-none focus:border-[#1A2B5C] transition"
            />
          </div>

          {/* Product Items List */}
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredTopProducts.length === 0 ? (
              <p className="text-xs py-8 text-center text-[#78716C]">
                {productSearch ? 'No se encontraron artículos con ese nombre.' : 'Sin productos vendidos en este período.'}
              </p>
            ) : (
              filteredTopProducts.map((prod, idx) => {
                const currentVal = productSortBy === 'totalBs' ? prod.totalBs : prod.cantidad;
                const percentBar = maxProductVal > 0 ? (currentVal / maxProductVal) * 100 : 0;

                return (
                  <div
                    key={prod.name}
                    className="p-3 rounded-2xl border border-[#E8DFC8] bg-[#FBF7EF] hover:bg-[#F5EFE0] transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 bg-[#1A2B5C]/10 text-[#1A2B5C]">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#1A2B5C] truncate" title={prod.name}>
                            {prod.name}
                          </h4>
                          <span className="text-[11px] text-[#78716C]">
                            Precio prom: {formatCurrency(prod.avgPrice)}/u
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black font-mono text-[#1A2B5C] block">
                          {formatCurrency(prod.totalBs)}
                        </span>
                        <span className="text-[11px] font-black text-amber-700 block">
                          {prod.cantidad}u vendidas
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Comparative Delta */}
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 w-full bg-[#E8DFC8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1A2B5C] rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(5, percentBar))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#78716C]">
                        <span>
                          {prod.isNew ? (
                            <span className="text-emerald-700 font-bold">★ Nuevo en este ciclo</span>
                          ) : prod.qtyDiff > 0 ? (
                            <span className="text-emerald-700 font-bold">+{prod.qtyDiff}u vs anterior</span>
                          ) : prod.qtyDiff < 0 ? (
                            <span className="text-rose-700 font-bold">{prod.qtyDiff}u vs anterior</span>
                          ) : (
                            <span>Igual que anterior</span>
                          )}
                        </span>
                        <span className="font-semibold text-[#1A2B5C]">
                          {prod.sharePercent.toFixed(1)}% de las ventas
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. EXECUTIVE SUMMARY MODAL COMPONENT */}
      {/* ------------------------------------------------------------- */}
      <ExecutiveSummaryModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        data={executiveSummaryData}
      />
    </div>
  );
};
