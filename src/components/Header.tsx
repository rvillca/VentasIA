import React, { useState } from 'react';
import {
  ShoppingBag,
  Mic,
  ListOrdered,
  ShoppingCart,
  Sparkles,
  BarChart3,
  Users,
  LogOut,
  KeyRound,
  Shield,
  Briefcase,
  Eye,
  PackagePlus,
  TrendingDown,
} from 'lucide-react';
import { ActiveTab, Order } from '../types';
import { formatCurrency } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  orders: Order[];
  onOpenVika: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  orders = [],
  onOpenVika,
}) => {
  const {
    userProfile,
    role,
    isJefe,
    isSupervisor,
    isComprador,
    isVendedor,
    canAccessCompras,
    canManageUsers,
    canViewReports,
    logout,
  } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const pendingOrdersCount = orders.filter((o) => o.estado === 'Abierto').length;
  const pendingBalance = orders
    .filter((o) => o.estado === 'Abierto')
    .reduce((sum, o) => sum + Math.max(0, o.saldo), 0);

  return (
    <>
      <header
        id="main-header"
        className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Logo & Brand */}
            <div
              id="brand-logo-btn"
              onClick={() => setActiveTab(isComprador ? 'compras' : 'list')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-900/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-['Outfit',sans-serif]">
                    Importadora <span className="text-cyan-400">Chiquiminisos</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-pink-500 to-rose-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Papelería y artículos Kawaii · Bolivia (Bs.)
                </p>
              </div>
            </div>

            {/* User Profile Badge, Change Password, VIKA & Logout */}
            <div className="flex items-center gap-2">
              {pendingBalance > 0 && !isComprador && (
                <div
                  id="pending-balance-badge"
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-semibold"
                  title="Total por cobrar en pedidos abiertos en Bolivianos"
                >
                  <span>Por cobrar:</span>
                  <span className="font-bold text-amber-200">
                    {formatCurrency(pendingBalance)}
                  </span>
                </div>
              )}

              {/* Current user role badge + Change password trigger */}
              <button
                id="my-profile-password-btn"
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-xl text-xs transition text-left group"
                title="Haz clic para cambiar tu contraseña"
              >
                <div className="flex flex-col text-right">
                  <span className="font-bold text-white leading-tight truncate max-w-[110px] sm:max-w-[140px] group-hover:text-cyan-300 transition">
                    {userProfile?.displayName || 'Usuario'}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {role === 'jefe'
                      ? '👑 Jefe / Admin'
                      : role === 'supervisor'
                      ? '📊 Supervisor'
                      : role === 'comprador'
                      ? '🛒 Comprador'
                      : '💼 Vendedor'}
                  </span>
                </div>
                <KeyRound className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
              </button>

              <button
                id="vika-header-btn"
                onClick={onOpenVika}
                className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600/90 to-cyan-500/90 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/30 border border-cyan-300/40 transition active:scale-95"
                title="Abrir asistente inteligente VIKA"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                <span>VIKA</span>
                <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-mono">IA</span>
              </button>

              <button
                id="logout-btn"
                onClick={() => logout()}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          {/* Dynamic Navigation Tabs Bar according to User Role */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2.5 pt-2 border-t border-slate-800/80 overflow-x-auto pb-0.5">
            {/* If Not Pure Comprador -> Show Ventas & Mayorista */}
            {!isComprador && (
              <>
                {/* Tab 1: Ventas */}
                <button
                  id="tab-orders-list"
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 min-w-[75px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                    activeTab === 'list'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Ventas</span>
                  {pendingOrdersCount > 0 && (
                    <span
                      className={`text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-bold hidden sm:inline ${
                        activeTab === 'list' ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300'
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
                  className={`flex-1 min-w-[85px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                    activeTab === 'supply'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                      : 'bg-slate-800/60 text-purple-300 hover:bg-slate-800 hover:text-purple-200 border border-purple-500/20'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-purple-300" />
                  <span className="truncate">Al Mayor</span>
                </button>

                {/* Tab 3: Nueva Venta */}
                <button
                  id="tab-new-order"
                  onClick={() => setActiveTab('new')}
                  className={`flex-1 min-w-[80px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                    activeTab === 'new'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 border border-cyan-300/40'
                      : 'bg-slate-800/60 text-cyan-300 hover:bg-slate-800 hover:text-cyan-200 border border-cyan-500/20'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-cyan-300" />
                  <span className="truncate">+ Venta</span>
                </button>
              </>
            )}

            {/* Tab: COMPRAS (Supervisor, Jefe, Comprador, o permiso autorizado) */}
            {canAccessCompras && (
              <button
                id="tab-compras-mgmt"
                onClick={() => setActiveTab('compras')}
                className={`flex-1 min-w-[85px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === 'compras'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold shadow-lg shadow-amber-900/40 border border-amber-300'
                    : 'bg-slate-800/60 text-amber-300 hover:bg-slate-800 hover:text-amber-200 border border-amber-500/30'
                }`}
              >
                <PackagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Compras</span>
              </button>
            )}

            {/* Tab: Reportes (Supervisor, Jefe, Comprador) */}
            {canViewReports && (
              <button
                id="tab-reports"
                onClick={() => setActiveTab('reports')}
                className={`flex-1 min-w-[85px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === 'reports'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/30'
                    : 'bg-slate-800/60 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 border border-emerald-500/20'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-400" />
                <span className="truncate">Reportes</span>
              </button>
            )}

            {/* Tab: Personal & Claves (Jefe y Supervisor) */}
            {(isJefe || isSupervisor) && (
              <button
                id="tab-users-mgmt"
                onClick={() => setActiveTab('users')}
                className={`flex-1 min-w-[80px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === 'users'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                    : 'bg-slate-800/60 text-purple-300 hover:bg-slate-800 hover:text-purple-200 border border-purple-500/20'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-purple-400" />
                <span className="truncate">Personal</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal for Current User */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};

