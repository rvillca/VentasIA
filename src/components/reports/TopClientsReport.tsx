import React, { useState, useMemo } from 'react';
import {
  Crown,
  Gift,
  Trophy,
  Medal,
  Users,
  Search,
  Filter,
  Download,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import { Order } from '../../types';
import {
  formatCurrency,
  formatBoliviaPhone,
  formatBoliviaWhatsAppDigits,
  formatArticleItem,
} from '../../lib/storage';
import { useFinancialPrivacy } from '../../contexts/FinancialPrivacyContext';
import { ClientDetailModal } from './ClientDetailModal';

export interface TopClientData {
  clientKey: string;
  nombre: string;
  telefono: string;
  totalComprado: number;
  totalPagado: number;
  totalSaldo: number;
  cantidadPedidos: number;
  ticketPromedio: number;
  primerPedidoFecha: string;
  ultimoPedidoFecha: string;
  ultimoPedidoTexto: string;
  diasDesdeUltimoPedido: number;
  destinos: { destino: string; count: number }[];
  destinoPrincipal: string;
  productosComprados: { nombre: string; cantidad: number; totalBs: number }[];
  pedidos: Order[];
  tier: 'mayorista_vip' | 'frecuente' | 'regular';
  isGiftCandidate: boolean;
  isWholesalerCandidate: boolean;
}

export type ClientDateFilterMode =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | '7days'
  | 'this_month'
  | 'last_month'
  | 'specific_day'
  | 'specific_month'
  | 'all';

export type ClientSortOption = 'monto' | 'pedidos' | 'ticket' | 'reciente';
export type ClientSegmentFilter = 'all' | 'mayorista' | 'regalos' | 'recurrentes' | 'con_saldo';

interface TopClientsReportProps {
  orders: Order[];
  onSelectOrder?: (orderId: string) => void;
}

export const TopClientsReport: React.FC<TopClientsReportProps> = ({ orders }) => {
  const { formatBalance, toggleShowBalances } = useFinancialPrivacy();

  // Filter & State
  const [dateMode, setDateMode] = useState<ClientDateFilterMode>('this_week');
  const [customDay, setCustomDay] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [customMonth, setCustomMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [segmentFilter, setSegmentFilter] = useState<ClientSegmentFilter>('all');
  const [sortBy, setSortBy] = useState<ClientSortOption>('monto');
  const [selectedClientForModal, setSelectedClientForModal] = useState<TopClientData | null>(null);

  // Available months from orders for month-picker dropdown
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (!isNaN(d.getTime())) {
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        set.add(ym);
      }
    });
    // Ensure current month is included
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(set).sort().reverse();
  }, [orders]);

  // Filter orders by chosen date filter
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      if (order.estado === 'Anulado') return false; // Exclude canceled orders from client totals
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return false;

      if (dateMode === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }

      if (dateMode === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return orderDate.toDateString() === yesterday.toDateString();
      }

      if (dateMode === 'this_week') {
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

      if (dateMode === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= past7;
      }

      if (dateMode === 'this_month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }

      if (dateMode === 'last_month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          orderDate.getMonth() === lastMonthDate.getMonth() &&
          orderDate.getFullYear() === lastMonthDate.getFullYear()
        );
      }

      if (dateMode === 'specific_day' && customDay) {
        const target = new Date(customDay + 'T00:00:00');
        return orderDate.toDateString() === target.toDateString();
      }

      if (dateMode === 'specific_month' && customMonth) {
        const [yearStr, monthStr] = customMonth.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10) - 1;
        return orderDate.getFullYear() === y && orderDate.getMonth() === m;
      }

      // 'all'
      return true;
    });
  }, [orders, dateMode, customDay, customMonth]);

  // Aggregate and rank clients
  const rankedClients = useMemo<TopClientData[]>(() => {
    const map = new Map<string, {
      nombre: string;
      telefono: string;
      totalComprado: number;
      totalPagado: number;
      totalSaldo: number;
      pedidos: Order[];
      destinosCount: Record<string, number>;
      productosCount: Record<string, { cantidad: number; totalBs: number }>;
    }>();

    filteredOrders.forEach((o) => {
      // Clean phone or fallback to normalized name
      const phoneDigits = (o.telefono || '').replace(/\D/g, '');
      const clientKey = phoneDigits.length >= 7
        ? phoneDigits
        : (o.cliente || 'Cliente sin nombre').trim().toLowerCase();

      if (!map.has(clientKey)) {
        map.set(clientKey, {
          nombre: (o.cliente || 'Sin nombre').trim(),
          telefono: o.telefono || '',
          totalComprado: 0,
          totalPagado: 0,
          totalSaldo: 0,
          pedidos: [],
          destinosCount: {},
          productosCount: {},
        });
      }

      const client = map.get(clientKey)!;
      // Prefer most complete name
      if ((o.cliente || '').trim().length > client.nombre.length) {
        client.nombre = o.cliente.trim();
      }
      if (o.telefono && o.telefono.length > client.telefono.length) {
        client.telefono = o.telefono;
      }

      client.totalComprado += o.total || 0;
      client.totalPagado += o.pagado || 0;
      client.totalSaldo += o.saldo || 0;
      client.pedidos.push(o);

      if (o.lugarEntrega && o.lugarEntrega.trim()) {
        const place = o.lugarEntrega.trim();
        client.destinosCount[place] = (client.destinosCount[place] || 0) + 1;
      }

      (o.productos || []).forEach((p) => {
        const pName = p.nombre?.trim() || 'Artículo';
        if (!client.productosCount[pName]) {
          client.productosCount[pName] = { cantidad: 0, totalBs: 0 };
        }
        client.productosCount[pName].cantidad += p.cantidad || 1;
        client.productosCount[pName].totalBs += (p.cantidad || 1) * (p.precioUnitario || 0);
      });
    });

    const now = new Date();

    const list: TopClientData[] = Array.from(map.entries()).map(([key, data]) => {
      // Sort orders by date descending
      data.pedidos.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const primerPedidoFecha = data.pedidos[data.pedidos.length - 1]?.createdAt || '';
      const ultimoPedido = data.pedidos[0];
      const ultimoPedidoFecha = ultimoPedido?.createdAt || '';

      const lastDate = new Date(ultimoPedidoFecha);
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      let ultimoPedidoTexto = 'Hoy';
      if (diffDays === 0) ultimoPedidoTexto = 'Hoy';
      else if (diffDays === 1) ultimoPedidoTexto = 'Ayer';
      else if (diffDays > 1 && diffDays < 30) ultimoPedidoTexto = `Hace ${diffDays} días`;
      else if (diffDays >= 30) {
        ultimoPedidoTexto = lastDate.toLocaleDateString('es-BO', {
          day: '2-digit',
          month: 'short',
        });
      }

      // Destinations breakdown
      const destinos = Object.entries(data.destinosCount)
        .map(([destino, count]) => ({ destino, count }))
        .sort((a, b) => b.count - a.count);
      const destinoPrincipal = destinos[0]?.destino || '';

      // Products breakdown
      const productosComprados = Object.entries(data.productosCount)
        .map(([nombre, stats]) => ({
          nombre,
          cantidad: stats.cantidad,
          totalBs: stats.totalBs,
        }))
        .sort((a, b) => b.cantidad - a.cantidad);

      const cantidadPedidos = data.pedidos.length;
      const ticketPromedio = cantidadPedidos > 0 ? data.totalComprado / cantidadPedidos : 0;

      // Classification
      const isWholesalerCandidate = data.totalComprado >= 1000 || cantidadPedidos >= 4;
      const isGiftCandidate = data.totalComprado >= 350 || cantidadPedidos >= 2;

      let tier: 'mayorista_vip' | 'frecuente' | 'regular' = 'regular';
      if (isWholesalerCandidate) {
        tier = 'mayorista_vip';
      } else if (isGiftCandidate) {
        tier = 'frecuente';
      }

      return {
        clientKey: key,
        nombre: data.nombre,
        telefono: data.telefono,
        totalComprado: data.totalComprado,
        totalPagado: data.totalPagado,
        totalSaldo: data.totalSaldo,
        cantidadPedidos,
        ticketPromedio,
        primerPedidoFecha,
        ultimoPedidoFecha,
        ultimoPedidoTexto,
        diasDesdeUltimoPedido: diffDays,
        destinos,
        destinoPrincipal,
        productosComprados,
        pedidos: data.pedidos,
        tier,
        isGiftCandidate,
        isWholesalerCandidate,
      };
    });

    // Default sort by total purchased descending
    return list.sort((a, b) => b.totalComprado - a.totalComprado);
  }, [filteredOrders]);

  // Apply Search, Segment, and Sort filters
  const displayedClients = useMemo(() => {
    let result = [...rankedClients];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => {
        return (
          c.nombre.toLowerCase().includes(term) ||
          c.telefono.includes(term) ||
          c.destinoPrincipal.toLowerCase().includes(term)
        );
      });
    }

    // Segment filter
    if (segmentFilter === 'mayorista') {
      result = result.filter((c) => c.isWholesalerCandidate);
    } else if (segmentFilter === 'regalos') {
      result = result.filter((c) => c.isGiftCandidate);
    } else if (segmentFilter === 'recurrentes') {
      result = result.filter((c) => c.cantidadPedidos >= 2);
    } else if (segmentFilter === 'con_saldo') {
      result = result.filter((c) => c.totalSaldo > 0);
    }

    // Sort
    if (sortBy === 'monto') {
      result.sort((a, b) => b.totalComprado - a.totalComprado);
    } else if (sortBy === 'pedidos') {
      result.sort((a, b) => b.cantidadPedidos - a.cantidadPedidos || b.totalComprado - a.totalComprado);
    } else if (sortBy === 'ticket') {
      result.sort((a, b) => b.ticketPromedio - a.ticketPromedio);
    } else if (sortBy === 'reciente') {
      result.sort(
        (a, b) =>
          new Date(b.ultimoPedidoFecha).getTime() - new Date(a.ultimoPedidoFecha).getTime()
      );
    }

    return result;
  }, [rankedClients, searchTerm, segmentFilter, sortBy]);

  // Top 3 Podium clients
  const podiumTop3 = useMemo(() => {
    return rankedClients.slice(0, 3);
  }, [rankedClients]);

  // Overall Statistics for KPI Cards
  const stats = useMemo(() => {
    const totalClientes = rankedClients.length;
    const totalVentasBs = rankedClients.reduce((sum, c) => sum + c.totalComprado, 0);
    const totalMayoristas = rankedClients.filter((c) => c.isWholesalerCandidate).length;
    const totalCandidatosRegalo = rankedClients.filter((c) => c.isGiftCandidate).length;
    const topClient = rankedClients[0] || null;

    return {
      totalClientes,
      totalVentasBs,
      totalMayoristas,
      totalCandidatosRegalo,
      topClient,
    };
  }, [rankedClients]);

  // WhatsApp generator helpers
  const handleSendGiftWhatsApp = (client: TopClientData) => {
    const cleanPhone = formatBoliviaWhatsAppDigits(client.telefono);
    const text = encodeURIComponent(
      `¡Hola ${client.nombre}! ✨ Te saludamos con mucho aprecio de *Importadora Chiquiminisos* 🎒\n\n` +
      `Queremos agradecerte de todo corazón por tu confianza continua. En este periodo has realizado ${client.cantidadPedidos} ${client.cantidadPedidos === 1 ? 'pedido' : 'pedidos'} con nosotros y te has ganado un lugar de honor entre nuestros *MEJORES CLIENTES* 🌟\n\n` +
      `🎁 Por tu lealtad y preferencia, ¡tenemos un *REGALO ESPECIAL DE FIDELIDAD* reservado exclusivamente para ti en tu siguiente compra o envío!\n\n` +
      `Por favor respóndenos a este mensaje para coordinar la entrega de tu detalle. ¡Muchas gracias por ser parte de nuestra comunidad! 🇧🇴💖`
    );
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleSendWholesalerInviteWhatsApp = (client: TopClientData) => {
    const cleanPhone = formatBoliviaWhatsAppDigits(client.telefono);
    const text = encodeURIComponent(
      `¡Estimad@ ${client.nombre}! 👑 Te saludamos de la administración de *Importadora Chiquiminisos*.\n\n` +
      `Debido a tu volumen de compras preferencial y excelente trayectoria comercial con nosotros, queremos invitarte de manera formal y exclusiva a nuestra **COMUNIDAD MAYORISTA VIP** 🌟\n\n` +
      `Beneficios exclusivos para miembros del grupo:\n` +
      `▫️ Acceso directo a precios mayoristas y lotes de importación.\n` +
      `▫️ Novedades y catálogos en primicia antes que en redes.\n` +
      `▫️ Atención prioritaria en preparación y despacho de paquetes.\n` +
      `▫️ Bonificaciones y regalos por volumen de compras.\n\n` +
      `¿Nos permites agregarte a este grupo exclusivo de mayoristas? Quedamos a tu confirmación. ¡Será un verdadero placer tenerte en la comunidad VIP! 🤝📦`
    );
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Export ranking to CSV
  const handleExportClientsCSV = () => {
    let csv = 'Ranking,Cliente,Telefono,Total_Comprado_Bs,Pagado_Bs,Saldo_Bs,Cantidad_Pedidos,Ticket_Promedio_Bs,Destino_Principal,Ultima_Compra,Categoria_VIP,Candidato_Regalo,Candidato_Mayorista\n';
    displayedClients.forEach((c, idx) => {
      const cat = c.tier === 'mayorista_vip' ? 'Mayorista VIP' : c.tier === 'frecuente' ? 'Cliente Frecuente' : 'Comprador Regular';
      const reg = c.isGiftCandidate ? 'SI' : 'NO';
      const may = c.isWholesalerCandidate ? 'SI' : 'NO';
      csv += `"${idx + 1}","${c.nombre.replace(/"/g, '""')}","${c.telefono}",${c.totalComprado},${c.totalPagado},${c.totalSaldo},${c.cantidadPedidos},${c.ticketPromedio.toFixed(2)},"${c.destinoPrincipal.replace(/"/g, '""')}","${c.ultimoPedidoTexto}","${cat}","${reg}","${may}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ranking_mejores_clientes_${dateMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Human-readable date label
  const dateLabel = useMemo(() => {
    if (dateMode === 'today') return 'Hoy (Día)';
    if (dateMode === 'yesterday') return 'Ayer';
    if (dateMode === 'this_week') return 'Esta Semana (Lunes a Hoy)';
    if (dateMode === '7days') return 'Últimos 7 días';
    if (dateMode === 'this_month') return 'Este Mes';
    if (dateMode === 'last_month') return 'Mes Anterior';
    if (dateMode === 'specific_day') return `Día: ${customDay}`;
    if (dateMode === 'specific_month') return `Mes: ${customMonth}`;
    return 'Histórico Total';
  }, [dateMode, customDay, customMonth]);

  return (
    <div id="top-clients-report-container" className="space-y-6 animate-in fade-in">
      {/* Intro and Purpose Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#1A2B5C] via-[#243B7A] to-[#1A2B5C] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-stone-900 flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3" /> Programa de Clientes Estrella & Fidelización
            </span>
            <span className="text-xs text-white/80 font-medium">
              Periodo: <strong className="text-amber-300">{dateLabel}</strong>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif] text-white">
            Ranking de Clientes con Mayor Volumen de Compra
          </h2>
          <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
            Identifica a tus mejores compradores por día, mes o histórico para entregarles
            regalos de agradecimiento e invitarlos de forma exclusiva a tu grupo de mayoristas VIP.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportClientsCSV}
            className="py-2.5 px-4 rounded-xl font-bold text-xs active:scale-95 shadow-sm flex items-center gap-2 transition cursor-pointer bg-white hover:bg-[#F5EFE0] text-[#1A2B5C]"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Ranking (CSV)</span>
          </button>
        </div>
      </div>

      {/* Date & Time Granular Filters */}
      <div className="border rounded-2xl p-4 bg-white border-[#E8DFC8] shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#1A2B5C] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#1A2B5C]" />
            Seleccionar Periodo de Análisis (Día, Mes o Rango):
          </span>
          <span className="text-xs text-[#78716C]">
            {rankedClients.length} {rankedClients.length === 1 ? 'cliente con compras' : 'clientes con compras'} en este periodo
          </span>
        </div>

        {/* Quick Presets by Days, Weeks and Months */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Por Días */}
          <div className="flex items-center gap-1 bg-[#FBF7EF] p-1 rounded-xl border border-[#E8DFC8]">
            <span className="text-[10px] font-black uppercase text-[#78716C] px-1.5">
              Días:
            </span>
            <button
              type="button"
              onClick={() => setDateMode('today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateMode === 'today'
                  ? 'bg-[#1A2B5C] text-white font-black shadow-xs'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setDateMode('yesterday')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateMode === 'yesterday'
                  ? 'bg-[#1A2B5C] text-white font-black shadow-xs'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => setDateMode('specific_day')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateMode === 'specific_day'
                  ? 'bg-[#1A2B5C] text-white font-black shadow-xs'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              📅 Día específico
            </button>
          </div>

          {/* Por Semanas */}
          <div className="flex items-center gap-1 bg-[#FBF7EF] p-1 rounded-xl border border-[#E8DFC8]">
            <span className="text-[10px] font-black uppercase text-[#78716C] px-1.5">
              Semanas:
            </span>
            <button
              type="button"
              onClick={() => setDateMode('this_week')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateMode === 'this_week'
                  ? 'bg-[#1A2B5C] text-white font-black shadow-xs'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              ⚡ Esta Semana
            </button>
            <button
              type="button"
              onClick={() => setDateMode('7days')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateMode === '7days'
                  ? 'bg-[#1A2B5C] text-white font-black shadow-xs'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Últimos 7 Días
            </button>
          </div>

          {/* Por Meses */}
          <div className="flex items-center gap-1 bg-[#FBF7EF] p-1 rounded-xl border border-[#E8DFC8]">
            <span className="text-[10px] font-black uppercase text-[#78716C] px-1.5">
              Meses:
            </span>
            <button
              type="button"
              onClick={() => setDateMode('this_month')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateMode === 'this_month'
                  ? 'bg-[#1A2B5C] text-white font-black shadow-xs'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => setDateMode('last_month')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateMode === 'last_month'
                  ? 'bg-[#1A2B5C] text-white font-black shadow-xs'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              Mes Anterior
            </button>
            <button
              type="button"
              onClick={() => setDateMode('specific_month')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateMode === 'specific_month'
                  ? 'bg-[#1A2B5C] text-white font-black shadow-xs'
                  : 'text-[#78716C] hover:text-[#1A2B5C]'
              }`}
            >
              🗓️ Mes específico
            </button>
          </div>

          {/* Histórico Total */}
          <button
            type="button"
            onClick={() => setDateMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              dateMode === 'all'
                ? 'bg-[#1A2B5C] text-white font-black border-[#1A2B5C] shadow-xs'
                : 'bg-white border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Histórico Total
          </button>
        </div>

        {/* Custom Day or Custom Month Pickers */}
        {dateMode === 'specific_day' && (
          <div className="pt-2 border-t border-[#E8DFC8] flex items-center gap-3 flex-wrap animate-in fade-in">
            <span className="text-xs font-bold text-[#1A2B5C]">Elegir fecha exacta:</span>
            <input
              type="date"
              value={customDay}
              onChange={(e) => setCustomDay(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#E8DFC8] bg-[#FBF7EF] text-[#1A2B5C] focus:outline-none"
            />
            <span className="text-xs text-[#78716C]">
              Mostrando ventas registradas exactamente en este día.
            </span>
          </div>
        )}

        {dateMode === 'specific_month' && (
          <div className="pt-2 border-t border-[#E8DFC8] flex items-center gap-3 flex-wrap animate-in fade-in">
            <span className="text-xs font-bold text-[#1A2B5C]">Elegir mes y año:</span>
            <select
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#E8DFC8] bg-[#FBF7EF] text-[#1A2B5C] focus:outline-none"
            >
              {availableMonths.map((ym) => {
                const [year, month] = ym.split('-');
                const monthName = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toLocaleDateString('es-BO', {
                  month: 'long',
                  year: 'numeric',
                });
                return (
                  <option key={ym} value={ym}>
                    {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                  </option>
                );
              })}
            </select>
            <span className="text-xs text-[#78716C]">
              Mostrando todas las ventas acumuladas durante este mes.
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid for Clients */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Clientes */}
        <div className="border rounded-2xl p-4 shadow-sm bg-white border-[#E8DFC8]">
          <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-[#78716C]">
            Clientes con Compras
          </span>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-[#1A2B5C] block">
            {stats.totalClientes}
          </span>
          <span className="text-[11px] block mt-0.5 text-[#78716C]">
            En el periodo ({dateLabel})
          </span>
        </div>

        {/* Cliente #1 Líder */}
        <div
          onClick={toggleShowBalances}
          className="border rounded-2xl p-4 shadow-sm bg-white border-amber-200 cursor-pointer select-none hover:border-amber-400 transition"
          title="Haz clic para mostrar u ocultar saldos"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              🥇 Cliente #1 Top
            </span>
            <Crown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          {stats.topClient ? (
            <>
              <span className="text-sm sm:text-base font-black text-[#1A2B5C] truncate block">
                {stats.topClient.nombre}
              </span>
              <span className="text-base sm:text-lg font-black text-amber-700 font-['Outfit',sans-serif] block mt-0.5">
                {formatBalance(stats.topClient.totalComprado)}
              </span>
            </>
          ) : (
            <span className="text-xs text-[#78716C]">Sin datos</span>
          )}
        </div>

        {/* Candidatos a Regalo */}
        <div className="border rounded-2xl p-4 shadow-sm bg-white border-pink-200 bg-gradient-to-br from-white to-pink-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider">
              🎁 Para Regalo
            </span>
            <Gift className="w-3.5 h-3.5 text-pink-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-pink-700 block">
            {stats.totalCandidatosRegalo}
          </span>
          <span className="text-[11px] block mt-0.5 text-pink-700/80">
            Clientes con mérito de fidelidad
          </span>
        </div>

        {/* Candidatos a Grupo Mayorista */}
        <div className="border rounded-2xl p-4 shadow-sm bg-white border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              👑 Mayoristas VIP
            </span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-emerald-800 block">
            {stats.totalMayoristas}
          </span>
          <span className="text-[11px] block mt-0.5 text-emerald-700/80">
            Elegibles para grupo exclusivo
          </span>
        </div>
      </div>

      {/* Visual Podium for Top 3 Clients */}
      {podiumTop3.length > 0 && (
        <div className="border rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[#FDFBF7] to-white border-[#E8DFC8] shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold font-['Outfit',sans-serif] text-[#1A2B5C]">
                Podio de Honor: Los 3 Clientes con Mayor Compra
              </h3>
            </div>
            <span className="text-xs text-[#78716C]">
              {dateLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {podiumTop3.map((client, idx) => {
              const isGold = idx === 0;
              const isSilver = idx === 1;
              const isBronze = idx === 2;

              return (
                <div
                  key={client.clientKey}
                  className={`rounded-2xl p-4 border transition hover:shadow-md flex flex-col justify-between gap-3 relative overflow-hidden ${
                    isGold
                      ? 'bg-gradient-to-br from-amber-50/80 via-white to-amber-100/40 border-amber-300'
                      : isSilver
                      ? 'bg-gradient-to-br from-slate-50/80 via-white to-slate-100/40 border-slate-300'
                      : 'bg-gradient-to-br from-orange-50/80 via-white to-amber-100/30 border-orange-300'
                  }`}
                >
                  {/* Medal Ribbon */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shadow-xs ${
                          isGold
                            ? 'bg-amber-400 text-stone-900'
                            : isSilver
                            ? 'bg-slate-300 text-slate-800'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider text-[#1A2B5C]">
                        {isGold ? '🥇 Medalla de Oro' : isSilver ? '🥈 Medalla de Plata' : '🥉 Medalla de Bronce'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {client.isWholesalerCandidate && (
                        <span className="p-1 rounded-lg bg-amber-100 text-amber-800" title="Perfil Mayorista">
                          <Crown className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {client.isGiftCandidate && (
                        <span className="p-1 rounded-lg bg-pink-100 text-pink-700" title="Candidato a Regalo">
                          <Gift className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Client Info */}
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-[#1A2B5C] truncate">
                      {client.nombre}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-[#78716C] mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {formatBoliviaPhone(client.telefono)}
                      </span>
                      {client.destinoPrincipal && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          {client.destinoPrincipal}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial figures */}
                  <div className="p-2.5 rounded-xl bg-white/80 border border-[#E8DFC8] grid grid-cols-2 gap-2 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-[#78716C] uppercase block">
                        Total Comprado
                      </span>
                      <span className="text-sm font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                        {formatBalance(client.totalComprado)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#78716C] uppercase block">
                        Pedidos
                      </span>
                      <span className="text-sm font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                        {client.cantidadPedidos}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendGiftWhatsApp(client)}
                      className="py-1.5 px-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                      title="Enviar agradecimiento y aviso de regalo por WhatsApp"
                    >
                      <Gift className="w-3 h-3" />
                      <span>Regalo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWholesalerInviteWhatsApp(client)}
                      className="py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                      title="Invitar al Grupo Mayorista VIP"
                    >
                      <Crown className="w-3 h-3" />
                      <span>Mayorista</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedClientForModal(client)}
                    className="w-full text-center text-[11px] font-bold text-[#1A2B5C] hover:underline cursor-pointer py-1"
                  >
                    Ver detalle completo y pedidos →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Client List & Filter Section */}
      <div className="border rounded-3xl p-5 sm:p-6 bg-white border-[#E8DFC8] shadow-sm space-y-4">
        {/* Controls Bar: Search + Segment Filter + Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre, teléfono o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-[#E8DFC8] bg-[#FBF7EF] text-[#1A2B5C] placeholder-[#78716C] focus:outline-none focus:border-[#1A2B5C]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Segment Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#78716C]">Segmento:</span>
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value as ClientSegmentFilter)}
                className="text-xs font-bold border rounded-xl px-2.5 py-1.5 bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8] focus:outline-none"
              >
                <option value="all">Todos los clientes ({rankedClients.length})</option>
                <option value="mayorista">👑 Mayoristas VIP ({stats.totalMayoristas})</option>
                <option value="regalos">🎁 Para Regalo ({stats.totalCandidatosRegalo})</option>
                <option value="recurrentes">🔁 Recurrentes (&gt;= 2 compras)</option>
                <option value="con_saldo">⚠️ Con Saldo Pendiente</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#78716C]">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ClientSortOption)}
                className="text-xs font-bold border rounded-xl px-2.5 py-1.5 bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8] focus:outline-none"
              >
                <option value="monto">Mayor Monto Comprado (Bs.)</option>
                <option value="pedidos">Más Pedidos Realizados</option>
                <option value="ticket">Mayor Ticket Promedio</option>
                <option value="reciente">Compra Más Reciente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table / List of Ranked Clients */}
        {displayedClients.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[#78716C] mx-auto opacity-50" />
            <p className="text-xs font-bold text-[#78716C]">
              No se encontraron clientes para el periodo y filtros seleccionados.
            </p>
            <p className="text-[11px] text-[#78716C]">
              Prueba cambiando el rango de fechas a "Este Mes" o "Histórico Total".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8DFC8] text-[#78716C] font-bold uppercase text-[10px] tracking-wider bg-[#FBF7EF]/50">
                  <th className="py-3 px-3"># Rank</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Perfil & Segmento</th>
                  <th className="py-3 px-3 text-right">Total Comprado</th>
                  <th className="py-3 px-3 text-center">Pedidos</th>
                  <th className="py-3 px-3 text-right">Ticket Promedio</th>
                  <th className="py-3 px-3">Destino Frecuente</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFC8]">
                {displayedClients.map((client, idx) => {
                  const isTopRank = idx < 3;
                  const isPaid = client.totalSaldo <= 0;

                  return (
                    <tr
                      key={client.clientKey}
                      className="hover:bg-[#FBF7EF]/70 transition-colors"
                    >
                      {/* Rank # */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                            idx === 0
                              ? 'bg-amber-400 text-stone-900 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-[#1A2B5C]/10 text-[#1A2B5C]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Client Name & Phone */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedClientForModal(client)}
                          className="text-left font-black text-xs text-[#1A2B5C] hover:underline cursor-pointer block"
                        >
                          {client.nombre}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#78716C] mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{formatBoliviaPhone(client.telefono)}</span>
                        </div>
                      </td>

                      {/* Tier & Badges */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {client.tier === 'mayorista_vip' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-600" /> Mayorista VIP
                            </span>
                          )}
                          {client.isGiftCandidate && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-100 text-pink-800 border border-pink-200 flex items-center gap-1">
                              <Gift className="w-3 h-3 text-pink-600" /> Regalo
                            </span>
                          )}
                          {client.cantidadPedidos >= 2 && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#1A2B5C]/10 text-[#1A2B5C]">
                              🔁 Recurrente
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Comprado */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <span className="font-black text-sm text-[#1A2B5C] font-['Outfit',sans-serif] block">
                          {formatBalance(client.totalComprado)}
                        </span>
                        {isPaid ? (
                          <span className="text-[10px] font-bold text-emerald-700 block">
                            100% Pagado
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-amber-700 block font-['Outfit',sans-serif]">
                            Saldo: {formatBalance(client.totalSaldo)}
                          </span>
                        )}
                      </td>

                      {/* Cantidad de Pedidos */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-xl bg-[#FBF7EF] border border-[#E8DFC8] font-black text-xs text-[#1A2B5C] font-['Outfit',sans-serif]">
                          {client.cantidadPedidos} {client.cantidadPedidos === 1 ? 'ped.' : 'peds.'}
                        </span>
                      </td>

                      {/* Ticket Promedio */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <span className="font-bold text-xs text-[#1A2B5C] font-['Outfit',sans-serif]">
                          {formatBalance(client.ticketPromedio)}
                        </span>
                      </td>

                      {/* Destino habitual */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 text-[11px] text-[#78716C]">
                          <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {client.destinoPrincipal || 'Sin destino'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Regalo WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleSendGiftWhatsApp(client)}
                            className="p-1.5 rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200 transition cursor-pointer"
                            title="Avisar regalo por WhatsApp"
                          >
                            <Gift className="w-3.5 h-3.5" />
                          </button>

                          {/* Mayorista WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleSendWholesalerInviteWhatsApp(client)}
                            className="p-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition cursor-pointer"
                            title="Invitar al Grupo Mayorista VIP por WhatsApp"
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>

                          {/* View Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedClientForModal(client)}
                            className="py-1 px-2.5 rounded-lg bg-[#1A2B5C] hover:bg-[#243B7A] text-white text-[11px] font-bold shadow-2xs transition cursor-pointer"
                          >
                            Ver Ficha
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Client Detailed Profile & Order Breakdown */}
      {selectedClientForModal && (
        <ClientDetailModal
          client={selectedClientForModal}
          onClose={() => setSelectedClientForModal(null)}
          onSendGiftWhatsApp={handleSendGiftWhatsApp}
          onSendWholesalerInviteWhatsApp={handleSendWholesalerInviteWhatsApp}
        />
      )}
    </div>
  );
};
