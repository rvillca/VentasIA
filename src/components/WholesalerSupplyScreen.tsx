import React, { useState, useMemo } from 'react';
import { ShoppingCart, Package, Check, RefreshCw, Layers, CheckCircle2, Phone, MapPin, Printer } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency } from '../lib/storage';
import { useTheme } from '../contexts/ThemeContext';

interface WholesalerSupplyScreenProps {
  orders: Order[];
  onSelectOrder?: (order: Order) => void;
}

interface ConsolidatedItem {
  nombre: string;
  variante: string;
  cantidadTotal: number;
  pedidosAsociados: {
    orderNumber: number;
    cliente: string;
    cantidad: number;
    precioVentaUnitario: number;
  }[];
}

export const WholesalerSupplyScreen: React.FC<WholesalerSupplyScreenProps> = ({
  orders = [],
}) => {
  const { isDark } = useTheme();
  const [filterMode, setFilterMode] = useState<'open_only' | 'all'>('open_only');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Relevant orders to calculate what to buy at the wholesaler
  const targetOrders = useMemo(() => {
    if (filterMode === 'open_only') {
      return orders.filter((o) => o.estado === 'Abierto');
    }
    return orders;
  }, [orders, filterMode]);

  // Consolidate identical products and packaging variants
  const consolidatedItems = useMemo(() => {
    const map = new Map<string, ConsolidatedItem>();

    targetOrders.forEach((order) => {
      order.productos.forEach((prod) => {
        const cleanName = prod.nombre.trim() || 'Artículo Varios';
        const cleanVar = prod.variante.trim();
        const key = `${cleanName.toLowerCase()}_||_${cleanVar.toLowerCase()}`;

        if (!map.has(key)) {
          map.set(key, {
            nombre: cleanName,
            variante: cleanVar,
            cantidadTotal: 0,
            pedidosAsociados: [],
          });
        }

        const entry = map.get(key)!;
        entry.cantidadTotal += prod.cantidad || 1;
        entry.pedidosAsociados.push({
          orderNumber: order.orderNumber,
          cliente: order.cliente || 'TikTok Live',
          cantidad: prod.cantidad || 1,
          precioVentaUnitario: prod.precioUnitario || 0,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.cantidadTotal - a.cantidadTotal);
  }, [targetOrders]);

  const totalItemsToBuy = consolidatedItems.reduce(
    (sum, item) => sum + item.cantidadTotal,
    0
  );

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePrintList = () => {
    window.print();
  };

  return (
    <div id="wholesaler-supply-screen" className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isDark
                  ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border-[#FF6FA5]/40'
                  : 'bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20'
              }`}
            >
              Surtido del Día
            </span>
            <span className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Tus 3 a 4 salidas al proveedor
            </span>
          </div>
          <h1 className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight ${
            isDark ? 'text-white' : 'text-[#1A2B5C]'
          }`}>
            Lista de Compras al Mayorista
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Consolidado exacto de mercadería vendido en TikTok Live para ir a comprar
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintList}
          className={`py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm active:scale-95 shadow-sm flex items-center justify-center gap-2 transition border cursor-pointer ${
            isDark
              ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
              : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
          }`}
        >
          <Printer className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
          <span>Imprimir Lista de Compras</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className={`border rounded-2xl p-4 shadow-sm ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`}>
            Pedidos Activos
          </span>
          <span className={`text-2xl font-black font-['Outfit',sans-serif] ${
            isDark ? 'text-white' : 'text-[#1A2B5C]'
          }`}>
            {targetOrders.length}
          </span>
          <span className={`text-[11px] block mt-0.5 ${
            isDark ? 'text-[#9AA6C9]/80' : 'text-[#78716C]'
          }`}>
            {filterMode === 'open_only' ? 'Solo pedidos abiertos' : 'Todos los pedidos'}
          </span>
        </div>

        <div className={`border rounded-2xl p-4 shadow-sm ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${
            isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
          }`}>
            Variedad de Artículos
          </span>
          <span className={`text-2xl font-black font-['Outfit',sans-serif] ${
            isDark ? 'text-white' : 'text-[#1A2B5C]'
          }`}>
            {consolidatedItems.length}
          </span>
          <span className={`text-[11px] block mt-0.5 ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`}>
            Modelos / Boxes distintos
          </span>
        </div>

        <div className={`col-span-2 sm:col-span-1 border rounded-2xl p-4 shadow-sm ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${
            isDark ? 'text-emerald-400' : 'text-emerald-700'
          }`}>
            Total Piezas / Boxes
          </span>
          <span className={`text-2xl font-black font-['Outfit',sans-serif] ${
            isDark ? 'text-emerald-400' : 'text-emerald-700'
          }`}>
            {totalItemsToBuy}
          </span>
          <span className={`text-[11px] block mt-0.5 ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`}>
            A comprar en el proveedor
          </span>
        </div>
      </div>

      {/* Filter Mode Selector */}
      <div className={`flex items-center justify-between border rounded-2xl p-2.5 ${
        isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
      }`}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('open_only')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'open_only'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Pedidos Abiertos / Por Despachar ({orders.filter((o) => o.estado === 'Abierto').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'all'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'text-[#9AA6C9] hover:text-white'
                : 'text-[#78716C] hover:text-[#1A2B5C]'
            }`}
          >
            Todos los Pedidos ({orders.length})
          </button>
        </div>

        <span className={`text-[11px] hidden sm:inline ${
          isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
        }`}>
          Marca los artículos conforme los compres en el mayorista:
        </span>
      </div>

      {/* Consolidated Items Checklist */}
      <div className="space-y-3">
        {consolidatedItems.length === 0 ? (
          <div className={`text-center py-12 px-4 border border-dashed rounded-3xl space-y-3 ${
            isDark ? 'bg-[#16234F]/40 border-[#223368]' : 'bg-white/60 border-[#E8DFC8]'
          }`}>
            <ShoppingCart className={`w-12 h-12 mx-auto ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`} />
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
              No hay mercadería pendiente por comprar
            </h3>
            <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Crea nuevos pedidos de tus clientes de TikTok Live y aparecerán sumados automáticamente en esta lista.
            </p>
          </div>
        ) : (
          consolidatedItems.map((item, idx) => {
            const key = `${item.nombre}_${item.variante}`;
            const isChecked = !!checkedItems[key];

            return (
              <div
                key={idx}
                onClick={() => toggleCheck(key)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isChecked
                    ? isDark
                      ? 'bg-[#0F1B3C]/60 border-[#223368]/60 opacity-60'
                      : 'bg-[#FBF7EF]/60 border-[#E8DFC8]/60 opacity-60'
                    : isDark
                    ? 'bg-[#16234F] border-[#223368] hover:border-[#FF6FA5]/40 shadow-sm'
                    : 'bg-white border-[#E8DFC8] hover:border-[#1A2B5C]/30 shadow-sm'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  {/* Checkbox */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all mt-0.5 sm:mt-0 ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isDark
                        ? 'bg-[#0F1B3C] border-[#223368] text-transparent hover:border-[#FF6FA5]'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] text-transparent hover:border-[#1A2B5C]'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </div>

                  {/* Quantity & Name */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${
                          isChecked
                            ? isDark
                              ? 'bg-[#0F1B3C] text-[#9AA6C9]'
                              : 'bg-[#FBF7EF] text-[#78716C]'
                            : isDark
                            ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border border-[#FF6FA5]/40'
                            : 'bg-[#1A2B5C] text-white'
                        }`}
                      >
                        {item.cantidadTotal}x
                      </span>
                      <h3
                        className={`text-base font-bold font-['Outfit',sans-serif] ${
                          isChecked
                            ? isDark ? 'line-through text-[#9AA6C9]' : 'line-through text-[#78716C]'
                            : isDark ? 'text-white' : 'text-[#1A2B5C]'
                        }`}
                      >
                        {item.nombre}
                      </h3>
                    </div>

                    {item.variante && (
                      <p className={`text-xs mt-1 pl-1 font-medium ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                        Presentación: {item.variante}
                      </p>
                    )}

                    {/* Breakdown of clients */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                        Destinado a:
                      </span>
                      {item.pedidosAsociados.map((assoc, aIdx) => (
                        <span
                          key={aIdx}
                          className={`text-[10px] px-2 py-0.5 rounded-md border ${
                            isDark
                              ? 'bg-[#0F1B3C] text-white border-[#223368]'
                              : 'bg-[#FBF7EF] text-[#1A2B5C] border-[#E8DFC8]'
                          }`}
                        >
                          #{assoc.orderNumber} {assoc.cliente} ({assoc.cantidad}u)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 ${
                  isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                }`}>
                  <span className={`text-[10px] uppercase font-bold block ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}>
                    Total a Comprar
                  </span>
                  <span className={`text-lg font-black font-mono ${
                    isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}>
                    {item.cantidadTotal} {item.variante || 'unidades'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
