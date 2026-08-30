import React from 'react';
import { ShoppingBag, Mic, ListOrdered, Download, ShoppingCart, Sparkles } from 'lucide-react';
import { ActiveTab, Order } from '../types';
import { formatCurrency } from '../lib/storage';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  orders: Order[];
  onOpenBackup: () => void;
  onOpenVika: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  orders,
  onOpenBackup,
  onOpenVika,
}) => {
  const pendingOrdersCount = orders.filter((o) => o.estado === 'Abierto').length;
  const pendingBalance = orders
    .filter((o) => o.estado === 'Abierto')
    .reduce((sum, o) => sum + Math.max(0, o.saldo), 0);

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div
            id="brand-logo-btn"
            onClick={() => setActiveTab('list')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-900/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-['Outfit',sans-serif]">
                  ventas<span className="text-cyan-400">IA</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-pink-500 to-rose-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
                  TikTok Shop
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Papelería & Mochilas · Bolivia (Bs.)
              </p>
            </div>
          </div>

          {/* Quick Balance Status, VIKA Agent & Backup buttons */}
          <div className="flex items-center gap-2">
            {pendingBalance > 0 && (
              <div
                id="pending-balance-badge"
                className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-semibold"
                title="Total por cobrar en pedidos abiertos en Bolivianos"
              >
                <span>Por cobrar:</span>
                <span className="font-bold text-amber-200">
                  {formatCurrency(pendingBalance)}
                </span>
              </div>
            )}

            <button
              id="vika-header-btn"
              onClick={onOpenVika}
              className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600/90 to-cyan-500/90 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/30 border border-cyan-300/40 transition active:scale-95"
              title="Abrir agente de IA VIKA para ayudarte con pedidos y finanzas"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
              <span>VIKA</span>
              <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-mono">IA</span>
            </button>

            <button
              id="backup-btn"
              onClick={onOpenBackup}
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Copia de seguridad y respaldo"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Respaldar</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-slate-800/80">
          {/* Tab 1: Pedidos */}
          <button
            id="tab-orders-list"
            onClick={() => setActiveTab('list')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
            }`}
          >
            <ListOrdered className="w-4 h-4 shrink-0" />
            <span className="truncate">Pedidos</span>
            {pendingOrdersCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'list'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                {pendingOrdersCount}
              </span>
            )}
          </button>

          {/* Tab 2: Surtido / Mayorista */}
          <button
            id="tab-supply-list"
            onClick={() => setActiveTab('supply')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'supply'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                : 'bg-slate-800/60 text-purple-300 hover:bg-slate-800 hover:text-purple-200 border border-purple-500/20'
            }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0 text-purple-300" />
            <span className="truncate">Al Mayorista</span>
          </button>

          {/* Tab 3: Nuevo Pedido */}
          <button
            id="tab-new-order"
            onClick={() => setActiveTab('new')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'new'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 border border-cyan-300/40'
                : 'bg-slate-800/60 text-cyan-300 hover:bg-slate-800 hover:text-cyan-200 border border-cyan-500/20'
            }`}
          >
            <Mic className="w-4 h-4 shrink-0 text-cyan-300" />
            <span className="truncate">+ Nuevo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
