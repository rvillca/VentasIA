import React, { useState, useMemo } from 'react';
import { ShoppingCart, Package, Check, RefreshCw, Layers, CheckCircle2, Phone, MapPin, Printer } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency } from '../lib/storage';

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
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full">
              Surtido del Día
            </span>
            <span className="text-xs text-slate-400">Tus 3 a 4 salidas al proveedor</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight">
            Lista de Compras al Mayorista
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Consolidado exacto de mercadería vendido en TikTok Live para ir a comprar
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintList}
          className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 shadow-md flex items-center justify-center gap-2 transition"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
          <span>Imprimir Lista de Compras</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Pedidos Activos
          </span>
          <span className="text-2xl font-black text-white font-['Outfit',sans-serif]">
            {targetOrders.length}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {filterMode === 'open_only' ? 'Solo pedidos abiertos' : 'Todos los pedidos'}
          </span>
        </div>

        <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-4 shadow-md bg-gradient-to-br from-slate-900 to-purple-950/40">
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block mb-1">
            Variedad de Artículos
          </span>
          <span className="text-2xl font-black text-purple-200 font-['Outfit',sans-serif]">
            {consolidatedItems.length}
          </span>
          <span className="text-[11px] text-purple-400/80 block mt-0.5">
            Modelos / Boxes distintos
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 shadow-md bg-gradient-to-br from-slate-900 to-cyan-950/40">
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block mb-1">
            Total Piezas / Boxes
          </span>
          <span className="text-2xl font-black text-cyan-200 font-['Outfit',sans-serif]">
            {totalItemsToBuy}
          </span>
          <span className="text-[11px] text-cyan-400/80 block mt-0.5">
            A comprar en el proveedor
          </span>
        </div>
      </div>

      {/* Filter Mode Selector */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('open_only')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterMode === 'open_only'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pedidos Abiertos / Por Despachar ({orders.filter((o) => o.estado === 'Abierto').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos los Pedidos ({orders.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Marca los artículos conforme los compres en el mayorista:
        </span>
      </div>

      {/* Consolidated Items Checklist */}
      <div className="space-y-3">
        {consolidatedItems.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl space-y-3">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No hay mercadería pendiente por comprar</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-900 border-slate-800 hover:border-purple-500/40 shadow-lg'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  {/* Checkbox */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all mt-0.5 sm:mt-0 ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-700 text-transparent hover:border-purple-400'
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
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                        }`}
                      >
                        {item.cantidadTotal}x
                      </span>
                      <h3
                        className={`text-base font-bold font-['Outfit',sans-serif] ${
                          isChecked ? 'line-through text-slate-500' : 'text-white'
                        }`}
                      >
                        {item.nombre}
                      </h3>
                    </div>

                    {item.variante && (
                      <p className="text-xs text-purple-300/80 mt-1 pl-1 font-medium">
                        Presentación: {item.variante}
                      </p>
                    )}

                    {/* Breakdown of clients */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        Destinado a:
                      </span>
                      {item.pedidosAsociados.map((assoc, aIdx) => (
                        <span
                          key={aIdx}
                          className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800"
                        >
                          #{assoc.orderNumber} {assoc.cliente} ({assoc.cantidad}u)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total a Comprar
                  </span>
                  <span className="text-lg font-black text-cyan-300 font-mono">
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
