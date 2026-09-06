import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Send,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Phone,
  User,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { Order, Purchase } from '../types';
import {
  formatCurrency,
  formatBoliviaPhone,
  formatBoliviaWhatsAppDigits,
} from '../lib/storage';
import { useTheme } from '../contexts/ThemeContext';
import { useFinancialPrivacy } from '../contexts/FinancialPrivacyContext';
import { BalanceToggleBtn } from './BalanceToggleBtn';

interface SeguimientoScreenProps {
  orders: Order[];
  purchases: Purchase[];
  onSelectOrder?: (order: Order) => void;
}

type ViewFilter = 'all' | 'ventas' | 'compras';

// Helper to compute elapsed days from a date string
function getDaysElapsed(dateString: string): { days: number; text: string } {
  if (!dateString) return { days: 0, text: 'Fecha no registrada' };
  try {
    const itemDate = new Date(dateString);
    if (isNaN(itemDate.getTime())) {
      // Try parsing DD/MM/YYYY or YYYY-MM-DD
      const parts = dateString.split(/[-/]/);
      if (parts.length === 3) {
        const d = parts[0].length === 4 ? new Date(dateString) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) {
          return calculateDiff(d);
        }
      }
      return { days: 0, text: 'Hoy' };
    }
    return calculateDiff(itemDate);
  } catch {
    return { days: 0, text: 'Hoy' };
  }
}

function calculateDiff(pastDate: Date): { days: number; text: string } {
  const now = new Date();
  // Strip time for exact day count
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemZero = new Date(pastDate.getFullYear(), pastDate.getMonth(), pastDate.getDate());
  const diffMs = todayZero.getTime() - itemZero.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return { days: 0, text: 'Hoy' };
  if (days === 1) return { days: 1, text: 'Hace 1 día' };
  return { days, text: `Hace ${days} días` };
}

