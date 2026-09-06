import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Package,
  Users,
  DollarSign,
  Calendar,
  Building2,
  Share2,
} from 'lucide-react';
import { formatCurrency } from '../../lib/storage';
import { useFinancialPrivacy } from '../../contexts/FinancialPrivacyContext';

export interface ExecutiveSummaryData {
  periodType: 'semana' | 'mes';
  periodLabel: string;
  previousPeriodLabel: string;
  generatedAt: string;
  generatedBy?: string;
  current: {
    totalVentas: number;
    ordersCount: number;
    ticketPromedio: number;
    totalCobrado: number;
    totalPorCobrar: number;
    porcentajeCobrado: number;
    totalUnits: number;
  };
  previous: {
    totalVentas: number;
    ordersCount: number;
    ticketPromedio: number;
    totalCobrado: number;
    totalPorCobrar: number;
    totalUnits: number;
  };
  growth: {
    ventasPercent: number | null;
    ordersPercent: number | null;
    ticketPercent: number | null;
    cobradoPercent: number | null;
  };
  topProducts: Array<{
    name: string;
    cantidad: number;
    totalBs: number;
    sharePercent: number;
  }>;
  topSellers: Array<{
    name: string;
    count: number;
    total: number;
    ticketPromedio: number;
    cobrado: number;
    porCobrar: number;
    sharePercent: number;
  }>;
}

interface ExecutiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExecutiveSummaryData;
}

