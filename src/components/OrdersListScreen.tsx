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
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { formatCurrency, getWhatsAppUrl } from '../lib/storage';
import { ThermalPrintModal } from './ThermalPrintModal';
import { useAuth } from '../contexts/AuthContext';

interface OrdersListScreenProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onNewOrder: () => void;
  onToggleStatus: (orderId: string, e: React.MouseEvent) => void;
}

type FilterType = 'all' | 'Abierto' | 'Entregado' | 'with_balance' | 'Anulado';

export const OrdersListScreen: React.FC<OrdersListScreenProps> = ({
  orders = [],
  onSelectOrder,
  onNewOrder,
  onToggleStatus,
}) => {
  const { userProfile, role, isJefe, isSupervisor } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // Financial summary counters (excluding Anulados)
  const validOrders = orders.filter((o) => o.estado !== 'Anulado');
  const totalOrders = orders.length;
  const openOrders = orders.filter((o) => o.estado === 'Abierto').length;
  const deliveredOrders = orders.filter((o) => o.estado === 'Entregado').length;
  const canceledOrders = orders.filter((o) => o.estado === 'Anulado').length;

  const totalVendido = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCobrado = validOrders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  const totalPorCobrar = validOrders.reduce((sum, o) => sum + (o.saldo || 0), 0);

  // Filtered orders calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
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
  }, [orders, searchTerm, filter]);

  return (
    <>
      <div id="orders-list-screen" className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-5">
        {/* Top Header & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight">
              Ventas y Pedidos TikTok Live
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Registros sincronizados en tiempo real en la base de datos
            </p>
          </div>

          <button
            id="create-order-top-btn"
            onClick={onNewOrder}
            className="py-3 px-5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 active:scale-95 shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Venta</span>
          </button>
        </div>

        {/* Live Business Balance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* Total Vendido */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-md">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Total Ventas Activas
            </span>
            <span className="text-lg sm:text-xl font-black text-white font-['Outfit',sans-serif]">
              {formatCurrency(totalVendido)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {validOrders.length} pedidos
            </span>
          </div>

          {/* Total Cobrado */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-md">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
              Cobrado en Caja
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-300 font-['Outfit',sans-serif]">
              {formatCurrency(totalCobrado)}
            </span>
            <span className="text-[10px] text-emerald-500/80 block mt-0.5">
              QR / Efectivo recibido
            </span>
          </div>

          {/* Total Por Cobrar (Saldos) */}
          <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-md">
            <span className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider block mb-0.5">
              Por Cobrar (Saldos)
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-300 font-['Outfit',sans-serif]">
              {formatCurrency(totalPorCobrar)}
            </span>
            <span className="text-[10px] text-amber-500/80 block mt-0.5">
              Pendientes de cobro
            </span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-lg space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-orders-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, teléfono, vendedor, producto o # pedido..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({totalOrders})
            </button>

            <button
              onClick={() => setFilter('Abierto')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'Abierto'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Abiertos ({openOrders})
            </button>

            <button
              onClick={() => setFilter('Entregado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'Entregado'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Entregados ({deliveredOrders})
            </button>

            <button
              onClick={() => setFilter('with_balance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === 'with_balance'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Con Saldo ({orders.filter((o) => o.saldo > 0 && o.estado !== 'Anulado').length})
            </button>

            {canceledOrders > 0 && (
              <button
                onClick={() => setFilter('Anulado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === 'Anulado'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-800 text-rose-400 hover:text-rose-200'
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
              className="text-center py-12 px-4 bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-950 border border-blue-800/60 flex items-center justify-center mx-auto text-cyan-400">
                <Package className="w-8 h-8" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                  No se encontraron ventas
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {searchTerm || filter !== 'all'
                    ? 'Prueba modificando la búsqueda o el filtro seleccionado.'
                    : 'Crea tu primera venta con los artículos y cotización en Bs.'}
                </p>
              </div>
              <button
                id="empty-new-order-btn"
                onClick={onNewOrder}
                className="py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 shadow-lg shadow-purple-900/30 inline-flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nueva Venta</span>
              </button>
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

              return (
                <div
                  key={order.id}
                  id={`order-card-${order.id}`}
                  onClick={() => onSelectOrder(order)}
                  className={`group relative border rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                    isAnulado
                      ? 'bg-slate-950/70 border-rose-900/50 opacity-75'
                      : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    {/* Order Number & Customer Name */}
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-black text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                        #{String(order.orderNumber).padStart(3, '0')}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors font-['Outfit',sans-serif]">
                            {order.cliente || 'Cliente sin nombre'}
                          </h3>
                          {order.vendedorNombre && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                              <User className="w-3 h-3 text-cyan-400" />
                              {order.vendedorNombre}
                            </span>
                          )}
                        </div>
                        {order.telefono && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{order.telefono}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isAnulado ? (
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-950 border border-rose-600/40 text-rose-300 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Anulado</span>
                        </span>
                      ) : (
                        <button
                          id={`toggle-status-${order.id}`}
                          onClick={(e) => onToggleStatus(order.id, e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            isDelivered
                              ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                              : 'bg-blue-950 border border-blue-500/40 text-blue-300 hover:bg-blue-900'
                          }`}
                          title="Toca para cambiar estado"
                        >
                          {isDelivered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Entregado</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                              <span>Abierto</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Products Preview Chips */}
                  <div className="bg-slate-950/60 rounded-xl p-2.5 mb-3 border border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mb-1">
                      <Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="font-semibold text-slate-200">
                        {itemsCount} {itemsCount === 1 ? 'artículo' : 'artículos'}:
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {order.productos
                        .map((p) => `${p.cantidad}x ${p.nombre}${p.variante ? ` (${p.variante})` : ''}`)
                        .join(', ')}
                    </p>
                    {order.lugarEntrega && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-900">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{order.lugarEntrega}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Badges & Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500">
                          Total
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-white">
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      <div className="h-6 w-px bg-slate-800" />

                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500">
                          Saldo
                        </span>
                        <span
                          className={`text-sm sm:text-base font-extrabold ${
                            isAnulado
                              ? 'text-slate-500 line-through'
                              : hasPendingBalance
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {isAnulado
                            ? 'Anulado'
                            : hasPendingBalance
                            ? formatCurrency(order.saldo)
                            : 'Bs. 0 (Pagado)'}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Print Ticket & WhatsApp */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintOrder(order);
                        }}
                        className="p-2 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-500/30 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Imprimir / Reimprimir ticket térmico"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-300" />
                        <span className="hidden sm:inline">Ticket</span>
                      </button>

                      <a
                        href={getWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Enviar comprobante por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      <div className="p-1.5 text-slate-500 group-hover:text-cyan-400 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Direct Thermal Print Modal from List */}
      {printOrder && (
        <ThermalPrintModal
          order={printOrder}
          isOpen={!!printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </>
  );
};