export const SeguimientoScreen: React.FC<SeguimientoScreenProps> = ({
  orders = [],
  purchases = [],
  onSelectOrder,
}) => {
  const { isDark } = useTheme();
  const { showBalances, formatBalance, toggleShowBalances } = useFinancialPrivacy();
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDays, setSortByDays] = useState<'desc' | 'asc'>('desc');

  // Filter sales with pending balance
  const ventasPendientes = useMemo(() => {
    return orders
      .filter((o) => o.estado !== 'Anulado' && o.saldo > 0)
      .map((o) => {
        const elapsed = getDaysElapsed(o.fecha);
        return {
          ...o,
          daysElapsed: elapsed.days,
          daysText: elapsed.text,
        };
      })
      .sort((a, b) => (sortByDays === 'desc' ? b.daysElapsed - a.daysElapsed : a.daysElapsed - b.daysElapsed));
  }, [orders, sortByDays]);

  // Filter purchases with pending balance to suppliers
  const comprasPendientes = useMemo(() => {
    return purchases
      .filter((p) => p.estado !== 'Anulado' && p.saldo > 0)
      .map((p) => {
        const elapsed = getDaysElapsed(p.fecha);
        return {
          ...p,
          daysElapsed: elapsed.days,
          daysText: elapsed.text,
        };
      })
      .sort((a, b) => (sortByDays === 'desc' ? b.daysElapsed - a.daysElapsed : a.daysElapsed - b.daysElapsed));
  }, [purchases, sortByDays]);

  // Total metrics
  const totalPorCobrar = useMemo(() => {
    return ventasPendientes.reduce((sum, v) => sum + v.saldo, 0);
  }, [ventasPendientes]);

  const totalPorPagar = useMemo(() => {
    return comprasPendientes.reduce((sum, c) => sum + c.saldo, 0);
  }, [comprasPendientes]);

  const balanceNeto = totalPorCobrar - totalPorPagar;

  // Search filtering
  const filteredVentas = useMemo(() => {
    if (!searchTerm.trim()) return ventasPendientes;
    const term = searchTerm.toLowerCase();
    return ventasPendientes.filter(
      (v) =>
        v.cliente.toLowerCase().includes(term) ||
        v.telefono.includes(term) ||
        String(v.orderNumber).includes(term) ||
        v.destino.toLowerCase().includes(term)
    );
  }, [ventasPendientes, searchTerm]);

  const filteredCompras = useMemo(() => {
    if (!searchTerm.trim()) return comprasPendientes;
    const term = searchTerm.toLowerCase();
    return comprasPendientes.filter(
      (c) =>
        c.proveedor.toLowerCase().includes(term) ||
        (c.telefonoProveedor && c.telefonoProveedor.includes(term)) ||
        String(c.purchaseNumber).includes(term) ||
        (c.numeroFacturaRecibo && c.numeroFacturaRecibo.toLowerCase().includes(term))
    );
  }, [comprasPendientes, searchTerm]);

  // WhatsApp reminder generator for client
  const generateWhatsAppReminderUrl = (order: Order): string => {
    const rawDigits = formatBoliviaWhatsAppDigits(order.telefono);
    const firstName = order.cliente.split(' ')[0] || order.cliente;
    const msg =
      `¡Hola ${firstName}! Te saludamos de Importadora Chiquiminisos ✨\n\n` +
      `Te recordamos cordialmente que tienes un saldo pendiente de *${formatCurrency(order.saldo)}* correspondiente a tu pedido *#${order.orderNumber}* (Total: ${formatCurrency(order.total)}).\n\n` +
      `Si ya realizaste el pago por transferencia o QR, por favor reenvíanos tu comprobante. ¡Muchas gracias por tu preferencia! 💕`;

    const encoded = encodeURIComponent(msg);
    return rawDigits ? `https://wa.me/${rawDigits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  };

  return (
    <div
      id="seguimiento-cobros-pagos-screen"
      className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6"
    >
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1
                className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${
                  isDark ? 'text-white' : 'text-[#1A2B5C]'
                }`}
              >
                Seguimiento de Cobros y Pagos
              </h1>
              <p
                className={`text-xs sm:text-sm font-medium ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Gestión operativa de cuentas por cobrar a clientas y deudas con proveedores
              </p>
            </div>
          </div>
        </div>

        {/* Action controls: Sort toggle & Privacy toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <BalanceToggleBtn size="md" />

          <button
            type="button"
            onClick={() => setSortByDays((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isDark
                ? 'bg-[#16234F] border-[#223368] text-[#9AA6C9] hover:text-white'
                : 'bg-white border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {sortByDays === 'desc' ? 'Más antiguos primero' : 'Más recientes primero'}
            </span>
          </button>
        </div>
      </div>

      {/* Top Financial Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total por Cobrar */}
        <div
          id="kpi-total-por-cobrar"
          onClick={toggleShowBalances}
          className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-sm bg-gradient-to-br from-white to-emerald-50/40 relative overflow-hidden cursor-pointer select-none hover:border-emerald-400 transition"
          title="Haz clic para mostrar u ocultar saldos"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Total por Cobrar (Clientes)
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-['Outfit',sans-serif] block">
            {formatBalance(totalPorCobrar)}
          </span>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              {ventasPendientes.length} {ventasPendientes.length === 1 ? 'venta' : 'ventas'}
            </span>
            <span>con saldo pendiente</span>
          </div>
        </div>

        {/* Total por Pagar */}
        <div
          id="kpi-total-por-pagar"
          onClick={toggleShowBalances}
          className="bg-white border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-sm bg-gradient-to-br from-white to-rose-50/40 relative overflow-hidden cursor-pointer select-none hover:border-rose-400 transition"
          title="Haz clic para mostrar u ocultar saldos"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Total por Pagar (Proveedores)
            </span>
            <span className="p-1.5 rounded-xl bg-rose-100 text-rose-800">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-rose-700 font-['Outfit',sans-serif] block">
            {formatBalance(totalPorPagar)}
          </span>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-700">
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
              {comprasPendientes.length} {comprasPendientes.length === 1 ? 'compra' : 'compras'}
            </span>
            <span>con saldo a pagar</span>
          </div>
        </div>

        {/* Balance Neto */}
        <div
          id="kpi-balance-neto"
          onClick={toggleShowBalances}
          className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border relative overflow-hidden cursor-pointer select-none hover:border-cyan-400 transition ${
            balanceNeto >= 0
              ? 'border-cyan-200 bg-gradient-to-br from-white to-cyan-50/40'
              : 'border-amber-200 bg-gradient-to-br from-white to-amber-50/40'
          }`}
          title="Haz clic para mostrar u ocultar saldos"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                balanceNeto >= 0 ? 'text-cyan-800' : 'text-amber-800'
              }`}
            >
              Balance Neto Operativo
            </span>
            <span
              className={`p-1.5 rounded-xl ${
                balanceNeto >= 0 ? 'bg-cyan-100 text-cyan-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <span
            className={`text-2xl sm:text-3xl font-black font-['Outfit',sans-serif] block ${
              balanceNeto >= 0 ? 'text-cyan-800' : 'text-amber-800'
            }`}
          >
            {showBalances
              ? balanceNeto >= 0
                ? `+${formatCurrency(balanceNeto)}`
                : formatCurrency(balanceNeto)
              : 'Bs. •••••'}
          </span>
          <span
            className={`text-xs block mt-2 font-semibold ${
              balanceNeto >= 0 ? 'text-cyan-700' : 'text-amber-700'
            }`}
          >
            {balanceNeto >= 0
              ? 'Balance a favor (más cuentas por cobrar que deudas)'
              : 'Deuda neta (más deudas con proveedores que cobros)'}
          </span>
        </div>
      </div>

      {/* View Switcher and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E8DFC8] rounded-2xl p-3 shadow-sm">
        {/* Tabs Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FBF7EF] rounded-xl border border-[#E8DFC8]">
          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewFilter === 'all'
                ? 'bg-[#1A2B5C] text-white shadow-xs font-black'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Ver Todo ({ventasPendientes.length + comprasPendientes.length})
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('ventas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewFilter === 'ventas'
                ? 'bg-emerald-700 text-white shadow-xs font-black'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span>Por Cobrar ({ventasPendientes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('compras')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewFilter === 'compras'
                ? 'bg-rose-700 text-white shadow-xs font-black'
                : 'text-rose-800 hover:bg-rose-50'
            }`}
          >
            <span>Por Pagar ({comprasPendientes.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, proveedor, teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FBF7EF] border border-[#E8DFC8] rounded-xl text-[#1A2B5C] placeholder-[#78716C]/60 focus:outline-none focus:ring-2 focus:ring-[#1A2B5C]/20"
          />
        </div>
      </div>

      {/* Main Section Content */}
      <div className="space-y-6">
        {/* Section 1: VENTAS CON SALDO PENDIENTE */}
        {(viewFilter === 'all' || viewFilter === 'ventas') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h2
                  className={`text-base font-extrabold font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  Ventas con Saldo Pendiente ({filteredVentas.length})
                </h2>
              </div>
              <span className="text-xs font-black text-emerald-700 font-['Outfit',sans-serif]">
                Total: {showBalances ? formatCurrency(filteredVentas.reduce((sum, v) => sum + v.saldo, 0)) : 'Bs. •••••'}
              </span>
            </div>

            {filteredVentas.length === 0 ? (
              <div className="bg-white border border-[#E8DFC8] rounded-2xl p-6 text-center text-[#78716C] text-xs">
                {searchTerm ? 'No se encontraron ventas con saldo que coincidan con la búsqueda.' : '🎉 ¡Excelente! No hay ventas con saldo pendiente por cobrar.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredVentas.map((venta) => {
                  const isLongPending = venta.daysElapsed >= 7;
                  const isMediumPending = venta.daysElapsed >= 3 && venta.daysElapsed < 7;
                  const whatsappUrl = generateWhatsAppReminderUrl(venta);

                  return (
                    <div
                      key={venta.id}
                      id={`venta-pendiente-${venta.id}`}
                      className="bg-white border border-[#E8DFC8] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-3"
                    >
                      {/* Card Header: Order #, Client, Days Elapsed */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-[#1A2B5C] text-white text-[11px] font-black font-mono">
                              #{venta.orderNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                isLongPending
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isMediumPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{venta.daysText}</span>
                            </span>
                          </div>

                          <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{venta.fecha}</span>
                          </span>
                        </div>

                        {/* Client details */}
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <span className="font-extrabold text-sm text-[#1A2B5C] block">
                              {venta.cliente}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-[#78716C] mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{formatBoliviaPhone(venta.telefono)}</span>
                              {venta.destino && (
                                <>
                                  <span className="text-[#E8DFC8]">·</span>
                                  <span>{venta.destino}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financial Figures */}
                      <div className="p-2.5 bg-[#FBF7EF] rounded-xl border border-[#E8DFC8] grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[10px] font-bold text-[#78716C] uppercase block">
                            Total Venta
                          </span>
                          <span className="text-xs font-black text-[#1A2B5C] font-['Outfit',sans-serif]">
                            {formatBalance(venta.total)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                            Pagado
                          </span>
                          <span className="text-xs font-black text-emerald-700 font-['Outfit',sans-serif]">
                            {formatBalance(venta.pagado)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-rose-800 uppercase block">
                            Saldo Adeudado
                          </span>
                          <span className="text-xs sm:text-sm font-black text-rose-700 font-['Outfit',sans-serif]">
                            {formatBalance(venta.saldo)}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons: Direct WhatsApp reminder & View order */}
                      <div className="flex items-center gap-2 pt-1 border-t border-[#E8DFC8]">
                        <a
                          id={`btn-whatsapp-recordatorio-${venta.id}`}
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer"
                          title="Enviar mensaje cordial de recordatorio de cobro por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Recordatorio WhatsApp</span>
                        </a>

                        {onSelectOrder && (
                          <button
                            type="button"
                            onClick={() => onSelectOrder(venta)}
                            className="py-2 px-3 rounded-xl border border-[#E8DFC8] bg-white hover:bg-[#FBF7EF] text-[#1A2B5C] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Ver detalles del pedido"
                          >
                            <span>Ver Venta</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#78716C]" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section 2: COMPRAS CON SALDO PENDIENTE A PROVEEDORES */}
        {(viewFilter === 'all' || viewFilter === 'compras') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <h2
                  className={`text-base font-extrabold font-['Outfit',sans-serif] ${
                    isDark ? 'text-white' : 'text-[#1A2B5C]'
                  }`}
                >
                  Compras con Saldo Pendiente a Proveedores ({filteredCompras.length})
                </h2>
              </div>
              <span className="text-xs font-black text-rose-700 font-['Outfit',sans-serif]">
                Total: {showBalances ? formatCurrency(filteredCompras.reduce((sum, c) => sum + c.saldo, 0)) : 'Bs. •••••'}
              </span>
            </div>

            {filteredCompras.length === 0 ? (
              <div className="bg-white border border-[#E8DFC8] rounded-2xl p-6 text-center text-[#78716C] text-xs">
                {searchTerm ? 'No se encontraron compras que coincidan con la búsqueda.' : '🎉 ¡Excelente! No hay deudas pendientes con proveedores de mercadería.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCompras.map((compra) => {
                  const isLongPending = compra.daysElapsed >= 7;
                  const isMediumPending = compra.daysElapsed >= 3 && compra.daysElapsed < 7;
                  const waSupplier = compra.telefonoProveedor
                    ? formatBoliviaWhatsAppDigits(compra.telefonoProveedor)
                    : null;

                  return (
                    <div
                      key={compra.id}
                      id={`compra-pendiente-${compra.id}`}
                      className="bg-white border border-[#E8DFC8] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-3"
                    >
                      {/* Card Header: Purchase #, Supplier, Days Elapsed */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-[#EA580C] text-white text-[11px] font-black font-mono">
                              #C-{String(compra.purchaseNumber).padStart(3, '0')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                isLongPending
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isMediumPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{compra.daysText}</span>
                            </span>
                          </div>

                          <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{compra.fecha}</span>
                          </span>
                        </div>

                        {/* Supplier details */}
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <span className="font-extrabold text-sm text-[#1A2B5C] block">
                              {compra.proveedor}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-[#78716C] mt-0.5">
                              {compra.telefonoProveedor ? (
                                <>
                                  <Phone className="w-3 h-3" />
                                  <span>{formatBoliviaPhone(compra.telefonoProveedor)}</span>
                                </>
                              ) : (
                                <span>Sin teléfono registrado</span>
                              )}
                              {compra.numeroFacturaRecibo && (
                                <>
                                  <span className="text-[#E8DFC8]">·</span>
                                  <span className="font-mono">Doc: {compra.numeroFacturaRecibo}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {compra.compradorNombre && (
                            <span className="text-[11px] text-[#78716C]">
                              Por: <strong className="text-[#1A2B5C]">{compra.compradorNombre}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financial Figures */}
                      <div className="p-2.5 bg-[#FBF7EF] rounded-xl border border-[#E8DFC8] grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[10px] font-bold text-[#78716C] uppercase block">
                            Total Compra
                          </span>
                          <span className="text-xs font-black text-[#1A2B5C] font-['Outfit',sans-serif]">
                            {formatBalance(compra.total)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                            Pagado
                          </span>
                          <span className="text-xs font-black text-emerald-700 font-['Outfit',sans-serif]">
                            {formatBalance(compra.pagado)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-rose-800 uppercase block">
                            Deuda Pendiente
                          </span>
                          <span className="text-xs sm:text-sm font-black text-rose-700 font-['Outfit',sans-serif]">
                            {formatBalance(compra.saldo)}
                          </span>
                        </div>
                      </div>

                      {/* Items Preview / Supplier Contact */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#E8DFC8] text-xs">
                        <span className="text-[11px] text-[#78716C]">
                          {compra.productos?.length || 0} artículo(s) en el lote
                        </span>

                        {waSupplier && (
                          <a
                            href={`https://wa.me/${waSupplier}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>WhatsApp Proveedor</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
