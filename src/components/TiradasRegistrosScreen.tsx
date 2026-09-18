import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  Package,
  Share2,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Pencil,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { Order } from '../types';
import {
  formatCurrency,
  getWhatsAppUrl,
  formatBoliviaPhone,
  completeOrderBalanceInFirestore,
  formatArticleItem,
} from '../lib/storage';
import { ThermalPrintModal } from './ThermalPrintModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFinancialPrivacy } from '../contexts/FinancialPrivacyContext';
import { BalanceToggleBtn } from './BalanceToggleBtn';

interface TiradasRegistrosScreenProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onNewOrder: () => void;
  onToggleStatus: (orderId: string, e: React.MouseEvent) => void;
  onSwitchToVentas: () => void;
}

type TiradaPeriod = 'hoy' | 'ayer' | 'semana' | 'todas';

export const TiradasRegistrosScreen: React.FC<TiradasRegistrosScreenProps> = ({
  orders = [],
  onSelectOrder,
  onEditOrder,
  onNewOrder,
  onToggleStatus,
  onSwitchToVentas,
}) => {
  const { userProfile, role, isJefe, isSupervisor, isVendedor } = useAuth();
  const { isDark } = useTheme();
  const { showBalances, formatBalance } = useFinancialPrivacy();
  const [selectedPeriod, setSelectedPeriod] = useState<TiradaPeriod>('hoy');
  const [searchTerm, setSearchTerm] = useState('');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Group / Filter orders belonging to the selected Tirada period
  const tiradaOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      if (o.archivado) return false;
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;

      if (selectedPeriod === 'hoy') {
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }

      if (selectedPeriod === 'ayer') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return (
          d.getDate() === yesterday.getDate() &&
          d.getMonth() === yesterday.getMonth() &&
          d.getFullYear() === yesterday.getFullYear()
        );
      }

      if (selectedPeriod === 'semana') {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
        const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
        return d >= monday && d <= sunday;
      }

      return true; // 'todas'
    });
  }, [orders, selectedPeriod]);

  // Search filter inside the selected Tirada
  const filteredTiradaOrders = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return tiradaOrders;

    return tiradaOrders.filter((order) => {
      return (
        (order.cliente || '').toLowerCase().includes(term) ||
        (order.telefono || '').includes(term) ||
        String(order.orderNumber ?? '').includes(term) ||
        (order.lugarEntrega || '').toLowerCase().includes(term) ||
        (order.productos || []).some((p) => (p?.nombre || '').toLowerCase().includes(term))
      );
    });
  }, [tiradaOrders, searchTerm]);

  // Financial calculations for the selected Tirada (excluding Anulado)
  const validTiradaOrders = tiradaOrders.filter((o) => o.estado !== 'Anulado');
  const totalPedidosTirada = validTiradaOrders.length;
  const totalVendidoTirada = validTiradaOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCobradoTirada = validTiradaOrders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  const totalSaldoTirada = validTiradaOrders.reduce((sum, o) => sum + (o.saldo || 0), 0);

  // Generate WhatsApp summary of the Tirada
  const generateTiradaSummaryText = () => {
    const periodName =
      selectedPeriod === 'hoy'
        ? 'Tirada de Hoy (Sesión en Vivo)'
        : selectedPeriod === 'ayer'
        ? 'Tirada de Ayer'
        : selectedPeriod === 'semana'
        ? 'Tiradas de Esta Semana'
        : 'Resumen Global de Tiradas';

    let text = `🌸 *IMPORTADORA CHIQUIMINISOS - RESUMEN DE TIRADA* 🌸\n`;
    text += `📅 *Sesión:* ${periodName}\n`;
    text += `📦 *Total Pedidos:* ${totalPedidosTirada}\n`;
    text += `💰 *Total Ventas:* ${formatCurrency(totalVendidoTirada)}\n`;
    text += `💵 *Cobrado en Caja:* ${formatCurrency(totalCobradoTirada)}\n`;
    text += `⏳ *Saldo por Cobrar:* ${formatCurrency(totalSaldoTirada)}\n`;
    text += `------------------------------------\n`;
    text += `*DETALLE DE PEDIDOS EN ESTA TIRADA:*\n\n`;

    filteredTiradaOrders.forEach((o, index) => {
      const hora = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      text += `${index + 1}. *#${o.orderNumber}* - ${o.cliente} (${hora})\n`;
      text += `   • Items: ${(o.productos || []).map((p) => `${p.cantidad}x ${p.nombre}${p.variante ? ` (${p.variante})` : ''}`).join(', ')}\n`;
      text += `   • Total: ${formatCurrency(o.total)} | Pagado: ${formatCurrency(o.pagado)} | Saldo: ${formatCurrency(o.saldo)}\n`;
      text += `   • Estado: ${o.estado}\n\n`;
    });

    return text;
  };

  const handleCopySummary = async () => {
    const text = generateTiradaSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch (e) {
      console.warn('Could not copy to clipboard:', e);
    }
  };

  const handleShareWhatsApp = () => {
    const text = generateTiradaSummaryText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div id="tiradas-registros-screen" className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-5 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}
            >
              <span>Registros y Tiradas de Venta</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? 'text-[#FF6FA5] bg-[#FF6FA5]/10 border-[#FF6FA5]/30'
                  : 'text-[#1A2B5C] bg-[#E8DFC8]/60 border-[#E8DFC8]'
              }`}>
                ✨ Sesión en Vivo
              </span>
            </h1>
          </div>
          <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Módulo dedicado para registrar pedidos continuos por tirada sin mezclar con la búsqueda general
          </p>
        </div>

        {/* CTA: Nueva Venta en Tirada */}
        <button
          id="new-sale-tirada-btn"
          onClick={onNewOrder}
          className={`py-2.5 px-5 rounded-2xl font-black text-sm active:scale-95 shadow-lg flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer ${
            isDark
              ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25 border border-[#FF6FA5]/50'
              : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Registrar Pedido en esta Tirada</span>
        </button>
      </div>

      {/* Switcher Tab between Ventas (Buscar/Editar) and Tiradas */}
      <div className="flex items-center justify-between gap-2 p-1 rounded-2xl border bg-opacity-50 backdrop-blur-sm"
        style={{
          backgroundColor: isDark ? '#16234F' : '#F5EFE0',
          borderColor: isDark ? '#223368' : '#E8DFC8',
        }}
      >
        <button
          type="button"
          onClick={onSwitchToVentas}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Ir a Búsqueda y Edición de Ventas</span>
        </button>

        <button
          type="button"
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-sm transition ${
            isDark
              ? 'bg-[#FF6FA5] text-[#0F1B3C]'
              : 'bg-[#1A2B5C] text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tiradas y Registros de la Sesión</span>
        </button>
      </div>

      {/* Period Selector Tabs for Tirada */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'hoy', label: '🔴 Tirada de Hoy (En vivo)' },
            { id: 'ayer', label: 'Tirada de Ayer' },
            { id: 'semana', label: 'Esta Semana' },
            { id: 'todas', label: 'Todas las Tiradas' },
          ] as { id: TiradaPeriod; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedPeriod(item.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border cursor-pointer ${
              selectedPeriod === item.id
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C] border-[#FF6FA5]'
                  : 'bg-[#1A2B5C] text-white border-[#1A2B5C]'
                : isDark
                ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white border-[#223368]'
                : 'bg-white text-[#1A2B5C] hover:bg-[#F5EFE0] border-[#E8DFC8]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* KPI Cards of the active Tirada */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div
          className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368] text-white' : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
          }`}
        >
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`}>
            Pedidos de la Tirada
          </span>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif]">
            {totalPedidosTirada}
          </span>
          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            {selectedPeriod === 'hoy' ? 'Sesión en curso' : 'Total acumulado'}
          </span>
        </div>

        <div
          className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368] text-white' : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
          }`}
        >
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`}>
            Vendido en Tirada
          </span>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-emerald-500">
            {formatBalance(totalVendidoTirada)}
          </span>
          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Importe bruto
          </span>
        </div>

        <div
          className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368] text-white' : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
          }`}
        >
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`}>
            Cobrado / Anticipos
          </span>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-blue-500">
            {formatBalance(totalCobradoTirada)}
          </span>
          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            En caja o cuenta
          </span>
        </div>

        <div
          className={`border rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368] text-white' : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
          }`}
        >
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-0.5 ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`}>
            Saldo Pendiente
          </span>
          <span className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${
            totalSaldoTirada > 0 ? 'text-rose-500' : 'text-emerald-500'
          }`}>
            {formatBalance(totalSaldoTirada)}
          </span>
          <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Por liquidar
          </span>
        </div>
      </div>

      {/* Action Bar for Tirada: Search + Share Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`} />
          <input
            type="text"
            placeholder="Filtrar pedidos dentro de esta tirada..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium border transition-colors outline-none ${
              isDark
                ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9] focus:border-[#FF6FA5]'
                : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C] focus:border-[#1A2B5C]'
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className={`flex-1 sm:flex-none px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
              copiedSummary
                ? 'bg-emerald-500 text-white border-emerald-500'
                : isDark
                ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
            }`}
            title="Copiar resumen para WhatsApp o reporte"
          >
            {copiedSummary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-emerald-500" />}
            <span>{copiedSummary ? '¡Copiado!' : 'Copiar Resumen'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-[#25D366]/20 transition active:scale-95 cursor-pointer"
            title="Enviar resumen por WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir Tirada</span>
          </button>
        </div>
      </div>

      {/* Orders List for this Tirada */}
      <div className="space-y-3">
        {filteredTiradaOrders.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${
            isDark ? 'bg-[#16234F]/40 border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}>
            <Layers className="w-10 h-10 mx-auto text-[#FF6FA5] opacity-60 mb-2" />
            <h3 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
              No hay pedidos en esta tirada
            </h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              {searchTerm
                ? 'Ningún pedido de la tirada coincide con el filtro de búsqueda.'
                : 'Comienza una nueva tirada pulsando el botón "+ Registrar Pedido en esta Tirada".'}
            </p>
            <button
              type="button"
              onClick={onNewOrder}
              className={`mt-4 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#1A2B5C] text-white'
              }`}
            >
              + Nuevo Pedido de la Sesión
            </button>
          </div>
        ) : (
          filteredTiradaOrders.map((order, idx) => {
            const timeStr = new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const itemCount = (order.productos || []).reduce((s, p) => s + (p.cantidad || 1), 0);

            return (
              <div
                key={order.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] hover:border-[#FF6FA5]/40 text-white'
                    : 'bg-white border-[#E8DFC8] hover:border-[#1A2B5C]/30 text-[#1A2B5C]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-inherit">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#FF6FA5] to-rose-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                      #{order.orderNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base leading-tight">
                        {order.cliente || 'Cliente sin nombre'}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] opacity-75 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#FF6FA5]" />
                          {timeStr}
                        </span>
                        {order.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            {order.telefono}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges and Financials */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      <div className="font-black text-sm sm:text-base font-['Outfit',sans-serif]">
                        {formatBalance(order.total)}
                      </div>
                      <div className="text-[11px] font-bold">
                        {order.saldo > 0 ? (
                          <span className="text-rose-500">Saldo: {formatBalance(order.saldo)}</span>
                        ) : (
                          <span className="text-emerald-500">Pagado completo</span>
                        )}
                      </div>
                    </div>

                    <span
                      onClick={(e) => onToggleStatus(order.id, e)}
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer select-none ${
                        order.estado === 'Entregado'
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                          : order.estado === 'Anulado'
                          ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                      }`}
                      title="Cambiar estado"
                    >
                      {order.estado}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="pt-2 text-xs opacity-90 flex flex-wrap gap-1.5 items-center">
                  <span className="font-semibold opacity-70">{itemCount} items:</span>
                  {(order.productos || []).map((p, pIdx) => (
                    <span
                      key={p.id || pIdx}
                      className={`px-2 py-0.5 rounded-lg text-[11px] border ${
                        isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                      }`}
                    >
                      {p.cantidad}x {p.nombre} {p.variante ? `(${p.variante})` : ''}
                    </span>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="mt-3 pt-2.5 border-t border-inherit flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditOrder(order)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border transition cursor-pointer ${
                        isDark
                          ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-[#FF6FA5] border-[#223368]'
                          : 'bg-[#FBF7EF] hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
                      }`}
                      title="Editar venta directamente"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#FF6FA5]" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectOrder(order)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 border transition cursor-pointer ${
                        isDark
                          ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-white border-[#223368]'
                          : 'bg-[#FBF7EF] hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
                      }`}
                      title="Ver detalles completos"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalles</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPrintOrder(order)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        isDark
                          ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-[#9AA6C9] border-[#223368]'
                          : 'bg-[#FBF7EF] hover:bg-[#F5EFE0] text-[#78716C] border-[#E8DFC8]'
                      }`}
                      title="Imprimir ticket térmico"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {order.telefono && (
                      <a
                        href={getWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition"
                        title="Abrir WhatsApp con el cliente"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Thermal Print Modal */}
      {printOrder && (
        <ThermalPrintModal
          order={printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
};
