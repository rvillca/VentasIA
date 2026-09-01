import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Package,
  Users,
  Award,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  TrendingDown,
  Scale,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Order, Purchase } from '../types';
import { formatCurrency } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface ReportsScreenProps {
  orders: Order[];
  purchases?: Purchase[];
}

type DateRangeFilter = 'today' | '7days' | '30days' | 'this_month' | 'all';
type ReportViewType = 'ventas' | 'compras' | 'balance';

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ orders, purchases = [] }) => {
  const { isComprador, isJefe, isSupervisor } = useAuth();
  const { isDark } = useTheme();
  const [activeReportView, setActiveReportView] = useState<ReportViewType>(
    isComprador ? 'compras' : 'ventas'
  );
  const [range, setRange] = useState<DateRangeFilter>('7days');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      let matchDate = true;

      if (range === 'today') {
        matchDate = orderDate.toDateString() === now.toDateString();
      } else if (range === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchDate = orderDate >= past7;
      } else if (range === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchDate = orderDate >= past30;
      } else if (range === 'this_month') {
        matchDate =
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear();
      }

      const matchSeller =
        selectedSeller === 'all' ||
        (order.vendedorNombre || 'Sin asignar') === selectedSeller;

      return matchDate && matchSeller;
    });
  }, [orders, range, selectedSeller]);

  // Filter purchases by date range
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return purchases.filter((p) => {
      const pDate = new Date(p.fechaCompra || p.createdAt);
      let matchDate = true;

      if (range === 'today') {
        matchDate = pDate.toDateString() === now.toDateString();
      } else if (range === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchDate = pDate >= past7;
      } else if (range === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchDate = pDate >= past30;
      } else if (range === 'this_month') {
        matchDate =
          pDate.getMonth() === now.getMonth() &&
          pDate.getFullYear() === now.getFullYear();
      }

      const matchSupplier =
        selectedSupplier === 'all' ||
        (p.proveedor || 'Sin especificar') === selectedSupplier;

      return matchDate && matchSupplier;
    });
  }, [purchases, range, selectedSupplier]);

  // Unique list of sellers
  const allSellers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.vendedorNombre) set.add(o.vendedorNombre);
    });
    return Array.from(set);
  }, [orders]);

  // Unique list of suppliers
  const allSuppliers = useMemo(() => {
    const set = new Set<string>();
    purchases.forEach((p) => {
      if (p.proveedor) set.add(p.proveedor);
    });
    return Array.from(set);
  }, [purchases]);

  // Calculations for Sales (excluding Anulado from totals)
  const validOrders = useMemo(
    () => filteredOrders.filter((o) => o.estado !== 'Anulado'),
    [filteredOrders]
  );
  const canceledOrders = useMemo(
    () => filteredOrders.filter((o) => o.estado === 'Anulado'),
    [filteredOrders]
  );

  const totalVendido = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCobrado = validOrders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  const totalPorCobrar = validOrders.reduce((sum, o) => sum + (o.saldo || 0), 0);
  const totalAnulado = canceledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const ticketPromedio = validOrders.length > 0 ? totalVendido / validOrders.length : 0;

  // Calculations for Purchases (excluding Anulado)
  const validPurchases = useMemo(
    () => filteredPurchases.filter((p) => p.estado !== 'Anulado'),
    [filteredPurchases]
  );
  const totalInvertido = validPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPagadoCompras = validPurchases.reduce((sum, p) => sum + (p.pagado || 0), 0);
  const totalDeudaProveedores = validPurchases.reduce((sum, p) => sum + (p.saldo || 0), 0);
  const compraPromedio = validPurchases.length > 0 ? totalInvertido / validPurchases.length : 0;

  // Balance calculations
  const flujoCajaNeto = totalCobrado - totalPagadoCompras;
  const margenBrutoTeorico = totalVendido - totalInvertido;

  // Seller Performance Ranking
  const sellerPerformance = useMemo(() => {
    const map: Record<string, { count: number; total: number; cobrado: number }> = {};
    validOrders.forEach((o) => {
      const seller = o.vendedorNombre || 'Sin asignar';
      if (!map[seller]) {
        map[seller] = { count: 0, total: 0, cobrado: 0 };
      }
      map[seller].count += 1;
      map[seller].total += o.total || 0;
      map[seller].cobrado += o.pagado || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [validOrders]);

  // Supplier Performance Ranking
  const supplierPerformance = useMemo(() => {
    const map: Record<string, { count: number; total: number; pagado: number; saldo: number }> = {};
    validPurchases.forEach((p) => {
      const sup = p.proveedor || 'Sin especificar';
      if (!map[sup]) {
        map[sup] = { count: 0, total: 0, pagado: 0, saldo: 0 };
      }
      map[sup].count += 1;
      map[sup].total += p.total || 0;
      map[sup].pagado += p.pagado || 0;
      map[sup].saldo += p.saldo || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [validPurchases]);

  // Top Products Sold
  const topProductsSold = useMemo(() => {
    const map: Record<string, { cantidad: number; totalBs: number }> = {};
    validOrders.forEach((o) => {
      o.productos.forEach((p) => {
        const name = p.nombre.trim();
        if (!map[name]) {
          map[name] = { cantidad: 0, totalBs: 0 };
        }
        map[name].cantidad += p.cantidad || 1;
        map[name].totalBs += (p.cantidad || 1) * (p.precioUnitario || 0);
      });
    });

    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        cantidad: d.cantidad,
        totalBs: d.totalBs,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);
  }, [validOrders]);

  // Top Materials Purchased
  const topMaterialsPurchased = useMemo(() => {
    const map: Record<string, { cantidad: number; totalBs: number }> = {};
    validPurchases.forEach((p) => {
      p.productos.forEach((prod) => {
        const name = prod.nombre.trim();
        if (!map[name]) {
          map[name] = { cantidad: 0, totalBs: 0 };
        }
        map[name].cantidad += prod.cantidad || 1;
        map[name].totalBs += (prod.cantidad || 1) * (prod.costoUnitario || 0);
      });
    });

    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        cantidad: d.cantidad,
        totalBs: d.totalBs,
      }))
      .sort((a, b) => b.totalBs - a.totalBs)
      .slice(0, 6);
  }, [validPurchases]);

  // Export CSV Report
  const handleExportCSV = () => {
    if (activeReportView === 'ventas') {
      let csv = 'Numero,Cliente,Telefono,Lugar,Total_Bs,Pagado_Bs,Saldo_Bs,Estado,Vendedor,Fecha\n';
      filteredOrders.forEach((o) => {
        const dateStr = new Date(o.createdAt).toLocaleDateString('es-BO');
        csv += `"${o.orderNumber}","${o.cliente.replace(/"/g, '""')}","${o.telefono}","${o.lugarEntrega.replace(/"/g, '""')}",${o.total},${o.pagado},${o.saldo},"${o.estado}","${o.vendedorNombre || ''}","${dateStr}"\n`;
      });
      downloadFile(csv, `reporte_ventas_${range}.csv`);
    } else if (activeReportView === 'compras') {
      let csv = 'Numero,Proveedor,Telefono,Comprobante,MetodoPago,Total_Bs,Pagado_Bs,Saldo_Bs,Estado,Comprador,Fecha\n';
      filteredPurchases.forEach((p) => {
        const dateStr = new Date(p.fechaCompra || p.createdAt).toLocaleDateString('es-BO');
        csv += `"#C-${String(p.purchaseNumber).padStart(3, '0')}","${p.proveedor.replace(/"/g, '""')}","${p.telefonoProveedor || ''}","${p.numeroFacturaRecibo || ''}","${p.metodoPago}",${p.total},${p.pagado},${p.saldo},"${p.estado}","${p.compradorNombre || ''}","${dateStr}"\n`;
      });
      downloadFile(csv, `reporte_compras_${range}.csv`);
    } else {
      let csv = 'Metrica,Monto_Bs\n';
      csv += `"Total Ventas",${totalVendido}\n`;
      csv += `"Ingreso Cobrado en Caja",${totalCobrado}\n`;
      csv += `"Total Inversion Compras",${totalInvertido}\n`;
      csv += `"Pagado a Proveedores",${totalPagadoCompras}\n`;
      csv += `"Flujo Neto de Caja",${flujoCajaNeto}\n`;
      csv += `"Margen Bruto Estimado",${margenBrutoTeorico}\n`;
      downloadFile(csv, `balance_general_${range}.csv`);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="reports-dashboard-screen" className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* Header with Export & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border-[#FF6FA5]/30'
                  : 'bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20'
              }`}
            >
              Dashboard Analítico
            </span>
            <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              {isJefe ? '👑 Jefe / Admin' : isSupervisor ? '📊 Supervisor' : '🛒 Comprador'}
            </span>
          </div>
          <h1
            className={`text-xl sm:text-2xl font-black tracking-tight font-['Outfit',sans-serif] ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}
          >
            Reportes & Finanzas Chiquiminisos
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Métricas por día, semana y mes de Ventas, Compras e Inversión en mercadería.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm active:scale-95 shadow-sm flex items-center justify-center gap-2 transition cursor-pointer ${
            isDark
              ? 'bg-[#16234F] hover:bg-[#1E2D5A] border border-[#223368] text-white'
              : 'bg-white hover:bg-[#F5EFE0] border border-[#E8DFC8] text-[#1A2B5C]'
          }`}
        >
          <Download className="w-4 h-4 text-emerald-500" />
          <span>Exportar Excel (CSV)</span>
        </button>
      </div>

      {/* Main View Switcher: Ventas vs Compras vs Balance */}
      {!isComprador && (
        <div
          className={`grid grid-cols-3 gap-2 border p-1.5 rounded-2xl ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveReportView('ventas')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeReportView === 'ventas'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] shadow-md font-black'
                  : 'bg-[#1A2B5C] text-white shadow-md font-black'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>1. Reporte de Ventas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportView('compras')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeReportView === 'compras'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>2. Reporte de Compras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportView('balance')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeReportView === 'balance'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>3. Balance General</span>
          </button>
        </div>
      )}

      {/* Filter Controls Bar (Period + Specific Filters) */}
      <div
        className={`border rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setRange('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              range === 'today'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md'
                  : 'bg-[#1A2B5C] text-white font-black shadow-md'
                : isDark
                ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Hoy (Diario)
          </button>

          <button
            type="button"
            onClick={() => setRange('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              range === '7days'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md'
                  : 'bg-[#1A2B5C] text-white font-black shadow-md'
                : isDark
                ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Últimos 7 Días (Semanal)
          </button>

          <button
            type="button"
            onClick={() => setRange('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              range === 'this_month'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md'
                  : 'bg-[#1A2B5C] text-white font-black shadow-md'
                : isDark
                ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white'
                : 'bg-[#FBF7EF] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Este Mes (Mensual)
          </button>

          <button
            type="button"
            onClick={() => setRange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
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

        {activeReportView === 'ventas' && allSellers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Vendedor:</span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
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

        {activeReportView === 'compras' && allSuppliers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Proveedor:</span>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className={`text-xs font-bold border rounded-xl px-2.5 py-1.5 focus:outline-none transition ${
                isDark
                  ? 'bg-[#0F1B3C] text-white border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]'
              }`}
            >
              <option value="all">Todos los proveedores</option>
              {allSuppliers.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: REPORTE DE VENTAS */}
      {activeReportView === 'ventas' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Total Ventas (Bs.)
              </span>
              <span className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                {formatCurrency(totalVendido)}
              </span>
              <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-[#9AA6C9]/80' : 'text-[#78716C]/80'}`}>
                {validOrders.length} pedidos efectivos
              </span>
            </div>

            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-[#16234F] border-emerald-500/30' : 'bg-white border-emerald-200'
              }`}
            >
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                Cobrado en Caja (QR / Ef.)
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">
                {formatCurrency(totalCobrado)}
              </span>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 block mt-0.5">
                Ingreso real recibido
              </span>
            </div>

            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-[#16234F] border-amber-500/30' : 'bg-white border-amber-200'
              }`}
            >
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                Saldos por Cobrar
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-['Outfit',sans-serif]">
                {formatCurrency(totalPorCobrar)}
              </span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 block mt-0.5">
                Pendientes de cobro
              </span>
            </div>

            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                Ticket Promedio
              </span>
              <span className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                {formatCurrency(ticketPromedio)}
              </span>
              <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-[#9AA6C9]/80' : 'text-[#78716C]/80'}`}>
                Promedio por cliente
              </span>
            </div>
          </div>

          {/* Ventas Anuladas KPI if any */}
          {totalAnulado > 0 && (
            <div
              className={`p-3.5 border rounded-2xl flex items-center justify-between text-xs ${
                isDark
                  ? 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  <strong>Ventas Anuladas:</strong> {canceledOrders.length} pedido(s) anulado(s) por un valor de {formatCurrency(totalAnulado)}.
                </span>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sales by Seller Performance */}
            <div
              className={`lg:col-span-6 border rounded-3xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h2 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Rendimiento por Vendedor
                  </h2>
                </div>
                <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Total en Bs.</span>
              </div>

              <div className="space-y-3">
                {sellerPerformance.length === 0 ? (
                  <p className={`text-xs py-8 text-center ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Sin datos de ventas en este rango.
                  </p>
                ) : (
                  sellerPerformance.map((seller, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center ${
                            isDark
                              ? 'bg-[#FF6FA5]/20 text-[#FF6FA5]'
                              : 'bg-[#1A2B5C]/10 text-[#1A2B5C]'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                            {seller.name}
                          </h4>
                          <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                            {seller.count} {seller.count === 1 ? 'venta' : 'ventas'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-sm font-black font-mono block ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                          {formatCurrency(seller.total)}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Cobrado: {formatCurrency(seller.cobrado)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top 6 Best-selling Products */}
            <div
              className={`lg:col-span-6 border rounded-3xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className={`w-5 h-5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                  <h2 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Top Artículos Más Vendidos
                  </h2>
                </div>
                <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Unidades vendidas</span>
              </div>

              <div className="space-y-3">
                {topProductsSold.length === 0 ? (
                  <p className={`text-xs py-8 text-center ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Sin productos en este rango.
                  </p>
                ) : (
                  topProductsSold.map((prod, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                            isDark
                              ? 'bg-[#FF6FA5]/20 text-[#FF6FA5]'
                              : 'bg-[#1A2B5C]/10 text-[#1A2B5C]'
                          }`}
                        >
                          {prod.cantidad}u
                        </span>
                        <span className={`text-xs sm:text-sm font-bold truncate ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                          {prod.name}
                        </span>
                      </div>

                      <span className={`text-xs sm:text-sm font-black font-mono shrink-0 ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                        {formatCurrency(prod.totalBs)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REPORTE DE COMPRAS DE MATERIAL & MERCADERÍA */}
      {activeReportView === 'compras' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Inversión en Compras
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-['Outfit',sans-serif]">
                {formatCurrency(totalInvertido)}
              </span>
              <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-[#9AA6C9]/80' : 'text-[#78716C]/80'}`}>
                {validPurchases.length} compras de lote
              </span>
            </div>

            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-[#16234F] border-emerald-500/30' : 'bg-white border-emerald-200'
              }`}
            >
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                Pagado / Desembolsado
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">
                {formatCurrency(totalPagadoCompras)}
              </span>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 block mt-0.5">
                Efectivo & Transferencias
              </span>
            </div>

            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-[#16234F] border-rose-500/30' : 'bg-white border-rose-200'
              }`}
            >
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">
                Cuentas por Pagar (Saldos)
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-['Outfit',sans-serif]">
                {formatCurrency(totalDeudaProveedores)}
              </span>
              <span className="text-[11px] text-rose-700/80 dark:text-rose-400/80 block mt-0.5">
                Deuda pendiente proveedores
              </span>
            </div>

            <div
              className={`border rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Compra Promedio
              </span>
              <span className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                {formatCurrency(compraPromedio)}
              </span>
              <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-[#9AA6C9]/80' : 'text-[#78716C]/80'}`}>
                Promedio por factura/recibo
              </span>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Breakdown by Supplier */}
            <div
              className={`lg:col-span-6 border rounded-3xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-500" />
                  <h2 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Inversión por Proveedor Mayorista
                  </h2>
                </div>
                <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Total en Bs.</span>
              </div>

              <div className="space-y-3">
                {supplierPerformance.length === 0 ? (
                  <p className={`text-xs py-8 text-center ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Sin compras en este rango.
                  </p>
                ) : (
                  supplierPerformance.map((sup, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>{sup.name}</h4>
                          <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                            {sup.count} compra(s)
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono block">
                          {formatCurrency(sup.total)}
                        </span>
                        {sup.saldo > 0 ? (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                            Debe: {formatCurrency(sup.saldo)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            100% Cancelado
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Materials / Goods Purchased */}
            <div
              className={`lg:col-span-6 border rounded-3xl p-5 shadow-sm space-y-4 ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-3 ${
                  isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <h2 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Top Artículos & Materiales Comprados
                  </h2>
                </div>
                <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Mayor volumen invertido</span>
              </div>

              <div className="space-y-3">
                {topMaterialsPurchased.length === 0 ? (
                  <p className={`text-xs py-8 text-center ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    Sin artículos registrados en este rango.
                  </p>
                ) : (
                  topMaterialsPurchased.map((mat, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {mat.cantidad}u
                        </span>
                        <span className={`text-xs sm:text-sm font-bold truncate ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                          {mat.name}
                        </span>
                      </div>

                      <span className={`text-xs sm:text-sm font-black font-mono shrink-0 ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                        {formatCurrency(mat.totalBs)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: BALANCE GENERAL (VENTAS VS COMPRAS) */}
      {activeReportView === 'balance' && !isComprador && (
        <div className="space-y-6 animate-in fade-in">
          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className={`border rounded-3xl p-5 shadow-sm ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                  1. Ingresos por Ventas
                </span>
                <ArrowUpRight className={`w-5 h-5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                {formatCurrency(totalVendido)}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Efectivamente cobrado: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCobrado)}</strong>
              </p>
            </div>

            <div
              className={`border rounded-3xl p-5 shadow-sm ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  2. Egresos en Compras
                </span>
                <ArrowDownRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {formatCurrency(totalInvertido)}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Desembolsado: <strong>{formatCurrency(totalPagadoCompras)}</strong>
              </p>
            </div>

            <div
              className={`rounded-3xl p-5 shadow-sm border ${
                flujoCajaNeto >= 0
                  ? isDark
                    ? 'bg-[#16234F] border-emerald-500/40'
                    : 'bg-white border-emerald-300'
                  : isDark
                  ? 'bg-[#16234F] border-rose-500/40'
                  : 'bg-white border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    flujoCajaNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  3. Flujo Neto de Caja
                </span>
                <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  flujoCajaNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(flujoCajaNeto)}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                (Ingreso cobrado - Desembolso de compras)
              </p>
            </div>
          </div>

          {/* Comparative Summary Table */}
          <div
            className={`border rounded-3xl p-6 shadow-sm space-y-4 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            <h3 className={`text-base font-bold font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
              Resumen Financiero Consolidado
            </h3>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div
                className={`flex justify-between p-3 rounded-xl border ${
                  isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                }`}
              >
                <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>Total Facturado en Ventas:</span>
                <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  {formatCurrency(totalVendido)}
                </span>
              </div>
              <div
                className={`flex justify-between p-3 rounded-xl border ${
                  isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                }`}
              >
                <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>Total Inversión en Mercadería:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalInvertido)}</span>
              </div>
              <div
                className={`flex justify-between p-3 rounded-xl border ${
                  isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                }`}
              >
                <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>Cuentas por Cobrar (Saldos):</span>
                <span className={`font-mono font-bold ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                  {formatCurrency(totalPorCobrar)}
                </span>
              </div>
              <div
                className={`flex justify-between p-3 rounded-xl border ${
                  isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                }`}
              >
                <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>Cuentas por Pagar a Proveedores:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalDeudaProveedores)}</span>
              </div>
              <div
                className={`flex justify-between p-3.5 rounded-xl border text-base font-bold ${
                  isDark
                    ? 'bg-[#0F1B3C] border-emerald-500/40 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <span>Margen Bruto de Ganancia Teórico:</span>
                <span className="font-mono">{formatCurrency(margenBrutoTeorico)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