export const ExecutiveSummaryModal: React.FC<ExecutiveSummaryModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const { formatBalance } = useFinancialPrivacy();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const renderGrowthBadge = (percent: number | null, inverse = false) => {
    if (percent === null) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
          <Minus className="w-3 h-3" /> N/A (Nuevo)
        </span>
      );
    }
    const isPositive = percent > 0;
    const isZero = Math.abs(percent) < 0.01;

    if (isZero) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
          <Minus className="w-3 h-3" /> 0.0%
        </span>
      );
    }

    const isGood = inverse ? !isPositive : isPositive;

    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${
          isGood
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-rose-100 text-rose-800 border border-rose-300'
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3 h-3 text-emerald-600" />
        ) : (
          <TrendingDown className="w-3 h-3 text-rose-600" />
        )}
        {isPositive ? '+' : ''}
        {percent.toFixed(1)}%
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const lines: string[] = [];
    lines.push(`IMPORTADORA CHIQUIMINISOS - RESUMEN EJECUTIVO`);
    lines.push(`Período Evaluado: ${data.periodLabel}`);
    lines.push(`Período Anterior de Comparación: ${data.previousPeriodLabel}`);
    lines.push(`Fecha de Emisión: ${data.generatedAt}`);
    lines.push('');
    lines.push('--- INDICADORES GENERALES (KPIS) ---');
    lines.push('Métrica,Período Actual,Período Anterior,Variación %');
    lines.push(
      `Total Ventas (Bs.),${data.current.totalVentas.toFixed(2)},${data.previous.totalVentas.toFixed(2)},${
        data.growth.ventasPercent !== null ? data.growth.ventasPercent.toFixed(1) + '%' : 'N/A'
      }`
    );
    lines.push(
      `Cantidad de Pedidos,${data.current.ordersCount},${data.previous.ordersCount},${
        data.growth.ordersPercent !== null ? data.growth.ordersPercent.toFixed(1) + '%' : 'N/A'
      }`
    );
    lines.push(
      `Ticket Promedio (Bs.),${data.current.ticketPromedio.toFixed(2)},${data.previous.ticketPromedio.toFixed(2)},${
        data.growth.ticketPercent !== null ? data.growth.ticketPercent.toFixed(1) + '%' : 'N/A'
      }`
    );
    lines.push(
      `Total Cobrado (Bs.),${data.current.totalCobrado.toFixed(2)},${data.previous.totalCobrado.toFixed(2)},${
        data.growth.cobradoPercent !== null ? data.growth.cobradoPercent.toFixed(1) + '%' : 'N/A'
      }`
    );
    lines.push(
      `Saldo por Cobrar (Bs.),${data.current.totalPorCobrar.toFixed(2)},${data.previous.totalPorCobrar.toFixed(2)},-`
    );
    lines.push(`Efectividad de Cobro,${data.current.porcentajeCobrado.toFixed(1)}%,-,-`);
    lines.push('');

    lines.push('--- TOP PRODUCTOS VENDIDOS ---');
    lines.push('Ranking,Artículo,Cantidad Vendida (u),Total Facturado (Bs.),Participación %');
    data.topProducts.forEach((p, idx) => {
      lines.push(
        `#${idx + 1},"${p.name.replace(/"/g, '""')}",${p.cantidad},${p.totalBs.toFixed(2)},${p.sharePercent.toFixed(1)}%`
      );
    });
    lines.push('');

    lines.push('--- DESEMPEÑO POR VENDEDORA ---');
    lines.push('Ranking,Vendedora,Pedidos Concretados,Total Vendido (Bs.),Ticket Promedio (Bs.),Cobrado (Bs.),Saldo Pendiente (Bs.),Participación %');
    data.topSellers.forEach((s, idx) => {
      lines.push(
        `#${idx + 1},"${s.name.replace(/"/g, '""')}",${s.count},${s.total.toFixed(2)},${s.ticketPromedio.toFixed(2)},${s.cobrado.toFixed(2)},${s.porCobrar.toFixed(2)},${s.sharePercent.toFixed(1)}%`
      );
    });

    const csvContent = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = data.periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.setAttribute('download', `Resumen_Ejecutivo_${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyWhatsApp = () => {
    let text = `📊 *INFORME EJECUTIVO DE VENTAS - CHIQUIMINISOS*\n`;
    text += `📅 *Período:* ${data.periodLabel}\n`;
    text += `🔄 *Comparado con:* ${data.previousPeriodLabel}\n`;
    text += `⏰ *Emitido:* ${data.generatedAt}\n\n`;

    text += `📈 *METRICAS CLAVE:*\n`;
    text += `• Total Ventas: *Bs. ${data.current.totalVentas.toLocaleString('es-BO', { minimumFractionDigits: 2 })}* `;
    if (data.growth.ventasPercent !== null) {
      text += `(${data.growth.ventasPercent >= 0 ? '🟢 +' : '🔴 '}${data.growth.ventasPercent.toFixed(1)}%)\n`;
    } else {
      text += `\n`;
    }
    text += `• Pedidos: *${data.current.ordersCount} pedidos* `;
    if (data.growth.ordersPercent !== null) {
      text += `(${data.growth.ordersPercent >= 0 ? '+' : ''}${data.growth.ordersPercent.toFixed(1)}%)\n`;
    } else {
      text += `\n`;
    }
    text += `• Ticket Promedio: *Bs. ${data.current.ticketPromedio.toLocaleString('es-BO', { minimumFractionDigits: 2 })}*\n`;
    text += `• Cobrado en Caja: *Bs. ${data.current.totalCobrado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}* (${data.current.porcentajeCobrado.toFixed(1)}% del total)\n`;
    text += `• Saldo por Cobrar: *Bs. ${data.current.totalPorCobrar.toLocaleString('es-BO', { minimumFractionDigits: 2 })}*\n\n`;

    if (data.topSellers.length > 0) {
      text += `🏆 *TOP VENDEDORAS:*\n`;
      data.topSellers.slice(0, 5).forEach((s, idx) => {
        text += `${idx + 1}. *${s.name}*: Bs. ${s.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })} (${s.count} pedidos | Prom: Bs. ${s.ticketPromedio.toFixed(1)})\n`;
      });
      text += `\n`;
    }

    if (data.topProducts.length > 0) {
      text += `📦 *PRODUCTOS MÁS VENDIDOS:*\n`;
      data.topProducts.slice(0, 5).forEach((p, idx) => {
        text += `${idx + 1}. *${p.name}*: ${p.cantidad} unidades (Bs. ${p.totalBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })})\n`;
      });
      text += `\n`;
    }

    text += `_Generado por Sistema de Gestión Chiquiminisos._`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const diffVentas = data.current.totalVentas - data.previous.totalVentas;
  const bestSeller = data.topSellers.length > 0 ? data.topSellers[0] : null;
  const bestProduct = data.topProducts.length > 0 ? data.topProducts[0] : null;

  return (
    <div
      id="executive-summary-modal"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <div className="bg-white border border-[#E8DFC8] rounded-3xl max-w-4xl w-full my-auto max-h-[96vh] flex flex-col overflow-hidden shadow-2xl print:shadow-none print:border-none print:max-h-none print:max-w-none print:rounded-none">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="p-4 sm:p-5 border-b border-[#E8DFC8] bg-[#1A2B5C] text-white flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-['Outfit',sans-serif] tracking-tight">
                Resumen Ejecutivo Comercial
              </h2>
              <p className="text-xs text-white/80">
                {data.periodLabel} • Comparativo con {data.previousPeriodLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Imprimir / Guardar en PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Descargar Excel CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar texto para WhatsApp"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer ml-1"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 print:p-6 print:space-y-5 text-[#1A2B5C] bg-[#FAF8F5] print:bg-white">
          {/* Institutional Printable Header */}
          <div className="border-b-2 border-[#1A2B5C] pb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 block">
                IMPORTADORA CHIQUIMINISOS S.R.L.
              </span>
              <h1 className="text-2xl sm:text-3xl font-black font-['Outfit',sans-serif] text-[#1A2B5C]">
                Informe Ejecutivo de Ventas & Desempeño
              </h1>
              <p className="text-sm font-semibold text-stone-600 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-stone-500" />
                <span>Período Evaluado: <strong>{data.periodLabel}</strong></span>
              </p>
            </div>

            <div className="text-right text-xs text-stone-600 space-y-1">
              <div>
                <span className="text-stone-500">Emitido:</span>{' '}
                <strong className="text-stone-800">{data.generatedAt}</strong>
              </div>
              <div>
                <span className="text-stone-500">Comparativa:</span>{' '}
                <span className="font-semibold text-stone-700">{data.previousPeriodLabel}</span>
              </div>
              <div className="inline-block mt-1">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#1A2B5C] text-white">
                  {data.periodType === 'semana' ? 'Reporte Semanal' : 'Reporte Mensual'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive KPI Comparison Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1A2B5C] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-600" />
                1. Indicadores Financieros y Comparativa de Crecimiento
              </h3>
              <span className="text-xs text-stone-500 italic">
                Vs. {data.previousPeriodLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* Card 1: Ventas */}
              <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Total Facturado
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                  {formatBalance(data.current.totalVentas)}
                </span>
                <div className="mt-2 flex items-center justify-between">
                  {renderGrowthBadge(data.growth.ventasPercent)}
                  <span className="text-[10px] text-stone-500 font-mono">
                    {diffVentas >= 0 ? '+' : ''}{diffVentas.toFixed(0)} Bs.
                  </span>
                </div>
                <div className="mt-1.5 text-[10px] text-stone-400">
                  Ant: {formatBalance(data.previous.totalVentas)}
                </div>
              </div>

              {/* Card 2: Pedidos */}
              <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Pedidos Concretados
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                  {data.current.ordersCount}
                </span>
                <div className="mt-2 flex items-center justify-between">
                  {renderGrowthBadge(data.growth.ordersPercent)}
                  <span className="text-[10px] text-stone-500 font-mono">
                    {data.current.ordersCount - data.previous.ordersCount >= 0 ? '+' : ''}
                    {data.current.ordersCount - data.previous.ordersCount} peds.
                  </span>
                </div>
                <div className="mt-1.5 text-[10px] text-stone-400">
                  Ant: {data.previous.ordersCount} pedidos
                </div>
              </div>

              {/* Card 3: Ticket Promedio */}
              <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Ticket Promedio
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#1A2B5C] font-['Outfit',sans-serif] block">
                  {formatBalance(data.current.ticketPromedio)}
                </span>
                <div className="mt-2 flex items-center justify-between">
                  {renderGrowthBadge(data.growth.ticketPercent)}
                  <span className="text-[10px] text-stone-500">por cliente</span>
                </div>
                <div className="mt-1.5 text-[10px] text-stone-400">
                  Ant: {formatBalance(data.previous.ticketPromedio)}
                </div>
              </div>

              {/* Card 4: Cobranza */}
              <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                  Cobrado en Caja
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 font-['Outfit',sans-serif] block">
                  {formatBalance(data.current.totalCobrado)}
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="inline-flex items-center text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {data.current.porcentajeCobrado.toFixed(1)}% Cobrado
                  </span>
                  <span className="text-[10px] text-stone-500">Efectivo/QR</span>
                </div>
                <div className="mt-1.5 text-[10px] text-amber-700 font-bold">
                  Saldo pend: {formatBalance(data.current.totalPorCobrar)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Auditoría de Cobranza & Flujo de Efectivo */}
          <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-stone-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                2. Balance de Cobranza del Período
              </h4>
              <span className="text-xs font-black text-[#1A2B5C]">
                Total: {formatBalance(data.current.totalVentas)}
              </span>
            </div>

            {/* Visual Progress Bar for Cobrado vs Saldo */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-amber-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, data.current.porcentajeCobrado))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  Cobrado efectivo/QR: <strong>{formatBalance(data.current.totalCobrado)}</strong> ({data.current.porcentajeCobrado.toFixed(1)}%)
                </span>
                <span className="text-amber-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Saldo por cobrar: <strong>{formatBalance(data.current.totalPorCobrar)}</strong> ({(100 - data.current.porcentajeCobrado).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Rankings Grid (Vendedoras & Productos) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Table: Desempeño por Vendedora */}
            <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5 border-stone-200">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2B5C]">
                    3. Desempeño del Equipo de Ventas
                  </h4>
                </div>
                <span className="text-[11px] text-stone-500">{data.topSellers.length} vendedoras</span>
              </div>

              {data.topSellers.length === 0 ? (
                <p className="text-xs text-stone-500 py-4 text-center">Sin ventas en este período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 font-bold">
                        <th className="py-2 pr-2">#</th>
                        <th className="py-2 pr-2">Vendedora</th>
                        <th className="py-2 pr-2 text-center">Peds</th>
                        <th className="py-2 pr-2 text-right">Total Bs.</th>
                        <th className="py-2 text-right">Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {data.topSellers.map((s, idx) => (
                        <tr key={s.name} className="hover:bg-stone-50">
                          <td className="py-2 pr-2 font-bold text-stone-400">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </td>
                          <td className="py-2 pr-2 font-bold text-[#1A2B5C] truncate max-w-[120px]">
                            {s.name}
                          </td>
                          <td className="py-2 pr-2 text-center font-mono text-stone-600">
                            {s.count}
                          </td>
                          <td className="py-2 pr-2 text-right font-black font-mono text-[#1A2B5C]">
                            {formatBalance(s.total)}
                          </td>
                          <td className="py-2 text-right font-mono text-stone-600">
                            {formatBalance(s.ticketPromedio)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Table: Top Artículos Más Vendidos */}
            <div className="bg-white border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5 border-stone-200">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#1A2B5C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2B5C]">
                    4. Top Artículos Más Vendidos
                  </h4>
                </div>
                <span className="text-[11px] text-stone-500">{data.current.totalUnits}u despachadas</span>
              </div>

              {data.topProducts.length === 0 ? (
                <p className="text-xs text-stone-500 py-4 text-center">Sin artículos vendidos en este período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 font-bold">
                        <th className="py-2 pr-2">#</th>
                        <th className="py-2 pr-2">Artículo</th>
                        <th className="py-2 pr-2 text-center">Cant.</th>
                        <th className="py-2 pr-2 text-right">Total Bs.</th>
                        <th className="py-2 text-right">% Venta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {data.topProducts.slice(0, 7).map((p, idx) => (
                        <tr key={p.name} className="hover:bg-stone-50">
                          <td className="py-2 pr-2 font-bold text-stone-400">
                            #{idx + 1}
                          </td>
                          <td className="py-2 pr-2 font-bold text-[#1A2B5C] truncate max-w-[130px]" title={p.name}>
                            {p.name}
                          </td>
                          <td className="py-2 pr-2 text-center font-black text-amber-700 font-mono">
                            {p.cantidad}u
                          </td>
                          <td className="py-2 pr-2 text-right font-black font-mono text-[#1A2B5C]">
                            {formatBalance(p.totalBs)}
                          </td>
                          <td className="py-2 text-right font-mono text-stone-500 text-[11px]">
                            {p.sharePercent.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Conclusiones y Resumen Ejecutivo */}
          <div className="bg-[#FAF4E6] border border-[#E8DFC8] rounded-2xl p-4 sm:p-5 text-xs text-stone-800 space-y-2">
            <h4 className="font-black uppercase tracking-wider text-[#1A2B5C] flex items-center gap-2">
              <span>📌</span> Conclusiones y Destacados del Período
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white/80 rounded-xl border border-[#E8DFC8]">
                <span className="text-[10px] text-stone-500 uppercase font-bold block">
                  Tendencia de Ventas
                </span>
                <p className="font-bold text-[#1A2B5C] mt-0.5">
                  {data.growth.ventasPercent === null
                    ? 'Primer período de referencia registrado.'
                    : data.growth.ventasPercent >= 0
                    ? `Crecimiento favorable de +${data.growth.ventasPercent.toFixed(1)}% frente al ciclo anterior.`
                    : `Disminución de ${data.growth.ventasPercent.toFixed(1)}% frente al ciclo anterior.`}
                </p>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-[#E8DFC8]">
                <span className="text-[10px] text-stone-500 uppercase font-bold block">
                  Vendedora Estrella
                </span>
                <p className="font-bold text-[#1A2B5C] mt-0.5">
                  {bestSeller
                    ? `${bestSeller.name} lideró con ${formatBalance(bestSeller.total)} (${bestSeller.count} pedidos).`
                    : 'Sin datos registrados.'}
                </p>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-[#E8DFC8]">
                <span className="text-[10px] text-stone-500 uppercase font-bold block">
                  Artículo Más Solicitado
                </span>
                <p className="font-bold text-[#1A2B5C] mt-0.5 truncate" title={bestProduct?.name}>
                  {bestProduct
                    ? `${bestProduct.name} (${bestProduct.cantidad} unidades vendidas).`
                    : 'Sin datos registrados.'}
                </p>
              </div>
            </div>
          </div>

          {/* Printable Signature Footnote */}
          <div className="pt-6 border-t border-stone-300 text-center text-[11px] text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>Importadora Chiquiminisos • Sistema Integral de Gestión y Control Comercial</span>
            <span>Documento generado con fecha {data.generatedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
