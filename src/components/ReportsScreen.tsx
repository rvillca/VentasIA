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

interface ReportsScreenProps {
  orders: Order[];
  purchases?: Purchase[];
}

type DateRangeFilter = 'today' | '7days' | '30days' | 'this_month' | 'all';
type ReportViewType = 'ventas' | 'compras' | 'balance';

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ orders, purchases = [] }) => {
  const { isComprador, isJefe, isSupervisor } = useAuth();
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

      const matchSup =
        selectedSupplier === 'all' || p.proveedor === selectedSupplier;

      return matchDate && matchSup;
    });
  }, [purchases, range, selectedSupplier]);

  // Financial KPIs - Ventas
  const validOrders = filteredOrders.filter((o) => o.estado !== 'Anulado');
  const canceledOrders = filteredOrders.filter((o) => o.estado === 'Anulado');

  const totalVendido = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCobrado = validOrders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  const totalPorCobrar = validOrders.reduce((sum, o) => sum + (o.saldo || 0), 0);
  const totalAnulado = canceledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const ticketPromedio = validOrders.length > 0 ? totalVendido / validOrders.length : 0;

  // Financial KPIs - Compras
  const validPurchases = filteredPurchases.filter((p) => p.estado !== 'Anulado');
  const canceledPurchases = filteredPurchases.filter((p) => p.estado === 'Anulado');

  const totalInvertido = validPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPagadoCompras = validPurchases.reduce((sum, p) => sum + (p.pagado || 0), 0);
  const totalDeudaProveedores = validPurchases.reduce((sum, p) => sum + (p.saldo || 0), 0);
  const compraPromedio = validPurchases.length > 0 ? totalInvertido / validPurchases.length : 0;

  // Financial KPIs - Balance General
  const flujoCajaNeto = totalCobrado - totalPagadoCompras;
  const margenBrutoTeorico = totalVendido - totalInvertido;

  // Sellers & Suppliers List for filter
  const allSellers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.vendedorNombre) set.add(o.vendedorNombre);
    });
    return Array.from(set);
  }, [orders]);

  const allSuppliers = useMemo(() => {
    const set = new Set<string>();
    purchases.forEach((p) => {
      if (p.proveedor) set.add(p.proveedor);
    });
    return Array.from(set);
  }, [purchases]);

  // Breakdown by Seller
  const sellerPerformance = useMemo(() => {
    const map: Record<string, { total: number; count: number; cobrado: number }> = {};
    validOrders.forEach((o) => {
      const seller = o.vendedorNombre || 'Vendedor General';
      if (!map[seller]) {
        map[seller] = { total: 0, count: 0, cobrado: 0 };
      }
      map[seller].total += o.total || 0;
      map[seller].count += 1;
      map[seller].cobrado += o.pagado || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        cobrado: data.cobrado,
      }))
      .sort((a, b) => b.total - a.total);
  }, [validOrders]);

  // Breakdown by Supplier
  const supplierPerformance = useMemo(() => {
    const map: Record<string, { total: number; count: number; pagado: number; saldo: number }> = {};
    validPurchases.forEach((p) => {
      const sup = p.proveedor || 'Proveedor General';
      if (!map[sup]) {
        map[sup] = { total: 0, count: 0, pagado: 0, saldo: 0 };
      }
      map[sup].total += p.total || 0;
      map[sup].count += 1;
      map[sup].pagado += p.pagado || 0;
      map[sup].saldo += p.saldo || 0;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        pagado: data.pagado,
        saldo: data.saldo,
      }))
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

  // Sales by Day chart data
  const chartSalesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    validOrders.forEach((o) => {
      const dateKey = new Date(o.createdAt).toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
      });
      map[dateKey] = (map[dateKey] || 0) + (o.total || 0);
    });

    return Object.entries(map).map(([day, total]) => ({ day, total }));
  }, [validOrders]);

  // Purchases by Day chart data
  const chartPurchasesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    validPurchases.forEach((p) => {
      const dateKey = new Date(p.fechaCompra || p.createdAt).toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
      });
      map[dateKey] = (map[dateKey] || 0) + (p.total || 0);
    });

    return Object.entries(map).map(([day, total]) => ({ day, total }));
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
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
              Dashboard Analítico
            </span>
            <span className="text-xs text-slate-400">
              {isJefe ? '👑 Jefe / Admin' : isSupervisor ? '📊 Supervisor' : '🛒 Comprador'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight">
            Reportes & Finanzas Chiquiminisos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Métricas por día, semana y mes de Ventas, Compras e Inversión en mercadería.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 shadow-md flex items-center justify-center gap-2 transition"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Exportar Excel (CSV)</span>
        </button>
      </div>

      {/* Main View Switcher: Ventas vs Compras vs Balance (Only for Jefe/Supervisor, Comprador gets Compras) */}
      {!isComprador && (
        <div className="grid grid-cols-3 gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveReportView('ventas')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeReportView === 'ventas'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>1. Reporte de Ventas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportView('compras')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeReportView === 'compras'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>2. Reporte de Compras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportView('balance')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeReportView === 'balance'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>3. Balance General</span>
          </button>
        </div>
      )}

      {/* Filter Controls Bar (Period + Specific Filters) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setRange('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              range === 'today'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Hoy (Diario)
          </button>

          <button
            type="button"
            onClick={() => setRange('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              range === '7days'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Últimos 7 Días (Semanal)
          </button>

          <button
            type="button"
            onClick={() => setRange('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              range === 'this_month'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Este Mes (Mensual)
          </button>

          <button
            type="button"
            onClick={() => setRange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              range === 'all'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Histórico Total
          </button>
        </div>

        {activeReportView === 'ventas' && allSellers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Vendedor:</span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="bg-slate-950 text-xs font-bold text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none"
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
            <span className="text-xs text-slate-400">Proveedor:</span>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="bg-slate-950 text-xs font-bold text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none"
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Ventas (Bs.)
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif]">
                {formatCurrency(totalVendido)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {validOrders.length} pedidos efectivos
              </span>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-md bg-gradient-to-br from-slate-900 to-emerald-950/30">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Cobrado en Caja (QR / Ef.)
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 font-['Outfit',sans-serif]">
                {formatCurrency(totalCobrado)}
              </span>
              <span className="text-[11px] text-emerald-500/80 block mt-0.5">
                Ingreso real recibido
              </span>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-md bg-gradient-to-br from-slate-900 to-amber-950/30">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Saldos por Cobrar
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-['Outfit',sans-serif]">
                {formatCurrency(totalPorCobrar)}
              </span>
              <span className="text-[11px] text-amber-500/80 block mt-0.5">
                Pendientes de cobro
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                Ticket Promedio
              </span>
              <span className="text-xl sm:text-2xl font-black text-cyan-300 font-['Outfit',sans-serif]">
                {formatCurrency(ticketPromedio)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Promedio por cliente
              </span>
            </div>
          </div>

          {/* Ventas Anuladas KPI if any */}
          {totalAnulado > 0 && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/40 rounded-2xl flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Ventas Anuladas:</strong> {canceledOrders.length} pedido(s) anulado(s) por un valor de {formatCurrency(totalAnulado)}.
                </span>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sales by Seller Performance */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                    Rendimiento por Vendedor
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Total en Bs.</span>
              </div>

              <div className="space-y-3">
                {sellerPerformance.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    Sin datos de ventas en este rango.
                  </p>
                ) : (
                  sellerPerformance.map((seller, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-purple-950 text-purple-300 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{seller.name}</h4>
                          <p className="text-[11px] text-slate-400">
                            {seller.count} {seller.count === 1 ? 'venta' : 'ventas'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-cyan-300 font-mono block">
                          {formatCurrency(seller.total)}
                        </span>
                        <span className="text-[10px] text-emerald-400">
                          Cobrado: {formatCurrency(seller.cobrado)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top 6 Best-selling Products */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                    Top Artículos Más Vendidos
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Unidades vendidas</span>
              </div>

              <div className="space-y-3">
                {topProductsSold.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    Sin productos en este rango.
                  </p>
                ) : (
                  topProductsSold.map((prod, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-blue-950 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {prod.cantidad}u
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {prod.name}
                        </span>
                      </div>

                      <span className="text-xs sm:text-sm font-black text-white font-mono shrink-0">
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Inversión en Compras
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-['Outfit',sans-serif]">
                {formatCurrency(totalInvertido)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {validPurchases.length} compras de lote
              </span>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-md bg-gradient-to-br from-slate-900 to-emerald-950/30">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Pagado / Desembolsado
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 font-['Outfit',sans-serif]">
                {formatCurrency(totalPagadoCompras)}
              </span>
              <span className="text-[11px] text-emerald-500/80 block mt-0.5">
                Efectivo & Transferencias
              </span>
            </div>

            <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 shadow-md bg-gradient-to-br from-slate-900 to-rose-950/30">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                Cuentas por Pagar (Saldos)
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-300 font-['Outfit',sans-serif]">
                {formatCurrency(totalDeudaProveedores)}
              </span>
              <span className="text-[11px] text-rose-500/80 block mt-0.5">
                Deuda pendiente proveedores
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                Compra Promedio
              </span>
              <span className="text-xl sm:text-2xl font-black text-cyan-300 font-['Outfit',sans-serif]">
                {formatCurrency(compraPromedio)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Promedio por factura/recibo
              </span>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Breakdown by Supplier */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                    Inversión por Proveedor Mayorista
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Total en Bs.</span>
              </div>

              <div className="space-y-3">
                {supplierPerformance.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    Sin compras en este rango.
                  </p>
                ) : (
                  supplierPerformance.map((sup, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-950 text-amber-300 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{sup.name}</h4>
                          <p className="text-[11px] text-slate-400">
                            {sup.count} compra(s)
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-amber-300 font-mono block">
                          {formatCurrency(sup.total)}
                        </span>
                        {sup.saldo > 0 ? (
                          <span className="text-[10px] text-rose-400 font-bold">
                            Debe: {formatCurrency(sup.saldo)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400">
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
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                    Top Artículos & Materiales Comprados
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Mayor volumen invertido</span>
              </div>

              <div className="space-y-3">
                {topMaterialsPurchased.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    Sin artículos registrados en este rango.
                  </p>
                ) : (
                  topMaterialsPurchased.map((mat, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-amber-950 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {mat.cantidad}u
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {mat.name}
                        </span>
                      </div>

                      <span className="text-xs sm:text-sm font-black text-white font-mono shrink-0">
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
            <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-5 shadow-xl bg-gradient-to-br from-slate-900 to-blue-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  1. Ingresos por Ventas
                </span>
                <ArrowUpRight className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {formatCurrency(totalVendido)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Efectivamente cobrado: <strong className="text-emerald-300">{formatCurrency(totalCobrado)}</strong>
              </p>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl bg-gradient-to-br from-slate-900 to-amber-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  2. Egresos en Compras
                </span>
                <ArrowDownRight className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                {formatCurrency(totalInvertido)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Desembolsado: <strong className="text-slate-200">{formatCurrency(totalPagadoCompras)}</strong>
              </p>
            </div>

            <div className={`rounded-3xl p-5 shadow-xl border ${
              flujoCajaNeto >= 0
                ? 'bg-slate-900 border-emerald-500/40 bg-gradient-to-br from-slate-900 to-emerald-950/30'
                : 'bg-slate-900 border-rose-500/40 bg-gradient-to-br from-slate-900 to-rose-950/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${flujoCajaNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  3. Flujo Neto de Caja
                </span>
                <Scale className="w-5 h-5 text-emerald-400" />
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono ${flujoCajaNeto >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatCurrency(flujoCajaNeto)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                (Ingreso cobrado - Desembolso de compras)
              </p>
            </div>
          </div>

          {/* Comparative Summary Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
              Resumen Financiero Consolidado
            </h3>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Total Facturado en Ventas (TikTok / Envíos):</span>
                <span className="font-mono font-bold text-white">{formatCurrency(totalVendido)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Total Inversión en Mercadería y Embalajes:</span>
                <span className="font-mono font-bold text-amber-300">{formatCurrency(totalInvertido)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Cuentas por Cobrar a Clientes (Saldos):</span>
                <span className="font-mono font-bold text-cyan-300">{formatCurrency(totalPorCobrar)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Cuentas por Pagar a Proveedores:</span>
                <span className="font-mono font-bold text-rose-400">{formatCurrency(totalDeudaProveedores)}</span>
              </div>
              <div className="flex justify-between p-3.5 bg-slate-950 rounded-xl border border-emerald-500/40 text-base font-bold">
                <span className="text-emerald-400">Margen Bruto de Ganancia Teórico:</span>
                <span className="font-mono text-emerald-300">{formatCurrency(margenBrutoTeorico)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
