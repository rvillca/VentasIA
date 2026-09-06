import React, { useState, useMemo } from 'react';
import {
  FileSearch,
  Search,
  Calendar,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Download,
  Phone,
  Truck,
  ArrowUpDown,
  ShoppingBag,
  ExternalLink,
  DollarSign,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { useFinancialPrivacy } from '../../contexts/FinancialPrivacyContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatBoliviaWhatsAppDigits } from '../../lib/storage';

interface SalesHistoryAuditReportProps {
  orders: Order[];
  onSelectOrder?: (order: Order) => void;
}

type AuditPeriod = 'today' | 'this_week' | 'this_month' | '7days' | '30days' | 'custom' | 'all';
type AuditBalanceFilter = 'all' | 'con_saldo' | 'pagado';

export const SalesHistoryAuditReport: React.FC<SalesHistoryAuditReportProps> = ({
  orders,
  onSelectOrder,
}) => {
  const { isDark } = useTheme();
  const { formatBalance } = useFinancialPrivacy();

  // Filters state
  const [period, setPeriod] = useState<AuditPeriod>('this_week');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<AuditBalanceFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Order for Full Audit Modal
  const [auditOrderModal, setAuditOrderModal] = useState<Order | null>(null);

  // List of all sellers in orders
  const allSellers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.vendedorNombre && o.vendedorNombre.trim()) {
        set.add(o.vendedorNombre.trim());
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtered orders for audit
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return false;

      // 1. Period filter
      if (period === 'today') {
        if (orderDate.toDateString() !== now.toDateString()) return false;
      } else if (period === 'this_week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(now);
        mon.setDate(diff);
        mon.setHours(0, 0, 0, 0);
        if (orderDate < mon) return false;
      } else if (period === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (orderDate < past7) return false;
      } else if (period === 'this_month') {
        if (
          orderDate.getMonth() !== now.getMonth() ||
          orderDate.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      } else if (period === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (orderDate < past30) return false;
      } else if (period === 'custom') {
        const start = new Date(customStartDate + 'T00:00:00');
        const end = new Date(customEndDate + 'T23:59:59');
        if (orderDate < start || orderDate > end) return false;
      }

      // 2. Seller filter
      if (selectedSeller !== 'all') {
        const sName = (o.vendedorNombre || 'Sin Asignar').trim();
        if (sName !== selectedSeller) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all') {
        if (o.estado !== statusFilter) return false;
      }

      // 4. Balance filter
      if (balanceFilter === 'con_saldo') {
        if ((o.saldo || 0) <= 0) return false;
      } else if (balanceFilter === 'pagado') {
        if ((o.saldo || 0) > 0) return false;
      }

      // 5. Search term (orderNumber, cliente, telefono, lugarEntrega, productos)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNumber = String(o.orderNumber).includes(term);
        const matchCliente = (o.cliente || '').toLowerCase().includes(term);
        const matchTel = (o.telefono || '').includes(term);
        const matchPlace = (o.lugarEntrega || '').toLowerCase().includes(term);
        const matchProducts = (o.productos || []).some((p) =>
          (p.nombre || '').toLowerCase().includes(term)
        );

        if (!matchNumber && !matchCliente && !matchTel && !matchPlace && !matchProducts) {
          return false;
        }
      }

      return true;
    });
  }, [
    orders,
    period,
    customStartDate,
    customEndDate,
    selectedSeller,
    statusFilter,
    balanceFilter,
    searchTerm,
  ]);

  // Sort orders descending by createdAt
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredOrders]);

  // Audit Metrics
  const auditMetrics = useMemo(() => {
    const count = sortedOrders.length;
    let totalBs = 0;
    let pagadoBs = 0;
    let saldoBs = 0;
    let entregados = 0;
    let abiertos = 0;
    let anulados = 0;

    sortedOrders.forEach((o) => {
      if (o.estado !== 'Anulado') {
        totalBs += o.total || 0;
        pagadoBs += o.pagado || 0;
        saldoBs += o.saldo || 0;
      }
      if (o.estado === 'Entregado') entregados += 1;
      else if (o.estado === 'Abierto') abiertos += 1;
      else if (o.estado === 'Anulado') anulados += 1;
    });

    const deliveryRate = count > 0 ? (entregados / count) * 100 : 0;

    return {
      count,
      totalBs,
      pagadoBs,
      saldoBs,
      entregados,
      abiertos,
      anulados,
      deliveryRate,
    };
  }, [sortedOrders]);

  // Export to CSV
  const handleExportCSV = () => {
    let csv =
      'Nro_Orden,Fecha,Hora,Cliente,Telefono,Vendedor,Productos_Resumen,Lugar_Entrega,Total_Bs,Pagado_Bs,Saldo_Bs,Estado,Observaciones\n';

    sortedOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('es-BO') : '';
      const timeStr = !isNaN(d.getTime())
        ? d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
        : '';
      const prodStr = (o.productos || [])
        .map((p) => `${p.cantidad}x ${p.nombre}`)
        .join(' | ');

      csv += `"${o.orderNumber}","${dateStr}","${timeStr}","${(o.cliente || '').replace(/"/g, '""')}","${o.telefono || ''}","${(o.vendedorNombre || '').replace(/"/g, '""')}","${prodStr.replace(/"/g, '""')}","${(o.lugarEntrega || '').replace(/"/g, '""')}",${o.total || 0},${o.pagado || 0},${o.saldo || 0},"${o.estado}","${(o.observaciones || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_ventas_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark
            ? 'bg-gradient-to-r from-[#16234F] via-[#1A2B5C] to-[#16234F] border-[#223368]'
            : 'bg-gradient-to-r from-[#1A2B5C] via-[#243B7A] to-[#1A2B5C] text-white border-[#1A2B5C]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-stone-900 flex items-center gap-1 shadow-sm">
              <FileSearch className="w-3 h-3" /> Módulo de Auditoría y Control
            </span>
            <span className="text-xs font-semibold text-white/80">
              Registros encontrados: <strong className="text-amber-300">{sortedOrders.length} ventas</strong>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] text-white">
            Historial de Ventas para Revisión de Supervisión
          </h2>
          <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
            Permite inspeccionar cada pedido en detalle, verificar qué vendedora lo registró, qué productos se vendieron,
            el estado de entrega y si existen cobros pendientes.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-white text-[#1A2B5C] hover:bg-[#FBF7EF] active:scale-95 shadow-md flex items-center gap-2 transition cursor-pointer self-start md:self-auto shrink-0"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Exportar Auditoría (CSV)</span>
        </button>
      </div>

      {/* Audit KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Ventas Auditadas
          </span>
          <div className={`text-xl font-black mt-1 font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
            {auditMetrics.count} pedidos
          </div>
          <div className="text-[10px] text-[#78716C] dark:text-[#9AA6C9] mt-0.5">
            {auditMetrics.entregados} entregados · {auditMetrics.abiertos} abiertos
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Total Facturado
          </span>
          <div className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">
            {formatBalance(auditMetrics.totalBs)}
          </div>
          <div className="text-[10px] text-emerald-600/80 font-semibold mt-0.5">
            Monto neto registrado
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Cobrado / Recaudado
          </span>
          <div className={`text-xl font-black mt-1 font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
            {formatBalance(auditMetrics.pagadoBs)}
          </div>
          <div className="text-[10px] text-[#78716C] dark:text-[#9AA6C9] mt-0.5">
            Pagos asentados
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border shadow-sm ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Saldo Por Cobrar
          </span>
          <div className="text-xl font-black mt-1 text-amber-600 dark:text-amber-400 font-['Outfit',sans-serif]">
            {formatBalance(auditMetrics.saldoBs)}
          </div>
          <div className="text-[10px] text-amber-600/80 font-semibold mt-0.5">
            Pendiente de regularizar
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border shadow-sm col-span-2 lg:col-span-1 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Tasa de Entrega
          </span>
          <div className="text-xl font-black mt-1 text-blue-600 dark:text-blue-400 font-['Outfit',sans-serif]">
            {auditMetrics.deliveryRate.toFixed(0)}%
          </div>
          <div className="text-[10px] text-[#78716C] dark:text-[#9AA6C9] mt-0.5">
            {auditMetrics.anulados > 0 ? `${auditMetrics.anulados} anulados` : '0 pedidos anulados'}
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div
        className={`p-4 rounded-2xl border shadow-sm space-y-3.5 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Row 1: Search & Quick Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Real-time Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#78716C] dark:text-[#9AA6C9] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por N° pedido, cliente, celular, producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-3 py-2 text-xs font-bold rounded-xl border focus:outline-none ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-white focus:border-[#FF6FA5]'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:border-[#1A2B5C]'
              }`}
            />
          </div>

          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setPeriod('this_week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === 'this_week'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'bg-stone-100 dark:bg-stone-800 text-[#78716C] dark:text-[#9AA6C9]'
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
                  : 'bg-stone-100 dark:bg-stone-800 text-[#78716C] dark:text-[#9AA6C9]'
              }`}
            >
              📅 Este Mes
            </button>
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === 'today'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'bg-stone-100 dark:bg-stone-800 text-[#78716C] dark:text-[#9AA6C9]'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === '7days'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'bg-stone-100 dark:bg-stone-800 text-[#78716C] dark:text-[#9AA6C9]'
              }`}
            >
              7 Días
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === '30days'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'bg-stone-100 dark:bg-stone-800 text-[#78716C] dark:text-[#9AA6C9]'
              }`}
            >
              30 Días
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === 'custom'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'bg-stone-100 dark:bg-stone-800 text-[#78716C] dark:text-[#9AA6C9]'
              }`}
            >
              🗓️ Personalizado
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === 'all'
                  ? 'bg-[#1A2B5C] text-white shadow-sm font-black'
                  : 'bg-stone-100 dark:bg-stone-800 text-[#78716C] dark:text-[#9AA6C9]'
              }`}
            >
              Todo
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Vendedora, Estado, Saldo, Fechas personalizadas) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#E8DFC8] dark:border-[#223368] text-xs">
          {/* Custom Date Range Pickers if custom is selected */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-[#FBF7EF] dark:bg-[#0F1B3C] p-1.5 rounded-xl border border-[#E8DFC8] dark:border-[#223368]">
              <span className="font-bold text-[#78716C] dark:text-[#9AA6C9]">Desde:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent font-bold cursor-pointer focus:outline-none"
              />
              <span className="font-bold text-[#78716C] dark:text-[#9AA6C9]">Hasta:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent font-bold cursor-pointer focus:outline-none"
              />
            </div>
          )}

          {/* Seller Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#78716C] dark:text-[#9AA6C9]">Vendedora:</span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className={`px-2.5 py-1.5 rounded-xl border font-bold focus:outline-none cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-white'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <option value="all">Todas las vendedoras</option>
              {allSellers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#78716C] dark:text-[#9AA6C9]">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-2.5 py-1.5 rounded-xl border font-bold focus:outline-none cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-white'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <option value="all">Todos los estados</option>
              <option value="Abierto">Abierto</option>
              <option value="Entregado">Entregado</option>
              <option value="Anulado">Anulado</option>
            </select>
          </div>

          {/* Balance Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#78716C] dark:text-[#9AA6C9]">Cobro:</span>
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as AuditBalanceFilter)}
              className={`px-2.5 py-1.5 rounded-xl border font-bold focus:outline-none cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] border-[#223368] text-white'
                  : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <option value="all">Todos los cobros</option>
              <option value="con_saldo">⚠️ Con saldo pendiente</option>
              <option value="pagado">✓ Pagados al 100%</option>
            </select>
          </div>

          {(searchTerm || selectedSeller !== 'all' || statusFilter !== 'all' || balanceFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedSeller('all');
                setStatusFilter('all');
                setBalanceFilter('all');
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Table of Audit Orders */}
      <div
        className={`border rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Mostrando {sortedOrders.length} pedidos ordenados cronológicamente:
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E8DFC8] dark:border-[#223368]">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className={isDark ? 'bg-[#0F1B3C] text-[#9AA6C9]' : 'bg-[#FBF7EF] text-[#78716C]'}>
                <th className="py-3 px-3.5 font-bold">N° Pedido</th>
                <th className="py-3 px-3.5 font-bold">Fecha / Hora</th>
                <th className="py-3 px-3.5 font-bold">Cliente</th>
                <th className="py-3 px-3.5 font-bold">Vendedora</th>
                <th className="py-3 px-3.5 font-bold">Productos</th>
                <th className="py-3 px-3.5 font-bold">Lugar Entrega</th>
                <th className="py-3 px-3.5 font-bold text-right">Total (Bs.)</th>
                <th className="py-3 px-3.5 font-bold text-right">Saldo</th>
                <th className="py-3 px-3.5 font-bold text-center">Estado</th>
                <th className="py-3 px-3.5 font-bold text-center">Auditar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DFC8] dark:divide-[#223368]">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#78716C] dark:text-[#9AA6C9]">
                    No se encontraron registros de ventas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((o) => {
                  const dateObj = new Date(o.createdAt);
                  const dateFormatted = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('es-BO', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : '';
                  const timeFormatted = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleTimeString('es-BO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  const whatsappNumber = formatBoliviaWhatsAppDigits(o.telefono);

                  return (
                    <tr
                      key={o.id}
                      className={`transition ${
                        isDark ? 'hover:bg-[#1E2D5A]' : 'hover:bg-[#FAF6ED]'
                      }`}
                    >
                      {/* N° Pedido */}
                      <td className="py-3 px-3.5 font-black text-[#FF6FA5]">
                        <button
                          type="button"
                          onClick={() => setAuditOrderModal(o)}
                          className="hover:underline font-mono text-xs cursor-pointer"
                        >
                          #{o.orderNumber}
                        </button>
                      </td>

                      {/* Fecha / Hora */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-xs">{dateFormatted}</div>
                        <div className="text-[10px] text-[#78716C] dark:text-[#9AA6C9]">{timeFormatted}</div>
                      </td>

                      {/* Cliente & Teléfono */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-xs max-w-[150px] truncate">{o.cliente}</div>
                        {o.telefono && (
                          <div className="flex items-center gap-1 text-[11px] text-[#78716C] dark:text-[#9AA6C9]">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            {whatsappNumber ? (
                              <a
                                href={`https://wa.me/${whatsappNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:underline"
                              >
                                {o.telefono}
                              </a>
                            ) : (
                              <span>{o.telefono}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Vendedora */}
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-xs px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">
                          {o.vendedorNombre || 'Sin asignar'}
                        </span>
                      </td>

                      {/* Productos Resumen */}
                      <td className="py-3 px-3.5">
                        <div className="text-xs max-w-[180px] truncate font-medium">
                          {(o.productos || []).map((p) => `${p.cantidad}x ${p.nombre}`).join(', ')}
                        </div>
                        <div className="text-[10px] text-[#78716C] dark:text-[#9AA6C9]">
                          {(o.productos || []).length}{' '}
                          {(o.productos || []).length === 1 ? 'artículo' : 'artículos'}
                        </div>
                      </td>

                      {/* Destino */}
                      <td className="py-3 px-3.5">
                        <div className="text-xs max-w-[120px] truncate">
                          {o.lugarEntrega || 'Mostrador / Por definir'}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">
                        {formatBalance(o.total)}
                      </td>

                      {/* Saldo */}
                      <td className="py-3 px-3.5 text-right font-bold">
                        {o.saldo > 0 ? (
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {formatBalance(o.saldo)}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold">✓ Pagado</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-extrabold inline-block ${
                            o.estado === 'Entregado'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : o.estado === 'Abierto'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {o.estado}
                        </span>
                      </td>

                      {/* Botón Auditar */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setAuditOrderModal(o)}
                          className="p-1.5 rounded-xl bg-[#1A2B5C] text-white hover:bg-[#243B7A] transition shadow-sm cursor-pointer inline-flex items-center justify-center"
                          title="Revisar y Auditar Pedido Completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* MODAL DE REVISIÓN Y AUDITORÍA DETALLADA */}
      {auditOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 ${
              isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E8DFC8] dark:border-[#223368] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#1A2B5C] text-white">
                    Ficha de Auditoría
                  </span>
                  <span className="text-xs font-mono font-bold text-[#FF6FA5]">
                    Pedido #{auditOrderModal.orderNumber}
                  </span>
                </div>
                <h3
                  className={`text-lg font-black font-['Outfit',sans-serif] mt-0.5 ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  {auditOrderModal.cliente}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAuditOrderModal(null)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center justify-center font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              {/* Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#FBF7EF] dark:bg-[#0F1B3C] border border-[#E8DFC8] dark:border-[#223368]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Fecha y Hora de Registro
                  </span>
                  <p className="font-bold">
                    {new Date(auditOrderModal.createdAt).toLocaleString('es-BO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Vendedora Responsable
                  </span>
                  <p className="font-bold text-blue-600 dark:text-blue-400">
                    {auditOrderModal.vendedorNombre || 'Sin asignar'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Estado Actual
                  </span>
                  <p className="font-black text-[#FF6FA5]">
                    {auditOrderModal.estado}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Teléfono / WhatsApp
                  </span>
                  <p className="font-bold">
                    {auditOrderModal.telefono || 'No registrado'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Lugar de Entrega
                  </span>
                  <p className="font-bold">
                    {auditOrderModal.lugarEntrega || 'No especificado'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Despachado Por
                  </span>
                  <p className="font-bold">
                    {auditOrderModal.despachadoPorNombre || 'Pendiente de despacho'}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-black text-xs uppercase tracking-wider text-[#78716C] dark:text-[#9AA6C9]">
                  Detalle de Artículos y Precios ({auditOrderModal.productos?.length || 0})
                </span>
                <div className="border rounded-2xl overflow-hidden border-[#E8DFC8] dark:border-[#223368]">
                  <table className="w-full text-left text-xs">
                    <thead className={isDark ? 'bg-[#0F1B3C]' : 'bg-[#FBF7EF]'}>
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Artículo</th>
                        <th className="py-2.5 px-3 font-bold">Variante</th>
                        <th className="py-2.5 px-3 font-bold text-center">Cant.</th>
                        <th className="py-2.5 px-3 font-bold text-right">P. Unit</th>
                        <th className="py-2.5 px-3 font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8DFC8] dark:divide-[#223368]">
                      {(auditOrderModal.productos || []).map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-bold">{p.nombre}</td>
                          <td className="py-2 px-3 text-[#78716C] dark:text-[#9AA6C9]">
                            {p.variante || 'Estándar'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">{p.cantidad}</td>
                          <td className="py-2 px-3 text-right">{formatBalance(p.precioUnitario)}</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-600">
                            {formatBalance((p.cantidad || 1) * (p.precioUnitario || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Box */}
              <div className="p-3.5 rounded-2xl border flex items-center justify-between gap-4 bg-emerald-500/5 border-emerald-500/20">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Total Facturado
                  </span>
                  <div className="text-xl font-black text-emerald-600 font-['Outfit',sans-serif]">
                    {formatBalance(auditOrderModal.total)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Abonado / Pagado
                  </span>
                  <div className="text-lg font-bold">
                    {formatBalance(auditOrderModal.pagado)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-[#78716C] dark:text-[#9AA6C9]">
                    Saldo Restante
                  </span>
                  <div className="text-lg font-black text-amber-600">
                    {formatBalance(auditOrderModal.saldo)}
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              {auditOrderModal.observaciones && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    Observaciones / Notas:
                  </span>
                  <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                    {auditOrderModal.observaciones}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E8DFC8] dark:border-[#223368] flex items-center justify-between">
              {auditOrderModal.telefono && (
                <a
                  href={`https://wa.me/${formatBoliviaWhatsAppDigits(auditOrderModal.telefono)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contactar Cliente por WhatsApp</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setAuditOrderModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1A2B5C] text-white hover:bg-[#243B7A] transition ml-auto"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
