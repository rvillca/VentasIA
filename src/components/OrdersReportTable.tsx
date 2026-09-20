import React from 'react';
import {
  Phone,
  Eye,
  Pencil,
  Printer,
  Package,
  MessageCircle,
  CheckCircle2,
  DollarSign,
  MapPin,
  Lock,
} from 'lucide-react';
import { Order } from '../types';
import { getWhatsAppUrl } from '../lib/storage';
import { isOrderDeliveryLocked } from '../lib/orderSecurity';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFinancialPrivacy } from '../contexts/FinancialPrivacyContext';

interface OrdersReportTableProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onToggleStatus: (orderId: string, e: React.MouseEvent) => void;
  onPrintOrder: (order: Order) => void;
  onPrepOrder: (order: Order) => void;
  onQuickCompleteBalance: (order: Order, e: React.MouseEvent) => void;
  completingId: string | null;
  lastViewedOrderId?: string | null;
}

export const OrdersReportTable: React.FC<OrdersReportTableProps> = ({
  orders,
  onSelectOrder,
  onEditOrder,
  onToggleStatus,
  onPrintOrder,
  onPrepOrder,
  onQuickCompleteBalance,
  completingId,
  lastViewedOrderId,
}) => {
  const { role, isVendedor } = useAuth();
  const { isDark } = useTheme();
  const { formatBalance } = useFinancialPrivacy();
  const isVendedorRole = isVendedor || role === 'vendedor';

  return (
    <div
      id="orders-report-container"
      className={`border rounded-2xl overflow-hidden shadow-sm transition-colors ${
        isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
      }`}
    >
      {/* DESKTOP & TABLET: Tabla formato reporte compacto optimizado para uso rápido */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr
              className={`border-b text-[11px] font-black uppercase tracking-wider ${
                isDark
                  ? 'bg-[#0F1B3C]/95 text-[#9AA6C9] border-[#223368]'
                  : 'bg-[#FBF7EF] text-[#78716C] border-[#E8DFC8]'
              }`}
            >
              <th className="py-3 px-3.5 whitespace-nowrap"># Pedido</th>
              <th className="py-3 px-3 whitespace-nowrap">Fecha y Hora</th>
              <th className="py-3 px-3">Cliente</th>
              <th className="py-3 px-3 whitespace-nowrap">Total</th>
              <th className="py-3 px-3 whitespace-nowrap">Saldo / Cobro</th>
              <th className="py-3 px-3 text-center whitespace-nowrap">Estado</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap">Acciones Rápidas</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-[#223368]' : 'divide-[#E8DFC8]'}`}>
            {orders.map((order) => {
              const isDelivered = order.estado === 'Entregado';
              const isAnulado = order.estado === 'Anulado';
              const hasPendingBalance = order.saldo > 0 && !isAnulado;
              const isHighlighted = lastViewedOrderId === order.id;

              const orderDateObj = new Date(order.createdAt);
              const formattedDateStr = !isNaN(orderDateObj.getTime())
                ? orderDateObj.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) +
                  ' · ' +
                  orderDateObj.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <tr
                  key={order.id}
                  id={`order-row-${order.id}`}
                  onClick={() => onSelectOrder(order)}
                  className={`transition-colors cursor-pointer group ${
                    isHighlighted
                      ? isDark
                        ? 'bg-[#FF6FA5]/20 ring-2 ring-[#FF6FA5]'
                        : 'bg-amber-100/70 ring-2 ring-[#1A2B5C]'
                      : isAnulado
                      ? isDark
                        ? 'bg-rose-950/20 text-rose-300 opacity-70'
                        : 'bg-rose-50/40 text-rose-800 opacity-70'
                      : isDark
                      ? 'hover:bg-[#1E2D5A] text-white'
                      : 'hover:bg-[#F5EFE0] text-[#1A2B5C]'
                  }`}
                >
                  {/* # Pedido */}
                  <td className="py-2.5 px-3.5 font-mono font-black whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-lg border text-[11px] inline-block ${
                        isDark
                          ? 'bg-[#0F1B3C] text-[#FF6FA5] border-[#223368]'
                          : 'bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
                      }`}
                    >
                      #{String(order.orderNumber).padStart(3, '0')}
                    </span>
                  </td>

                  {/* Fecha y Hora */}
                  <td className="py-2.5 px-3 whitespace-nowrap text-[11px] opacity-80 font-medium">
                    {formattedDateStr}
                  </td>

                  {/* Cliente */}
                  <td className="py-2.5 px-3">
                    <div className="font-bold font-['Outfit',sans-serif] group-hover:text-[#FF6FA5] transition-colors leading-tight text-xs sm:text-sm">
                      {order.cliente || 'Cliente sin nombre'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {order.telefono && (
                        <span className="text-[11px] opacity-75 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-[#FF6FA5]" />
                          <span>{order.telefono}</span>
                        </span>
                      )}
                      {order.lugarEntrega && (
                        <span
                          className="text-[10px] opacity-65 flex items-center gap-0.5 truncate max-w-[170px]"
                          title={order.lugarEntrega}
                        >
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{order.lugarEntrega}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="py-2.5 px-3 font-black whitespace-nowrap font-['Outfit',sans-serif] text-sm">
                    {formatBalance(order.total)}
                  </td>

                  {/* Saldo / Cobro Rápido */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {isAnulado ? (
                      <span className="text-[11px] text-rose-500 line-through">Anulado</span>
                    ) : hasPendingBalance ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                            isDark
                              ? 'bg-amber-950/60 text-[#FFA26B] border-amber-800/40'
                              : 'bg-amber-50 text-[#C2410C] border-amber-200'
                          }`}
                        >
                          Saldo: {formatBalance(order.saldo)}
                        </span>
                        {!isVendedorRole && (
                          <button
                            type="button"
                            disabled={completingId === order.id}
                            onClick={(e) => onQuickCompleteBalance(order, e)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition active:scale-95 shadow-sm cursor-pointer flex items-center gap-1"
                            title="Completar saldo en 1 clic (marcar como pagado)"
                          >
                            <DollarSign className="w-3 h-3 stroke-[3]" />
                            <span>{completingId === order.id ? '...' : 'Cobrar'}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${
                          isDark
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Pagado</span>
                      </span>
                    )}
                  </td>

                  {/* Estado (Interactivo) */}
                  <td
                    className="py-2.5 px-3 text-center whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isAnulado ? (
                      <span className="text-[10px] font-bold text-rose-500 uppercase px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40">
                        Anulado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => onToggleStatus(order.id, e)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition active:scale-95 shadow-sm cursor-pointer ${
                          isDelivered
                            ? isDark
                              ? 'bg-[#4FD1B5]/25 text-[#4FD1B5] border border-[#4FD1B5]/50 hover:bg-[#4FD1B5]/35'
                              : 'bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100'
                            : isDark
                            ? 'bg-purple-950/50 text-purple-300 border border-purple-800/50 hover:bg-purple-900/50'
                            : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                        }`}
                        title="Toca para cambiar estado entre Abierto y Entregado"
                      >
                        {isDelivered ? (
                          <span className="flex items-center gap-1">
                            {isOrderDeliveryLocked(order) && <Lock className="w-2.5 h-2.5 text-rose-500" />}
                            <span>✓ Entregado</span>
                          </span>
                        ) : (
                          '⏳ Abierto'
                        )}
                      </button>
                    )}
                  </td>

                  {/* Acciones Rápidas (Optimizadas para uso rápido) */}
                  <td
                    className="py-2.5 px-3.5 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Botón Ver Detalle */}
                      <button
                        type="button"
                        id={`btn-view-${order.id}`}
                        onClick={() => onSelectOrder(order)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border flex items-center gap-1.5 shadow-sm ${
                          isDark
                            ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] border-[#FF6FA5]'
                            : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white border-[#1A2B5C]'
                        }`}
                        title="Ver detalle completo como tarjeta"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>

                      {/* Botón Editar */}
                      <button
                        type="button"
                        id={`btn-edit-${order.id}`}
                        onClick={() => {
                          if (onEditOrder) onEditOrder(order);
                          else onSelectOrder(order);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border flex items-center gap-1.5 shadow-sm ${
                          isDark
                            ? 'bg-[#1E2D5A] hover:bg-[#283C75] text-[#FFA26B] border-amber-800/40'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                        }`}
                        title="Editar venta rápidamente"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-500" />
                        <span>Editar</span>
                      </button>

                      {/* Botón Ticket Térmico */}
                      <button
                        type="button"
                        id={`btn-ticket-${order.id}`}
                        onClick={() => onPrintOrder(order)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border flex items-center gap-1 shadow-sm ${
                          isDark
                            ? 'bg-[#0F1B3C] hover:bg-[#16234F] text-sky-300 border-sky-800/40'
                            : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
                        }`}
                        title="Imprimir ticket térmico"
                      >
                        <Printer className="w-3.5 h-3.5 text-sky-500" />
                        <span className="hidden lg:inline">Ticket</span>
                      </button>

                      {/* Botón WhatsApp Listado */}
                      <a
                        id={`btn-wa-${order.id}`}
                        href={getWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm bg-[#25D366] hover:bg-[#20bd5a] text-white"
                        title="Enviar listado de productos y cobro por WhatsApp al cliente"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden lg:inline">Listado</span>
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE: Formato de uso rápido con botones táctiles grandes */}
      <div className="md:hidden divide-y divide-[#E8DFC8] dark:divide-[#223368]">
        {orders.map((order) => {
          const isDelivered = order.estado === 'Entregado';
          const isAnulado = order.estado === 'Anulado';
          const hasPendingBalance = order.saldo > 0 && !isAnulado;
          const isHighlighted = lastViewedOrderId === order.id;

          const orderDateObj = new Date(order.createdAt);
          const formattedDateStr = !isNaN(orderDateObj.getTime())
            ? orderDateObj.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) +
              ' · ' +
              orderDateObj.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
            : '';

          return (
            <div
              key={order.id}
              id={`order-row-mobile-${order.id}`}
              onClick={() => onSelectOrder(order)}
              className={`p-3.5 transition-colors cursor-pointer active:bg-black/5 space-y-2.5 ${
                isHighlighted
                  ? isDark
                    ? 'bg-[#FF6FA5]/20 ring-2 ring-[#FF6FA5]'
                    : 'bg-amber-100/70 ring-2 ring-[#1A2B5C]'
                  : isAnulado
                  ? isDark
                    ? 'bg-rose-950/20 opacity-70'
                    : 'bg-rose-50/40 opacity-70'
                  : isDark
                  ? 'hover:bg-[#1E2D5A]'
                  : 'hover:bg-[#F5EFE0]'
              }`}
            >
              {/* Línea 1: #, Cliente, Total y Estado */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                      isDark
                        ? 'bg-[#0F1B3C] text-[#FF6FA5] border-[#223368]'
                        : 'bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
                    }`}
                  >
                    #{String(order.orderNumber).padStart(3, '0')}
                  </span>
                  <span
                    className={`font-bold text-sm truncate ${
                      isDark ? 'text-white' : 'text-[#1A2B5C]'
                    }`}
                  >
                    {order.cliente || 'Cliente sin nombre'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm font-black font-['Outfit',sans-serif] ${
                      isDark ? 'text-white' : 'text-[#1A2B5C]'
                    }`}
                  >
                    {formatBalance(order.total)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      isAnulado
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200'
                        : isDelivered
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200'
                    }`}
                  >
                    {isDelivered && isOrderDeliveryLocked(order) && <Lock className="w-2.5 h-2.5 text-rose-500" />}
                    <span>{isAnulado ? 'Anulado' : isDelivered ? 'Entregado' : 'Abierto'}</span>
                  </span>
                </div>
              </div>

              {/* Línea 2: Fecha/Hora, Teléfono y Saldo */}
              <div className="flex items-center justify-between gap-2 text-xs opacity-80">
                <div className="flex items-center gap-2 truncate">
                  <span>{formattedDateStr}</span>
                  {order.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-[#FF6FA5]" />
                      <span>{order.telefono}</span>
                    </span>
                  )}
                </div>
                {hasPendingBalance && (
                  <span className="font-bold text-amber-600 dark:text-[#FFA26B] shrink-0">
                    Saldo: {formatBalance(order.saldo)}
                  </span>
                )}
              </div>

              {/* Línea 3: Barra de Acciones de Uso Rápido (Táctil y Directo) */}
              <div
                className="flex items-center gap-1.5 pt-1 overflow-x-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botón Ver Detalle */}
                <button
                  type="button"
                  onClick={() => onSelectOrder(order)}
                  className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer ${
                    isDark
                      ? 'bg-[#FF6FA5] text-[#0F1B3C] border-[#FF6FA5]'
                      : 'bg-[#1A2B5C] text-white border-[#1A2B5C]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver</span>
                </button>

                {/* Botón Editar */}
                <button
                  type="button"
                  onClick={() => {
                    if (onEditOrder) onEditOrder(order);
                    else onSelectOrder(order);
                  }}
                  className={`flex-1 min-w-[75px] py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer ${
                    isDark
                      ? 'bg-[#1E2D5A] text-[#FFA26B] border-amber-800/40'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-500" />
                  <span>Editar</span>
                </button>

                {/* Botón Ticket */}
                <button
                  type="button"
                  onClick={() => onPrintOrder(order)}
                  className={`flex-1 min-w-[75px] py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer ${
                    isDark
                      ? 'bg-[#0F1B3C] text-sky-300 border-sky-800/40'
                      : 'bg-sky-50 text-sky-800 border-sky-200'
                  }`}
                  title="Ticket"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-500" />
                  <span>Ticket</span>
                </button>

                {/* Botón WhatsApp Listado */}
                <a
                  href={getWhatsAppUrl(order)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[85px] py-2 px-2 rounded-xl text-xs font-black border flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer bg-[#25D366] hover:bg-[#20bd5a] text-white border-[#20bd5a]"
                  title="Enviar listado por WhatsApp al cliente"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>Listado WA</span>
                </a>

                {/* Botón Cobrar (si tiene saldo) */}
                {hasPendingBalance && !isVendedorRole && (
                  <button
                    type="button"
                    disabled={completingId === order.id}
                    onClick={(e) => onQuickCompleteBalance(order, e)}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    title="Cobrar saldo total en 1 clic"
                  >
                    <DollarSign className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{completingId === order.id ? '...' : 'Cobrar'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
