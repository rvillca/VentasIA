import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Download,
  Users,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Eye,
  X,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  MessageCircle,
  MapPin,
  FileText,
} from 'lucide-react';
import { Order } from '../../types';
import { useFinancialPrivacy } from '../../contexts/FinancialPrivacyContext';
import { useTheme } from '../../contexts/ThemeContext';

interface SupervisorSalesReportProps {
  orders: Order[];
  onSelectOrder?: (orderId: string) => void;
}

type PeriodFilter = 'this_week' | 'this_month' | 'custom_range' | 'today' | 'all';
type ListViewMode = 'ventas_detalle' | 'usuarios' | 'productos';

export const SupervisorSalesReport: React.FC<SupervisorSalesReportProps> = ({
  orders,
  onSelectOrder,
}) => {
  const { isDark } = useTheme();
  const { formatBalance } = useFinancialPrivacy();

  // Period filters requested: Semana, Mes, Rango de fechas
  const [period, setPeriod] = useState<PeriodFilter>('this_week');

  // Custom date range inputs
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Quick filters
  const [viewMode, setViewMode] = useState<ListViewMode>('ventas_detalle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');

  // Modal order detail
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);

  // Available sellers list
  const availableSellers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const s = (o.vendedorNombre || '').trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [orders]);

  // Format date helper: JUST THE DATE, NO TIME (e.g. 06/09/2026)
  const formatDateOnly = (dateStr: string | number | Date | undefined) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // 1. Filter orders by Period
  const periodFilteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      if (o.estado === 'Anulado') return false; // Exclude canceled by default
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return false;

      if (period === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }

      if (period === 'this_week') {
        // Current week (Monday to Sunday)
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

      if (period === 'this_month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'custom_range') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date(0);
        const end = customEndDate ? new Date(`${customEndDate}T23:59:59.999`) : new Date(8640000000000000);
        return orderDate >= start && orderDate <= end;
      }

      return true; // 'all'
    });
  }, [orders, period, customStartDate, customEndDate]);

  // 2. Apply secondary quick filters (seller, status, payment status, search query)
  const fullyFilteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return periodFilteredOrders.filter((o) => {
      // Seller filter
      if (selectedSeller !== 'all') {
        const s = (o.vendedorNombre || '').trim();
        if (s !== selectedSeller) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'Entregado' && o.estado !== 'Entregado') return false;
        if (selectedStatus === 'Abierto' && o.estado === 'Entregado') return false;
      }

      // Payment filter
      if (selectedPaymentStatus !== 'all') {
        const saldo = o.saldo || 0;
        if (selectedPaymentStatus === 'con_saldo' && saldo <= 0) return false;
        if (selectedPaymentStatus === 'pagado' && saldo > 0) return false;
      }

      // Search query
      if (query) {
        const clientName = (o.cliente || (o as any).clienteNombre || '').toLowerCase();
        const orderNum = (o.orderNumber || (o as any).numeroPedido || o.id || '').toString().toLowerCase();
        const sellerName = (o.vendedorNombre || '').toLowerCase();
        const phone = (o.telefono || (o as any).clienteTelefono || '').toLowerCase();
        const productMatch = (o.productos || []).some((p) =>
          (p.nombre || '').toLowerCase().includes(query)
        );

        if (
          !clientName.includes(query) &&
          !orderNum.includes(query) &&
          !sellerName.includes(query) &&
          !phone.includes(query) &&
          !productMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [periodFilteredOrders, selectedSeller, selectedStatus, selectedPaymentStatus, searchQuery]);

  // Totals calculations for quick decision making (simple and clear numbers)
  const totals = useMemo(() => {
    let sales = 0;
    let paid = 0;
    let pending = 0;
    let units = 0;

    fullyFilteredOrders.forEach((o) => {
      sales += o.total || 0;
      paid += o.pagado || 0;
      pending += o.saldo || 0;
      (o.productos || []).forEach((p) => {
        units += p.cantidad || 1;
      });
    });

    return {
      count: fullyFilteredOrders.length,
      sales,
      paid,
      pending,
      units,
      avgTicket: fullyFilteredOrders.length > 0 ? sales / fullyFilteredOrders.length : 0,
    };
  }, [fullyFilteredOrders]);

  // Aggregated data by User / Seller (for supervisor decision making)
  const usersSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        sellerName: string;
        ordersCount: number;
        totalSales: number;
        totalPaid: number;
        totalPending: number;
        unitsSold: number;
      }
    >();

    fullyFilteredOrders.forEach((o) => {
      const seller = (o.vendedorNombre || 'Sin Asignar').trim();
      const existing = map.get(seller) || {
        sellerName: seller,
        ordersCount: 0,
        totalSales: 0,
        totalPaid: 0,
        totalPending: 0,
        unitsSold: 0,
      };

      existing.ordersCount += 1;
      existing.totalSales += o.total || 0;
      existing.totalPaid += o.pagado || 0;
      existing.totalPending += o.saldo || 0;
      (o.productos || []).forEach((p) => {
        existing.unitsSold += p.cantidad || 1;
      });

      map.set(seller, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [fullyFilteredOrders]);

  // Aggregated data by Product (for supervisor inventory/rotation decisions)
  const productsSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        nombre: string;
        unitsSold: number;
        totalRevenue: number;
        ordersCount: number;
        variants: Map<string, number>;
      }
    >();

    fullyFilteredOrders.forEach((o) => {
      const seen = new Set<string>();
      (o.productos || []).forEach((p) => {
        const name = (p.nombre || 'Artículo').trim();
        const existing = map.get(name) || {
          nombre: name,
          unitsSold: 0,
          totalRevenue: 0,
          ordersCount: 0,
          variants: new Map<string, number>(),
        };

        const qty = p.cantidad || 1;
        const lineTotal = (p.precioUnitario || 0) * qty;

        existing.unitsSold += qty;
        existing.totalRevenue += lineTotal;

        const variant = (p.variante || 'Estándar').trim();
        existing.variants.set(variant, (existing.variants.get(variant) || 0) + qty);

        if (!seen.has(name)) {
          existing.ordersCount += 1;
          seen.add(name);
        }

        map.set(name, existing);
      });
    });

    return Array.from(map.values())
      .map((p) => {
        let topVariant = 'Estándar';
        let maxQty = 0;
        p.variants.forEach((qty, vName) => {
          if (qty > maxQty) {
            maxQty = qty;
            topVariant = vName;
          }
        });

        return {
          nombre: p.nombre,
          unitsSold: p.unitsSold,
          totalRevenue: p.totalRevenue,
          ordersCount: p.ordersCount,
          topVariant,
          avgPrice: p.unitsSold > 0 ? p.totalRevenue / p.unitsSold : 0,
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue);
  }, [fullyFilteredOrders]);

  // Clean WhatsApp number formatting
  const getWhatsAppClean = (phone: string | undefined) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 8) return `591${digits}`;
    return digits;
  };

  // Small button CSV export handler
  const handleExportCSV = () => {
    if (fullyFilteredOrders.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (viewMode === 'ventas_detalle') {
      headers = [
        'Nro Pedido',
        'Fecha',
        'Cliente',
        'Celular',
        'Total (Bs)',
        'Cobrado (Bs)',
        'Saldo (Bs)',
        'Vendedor',
        'Estado',
      ];
      rows = fullyFilteredOrders.map((o) => {
        const orderNum = o.orderNumber || (o as any).numeroPedido || o.id.slice(0, 6);
        const clientName = o.cliente || (o as any).clienteNombre || 'Sin nombre';
        const clientPhone = o.telefono || (o as any).clienteTelefono || '';
        return [
          `#${orderNum}`,
          formatDateOnly(o.createdAt),
          clientName,
          clientPhone,
          (o.total || 0).toString(),
          (o.pagado || 0).toString(),
          (o.saldo || 0).toString(),
          o.vendedorNombre || 'Sin asignar',
          o.estado || 'Abierto',
        ];
      });
    } else if (viewMode === 'usuarios') {
      headers = [
        'Vendedor / Usuario',
        'Pedidos Realizados',
        'Total Facturado (Bs)',
        'Total Cobrado (Bs)',
        'Saldo Pendiente (Bs)',
        'Unidades Vendidas',
      ];
      rows = usersSummary.map((u) => [
        u.sellerName,
        u.ordersCount.toString(),
        u.totalSales.toString(),
        u.totalPaid.toString(),
        u.totalPending.toString(),
        u.unitsSold.toString(),
      ]);
    } else {
      headers = [
        'Producto',
        'Variante Principal',
        'Unidades Vendidas',
        'Total Recaudado (Bs)',
        'Cantidad de Pedidos',
        'Precio Promedio (Bs)',
      ];
      rows = productsSummary.map((p) => [
        p.nombre,
        p.topVariant,
        p.unitsSold.toString(),
        p.totalRevenue.toString(),
        p.ordersCount.toString(),
        p.avgPrice.toFixed(2),
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_supervisor_${viewMode}_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Card with Period Selector and Small CSV Button */}
      <div
        className={`border rounded-2xl p-4 transition-colors ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h2
                className={`text-lg font-black tracking-tight font-['Outfit',sans-serif] ${
                  isDark ? 'text-white' : 'text-[#1A2B5C]'
                }`}
              >
                Reporte de Ventas para Supervisión
              </h2>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Generación de reporte en pantalla para toma de decisiones y control rápido
            </p>
          </div>

          {/* Small button for CSV export requested by user: "solo un botón pequeño para descargar un csv" */}
          <button
            type="button"
            onClick={handleExportCSV}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto ${
              isDark
                ? 'bg-[#223368] hover:bg-[#2c407e] text-white border border-[#304484]'
                : 'bg-[#FBF7EF] hover:bg-[#FAF4E6] text-[#1A2B5C] border border-[#E8DFC8]'
            }`}
            title="Descargar archivo CSV pequeño"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Descargar CSV</span>
          </button>
        </div>

        {/* Period Selector Tabs: Semana, Mes, Rango de fechas */}
        <div className="mt-3.5 pt-3 border-t border-inherit flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            <span
              className={`text-xs font-bold uppercase tracking-wider mr-1 shrink-0 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}
            >
              Período:
            </span>

            <button
              type="button"
              onClick={() => setPeriod('this_week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                period === 'this_week'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
              }`}
            >
              ⚡ Esta Semana
            </button>

            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                period === 'this_month'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
              }`}
            >
              📅 Este Mes
            </button>

            <button
              type="button"
              onClick={() => setPeriod('custom_range')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                period === 'custom_range'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
              }`}
            >
              🗓️ Por Rango de Fechas
            </button>

            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                period === 'today'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
              }`}
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                period === 'all'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
              }`}
            >
              Todo
            </button>
          </div>

          {/* Date range inputs if custom_range selected */}
          {period === 'custom_range' && (
            <div
              className={`flex items-center gap-2 p-1.5 rounded-xl border w-full sm:w-auto animate-in fade-in ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-[11px] opacity-75">Desde:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`rounded-lg px-2 py-1 text-xs border focus:outline-none ${
                    isDark
                      ? 'bg-[#16234F] border-[#304484] text-white'
                      : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-[11px] opacity-75">Hasta:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`rounded-lg px-2 py-1 text-xs border focus:outline-none ${
                    isDark
                      ? 'bg-[#16234F] border-[#304484] text-white'
                      : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Decision Metrics (Direct, clear, without confusing charts) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="border rounded-2xl p-3 text-center bg-white border-[#E8DFC8] shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
            Total Pedidos
          </div>
          <div className="text-2xl font-black mt-0.5 text-[#1A2B5C]">
            {totals.count} <span className="text-xs font-semibold text-stone-500">ventas</span>
          </div>
        </div>

        <div className="border rounded-2xl p-3 text-center bg-white border-[#E8DFC8] shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
            Total Facturado
          </div>
          <div className="text-2xl font-black mt-0.5 text-blue-700">
            {formatBalance(totals.sales)}
          </div>
        </div>

        <div className="border rounded-2xl p-3 text-center bg-white border-[#E8DFC8] shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
            Total Cobrado
          </div>
          <div className="text-2xl font-black mt-0.5 text-emerald-700">
            {formatBalance(totals.paid)}
          </div>
        </div>

        <div className="border rounded-2xl p-3 text-center bg-white border-[#E8DFC8] shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
            Saldo Pendiente
          </div>
          <div
            className={`text-2xl font-black mt-0.5 ${
              totals.pending > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {formatBalance(totals.pending)}
          </div>
        </div>

        <div className="border rounded-2xl p-3 text-center col-span-2 sm:col-span-1 bg-white border-[#E8DFC8] shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
            Artículos Vendidos
          </div>
          <div className="text-2xl font-black mt-0.5 text-purple-700">
            {totals.units} <span className="text-xs font-semibold text-stone-500">unidades</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Filter Bar & View Selector */}
      <div className="border rounded-2xl p-3.5 space-y-3 bg-white border-[#E8DFC8] shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Sub-view switcher: Listado de Ventas, Por Vendedor, Por Producto */}
          <div className="flex items-center p-1 rounded-xl border w-full md:w-auto bg-[#FBF7EF] border-[#E8DFC8]">
            <button
              type="button"
              onClick={() => setViewMode('ventas_detalle')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'ventas_detalle'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Listado de Ventas</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('usuarios')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'usuarios'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Por Vendedor ({usersSummary.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('productos')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'productos'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Por Producto ({productsSummary.length})</span>
            </button>
          </div>

          {/* Fast Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por N° pedido, cliente, celular, vendedor..."
              className="w-full rounded-xl pl-9 pr-8 py-2 text-xs border focus:outline-none transition bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-stone-400 focus:border-[#1A2B5C] font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E8DFC8]">
          {/* Seller Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-extrabold text-stone-600">Vendedor:</span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="rounded-xl px-2.5 py-1.5 text-xs border font-semibold focus:outline-none cursor-pointer bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]"
            >
              <option value="all">Todos los vendedores</option>
              {availableSellers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-extrabold text-stone-600">Estado:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl px-2.5 py-1.5 text-xs border font-semibold focus:outline-none cursor-pointer bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]"
            >
              <option value="all">Todos los estados</option>
              <option value="Entregado">Entregados</option>
              <option value="Abierto">Abiertos / En ruta</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-extrabold text-stone-600">Cobranza:</span>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="rounded-xl px-2.5 py-1.5 text-xs border font-semibold focus:outline-none cursor-pointer bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]"
            >
              <option value="all">Todos los saldos</option>
              <option value="con_saldo">Con saldo pendiente</option>
              <option value="pagado">100% Pagados</option>
            </select>
          </div>

          {(selectedSeller !== 'all' ||
            selectedStatus !== 'all' ||
            selectedPaymentStatus !== 'all' ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedSeller('all');
                setSelectedStatus('all');
                setSelectedPaymentStatus('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-black text-rose-600 hover:underline ml-auto cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN LIST VIEW: EXACT USER SPECIFICATION
          Columns: 1. N° Pedido | 2. Solo Fecha | 3. Nombre del cliente | 4. Número de celular | 5. Total | 6. Cobrado | 7. Nombre del vendedor | 8. Botón Detalles
      */}
      {viewMode === 'ventas_detalle' && (
        <div className="border rounded-2xl overflow-hidden shadow-xs bg-white border-[#E8DFC8]">
          <div className="px-4 py-3 border-b border-[#E8DFC8] flex items-center justify-between bg-[#FAF8F5]">
            <span className="text-xs font-black text-[#1A2B5C] flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              Listado de Ventas ({fullyFilteredOrders.length} pedidos encontrados)
            </span>
            <span className="text-[11px] text-stone-600 font-medium">
              Revisa el detalle completo de productos en el botón <strong className="text-blue-700 font-bold">Detalles</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b font-black uppercase text-[11px] tracking-wider bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]">
                  {/* Exact requested column structure: */}
                  <th className="py-3 px-3 whitespace-nowrap">N° Pedido</th>
                  <th className="py-3 px-3 whitespace-nowrap">Fecha</th>
                  <th className="py-3 px-3">Nombre del Cliente</th>
                  <th className="py-3 px-3 whitespace-nowrap">N° Celular</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Total</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Cobrado</th>
                  <th className="py-3 px-3">Vendedor</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFC8]">
                {fullyFilteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-stone-500 font-semibold">
                      No se encontraron pedidos en el período y filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  fullyFilteredOrders.map((o) => {
                    const orderNum = o.orderNumber || (o as any).numeroPedido || o.id.slice(0, 6);
                    const rawClient = o.cliente || (o as any).clienteNombre || (o as any).client || '';
                    const clientName = rawClient.trim() || 'Cliente Mostrador / TikTok';
                    const clientPhone = o.telefono || (o as any).clienteTelefono || '';
                    const dateOnlyStr = formatDateOnly(o.createdAt);
                    const sellerName = o.vendedorNombre || 'Sin asignar';
                    const hasPending = (o.saldo || 0) > 0;
                    const waClean = getWhatsAppClean(clientPhone);

                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-[#FBF7EF] transition-colors"
                      >
                        {/* 1. Número de pedido */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-black text-xs text-[#1A2B5C] bg-[#1A2B5C]/10 px-2 py-1 rounded-md">
                            #{orderNum}
                          </span>
                        </td>

                        {/* 2. Solo fecha (sin hora) */}
                        <td className="py-3 px-3 font-semibold text-stone-700 whitespace-nowrap">
                          {dateOnlyStr}
                        </td>

                        {/* 3. Nombre del cliente - Alta legibilidad */}
                        <td className="py-3 px-3">
                          <span
                            className="font-black text-sm text-[#1A2B5C] block truncate max-w-[200px]"
                            title={clientName}
                          >
                            {clientName}
                          </span>
                        </td>

                        {/* 4. Número de celular */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {clientPhone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-stone-500" />
                              <span className="font-mono font-bold text-stone-800">{clientPhone}</span>
                              {waClean && (
                                <a
                                  href={`https://wa.me/${waClean}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:text-emerald-800 p-0.5 transition"
                                  title="Contactar por WhatsApp"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-400 font-semibold text-xs">-</span>
                          )}
                        </td>

                        {/* 5. Total */}
                        <td className="py-3 px-3 text-right font-black text-sm text-[#1A2B5C] whitespace-nowrap">
                          {formatBalance(o.total || 0)}
                        </td>

                        {/* 6. Cobrado (con indicación si existe saldo pendiente) */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="font-black text-sm text-emerald-700">
                            {formatBalance(o.pagado || 0)}
                          </div>
                          {hasPending && (
                            <div className="text-[11px] text-amber-700 font-black mt-0.5" title="Saldo por cobrar">
                              Saldo: {formatBalance(o.saldo || 0)}
                            </div>
                          )}
                        </td>

                        {/* 7. Nombre del vendedor (al final) */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            <span className="font-bold text-xs text-stone-800 truncate max-w-[140px]" title={sellerName}>
                              {sellerName}
                            </span>
                          </div>
                        </td>

                        {/* 8. Botón Detalles para mostrar la venta completa con los productos */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectOrder(o)}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#1A2B5C] text-white hover:bg-[#253B7A] transition shadow-xs flex items-center gap-1.5 mx-auto cursor-pointer"
                            title="Ver venta completa con productos"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-300" />
                            <span>Detalles</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW B: RESUMEN POR VENDEDOR / USUARIO (Para toma de decisiones de supervisión) */}
      {viewMode === 'usuarios' && (
        <div className="border rounded-2xl overflow-hidden shadow-xs bg-white border-[#E8DFC8]">
          <div className="px-4 py-3 border-b border-[#E8DFC8] flex items-center justify-between bg-[#FAF8F5]">
            <span className="text-xs font-black text-[#1A2B5C] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              Rendimiento por Vendedor ({usersSummary.length} activos en el período)
            </span>
            <span className="text-[11px] text-stone-600 font-semibold">
              Ordenado por volumen facturado
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b font-black uppercase text-[11px] tracking-wider bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Vendedor / Usuario</th>
                  <th className="py-3 px-4 text-center">N° Pedidos</th>
                  <th className="py-3 px-4 text-center">Unidades</th>
                  <th className="py-3 px-4 text-right">Total Facturado</th>
                  <th className="py-3 px-4 text-right">Total Cobrado</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-right">Ticket Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFC8]">
                {usersSummary.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-stone-500 font-semibold">
                      No hay registros de vendedores en este período.
                    </td>
                  </tr>
                ) : (
                  usersSummary.map((u, idx) => {
                    const avgTicket = u.ordersCount > 0 ? u.totalSales / u.ordersCount : 0;
                    return (
                      <tr
                        key={u.sellerName}
                        className="hover:bg-[#FBF7EF] transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-stone-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-black text-[#1A2B5C]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-[11px]">
                              {u.sellerName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-black text-[#1A2B5C]">{u.sellerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-black text-stone-800">{u.ordersCount}</td>
                        <td className="py-3 px-4 text-center font-bold text-stone-700">
                          {u.unitsSold} uds.
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#1A2B5C] text-sm">
                          {formatBalance(u.totalSales)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-700">
                          {formatBalance(u.totalPaid)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-700">
                          {formatBalance(u.totalPending)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-stone-700">
                          {formatBalance(avgTicket)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW C: RESUMEN POR PRODUCTO (Para decisiones de reposición y stock) */}
      {viewMode === 'productos' && (
        <div className="border rounded-2xl overflow-hidden shadow-xs bg-white border-[#E8DFC8]">
          <div className="px-4 py-3 border-b border-[#E8DFC8] flex items-center justify-between bg-[#FAF8F5]">
            <span className="text-xs font-black text-[#1A2B5C] flex items-center gap-1.5">
              <Package className="w-4 h-4 text-purple-600" />
              Rotación de Productos ({productsSummary.length} artículos vendidos)
            </span>
            <span className="text-[11px] text-stone-600 font-semibold">
              Ordenado por unidades vendidas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b font-black uppercase text-[11px] tracking-wider bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Variante Principal</th>
                  <th className="py-3 px-4 text-center">Unidades</th>
                  <th className="py-3 px-4 text-center">En N° Pedidos</th>
                  <th className="py-3 px-4 text-right">Total Facturado</th>
                  <th className="py-3 px-4 text-right">Precio Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFC8]">
                {productsSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-stone-500 font-semibold">
                      No hay productos vendidos en este período.
                    </td>
                  </tr>
                ) : (
                  productsSummary.map((p, idx) => (
                    <tr
                      key={p.nombre}
                      className="hover:bg-[#FBF7EF] transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-stone-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-black text-[#1A2B5C]">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-lg bg-purple-100 text-purple-700">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-black text-[#1A2B5C]">{p.nombre}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-700 font-semibold">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-[11px] font-bold text-stone-800">
                          {p.topVariant}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-purple-700 text-sm">
                        {p.unitsSold} uds.
                      </td>
                      <td className="py-3 px-4 text-center font-black text-stone-800">
                        {p.ordersCount}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#1A2B5C] text-sm">
                        {formatBalance(p.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-stone-700">
                        {formatBalance(p.avgPrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL DE DETALLE COMPLETO DE LA VENTA (MUESTRA VENTA COMPLETA CON PRODUCTOS) */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto bg-white border-[#E8DFC8] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 border-[#E8DFC8]">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      inspectOrder.estado === 'Entregado'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {inspectOrder.estado || 'Abierto'}
                  </span>
                  <span className="text-xs font-semibold text-stone-500">
                    Fecha: {formatDateOnly(inspectOrder.createdAt)}
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#1A2B5C] mt-1 font-['Outfit',sans-serif]">
                  Pedido #{inspectOrder.orderNumber || (inspectOrder as any).numeroPedido || inspectOrder.id.slice(0, 6)}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 transition cursor-pointer text-stone-500 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid: Cliente & Vendedor */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border bg-[#FBF7EF] border-[#E8DFC8]">
                <span className="block text-[10px] font-black uppercase text-stone-500">Cliente:</span>
                <span className="font-black text-sm text-[#1A2B5C] block truncate mt-0.5">
                  {inspectOrder.cliente || (inspectOrder as any).clienteNombre || 'Sin nombre'}
                </span>
                {(inspectOrder.telefono || (inspectOrder as any).clienteTelefono) && (
                  <div className="text-xs text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{inspectOrder.telefono || (inspectOrder as any).clienteTelefono}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl border bg-[#FBF7EF] border-[#E8DFC8]">
                <span className="block text-[10px] font-black uppercase text-stone-500">Vendedor:</span>
                <span className="font-black text-sm text-[#1A2B5C] block truncate mt-0.5">
                  {inspectOrder.vendedorNombre || 'Sin asignar'}
                </span>
                <span className="block text-[11px] text-stone-500 font-medium mt-1">
                  Atención asignada
                </span>
              </div>
            </div>

            {/* Delivery Location or Notes if present */}
            {inspectOrder.lugarEntrega && (
              <div className="p-3 rounded-xl border text-xs flex items-start gap-2 bg-[#FBF7EF] border-[#E8DFC8]">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-[10px] uppercase text-stone-500 block">Punto / Lugar de entrega:</span>
                  <span className="text-stone-900 font-bold text-xs">{inspectOrder.lugarEntrega}</span>
                </div>
              </div>
            )}

            {/* Complete Products Breakdown (LA VENTA COMPLETA CON PRODUCTOS) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#1A2B5C] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  Productos del Pedido ({(inspectOrder.productos || []).length})
                </span>
                <span className="text-[11px] text-stone-500 font-semibold">
                  Cantidades y Subtotales
                </span>
              </div>

              <div className="border rounded-2xl overflow-hidden divide-y divide-[#E8DFC8] border-[#E8DFC8]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase font-black bg-[#F5EFE0] text-[#1A2B5C]">
                      <th className="py-2 px-3">Producto</th>
                      <th className="py-2 px-2 text-center">Cant.</th>
                      <th className="py-2 px-3 text-right">P. Unit</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DFC8]">
                    {(inspectOrder.productos || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-stone-500 font-semibold">
                          Sin productos registrados en este pedido.
                        </td>
                      </tr>
                    ) : (
                      (inspectOrder.productos || []).map((p, idx) => {
                        const lineSubtotal = (p.precioUnitario || 0) * (p.cantidad || 1);
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-[#FBF7EF] transition-colors"
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-black text-stone-900">
                                {p.nombre}
                              </div>
                              {p.variante && (
                                <div className="text-[11px] text-stone-600 font-medium">
                                  Variante: {p.variante}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-black text-blue-700">
                              {p.cantidad || 1}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-stone-700">
                              {formatBalance(p.precioUnitario || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-[#1A2B5C]">
                              {formatBalance(lineSubtotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observations if present */}
            {inspectOrder.observaciones && (
              <div className="p-3 rounded-xl border text-xs flex items-start gap-2 bg-[#FBF7EF] border-[#E8DFC8]">
                <FileText className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-[10px] uppercase text-stone-500 block">Observaciones:</span>
                  <span className="text-stone-800 font-medium text-xs">{inspectOrder.observaciones}</span>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="p-3.5 rounded-2xl border space-y-2 text-xs bg-[#FBF7EF] border-[#E8DFC8]">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-stone-600">Total del Pedido:</span>
                <span className="font-black text-lg text-[#1A2B5C]">
                  {formatBalance(inspectOrder.total || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-700 font-black">
                <span>Monto Cobrado (Pagado):</span>
                <span>{formatBalance(inspectOrder.pagado || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-700 font-black border-t pt-2 border-[#E8DFC8]">
                <span>Saldo por Cobrar:</span>
                <span>{formatBalance(inspectOrder.saldo || 0)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="w-full py-3 rounded-xl font-black text-xs bg-[#1A2B5C] text-white hover:bg-[#253B7A] transition cursor-pointer shadow-sm"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
