import React, { useState } from 'react';
import {
  ShoppingBag,
  ListOrdered,
  Truck,
  PlusCircle,
  BarChart3,
  Users,
  LogOut,
  KeyRound,
  PackagePlus,
  Sun,
  Moon,
} from 'lucide-react';
import { ActiveTab, Order } from '../types';
import { formatCurrency } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ChangePasswordModal } from './ChangePasswordModal';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  orders: Order[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  orders = [],
}) => {
  const {
    userProfile,
    role,
    isJefe,
    isSupervisor,
    isComprador,
    isVendedor,
    canAccessCompras,
    canViewReports,
    logout,
  } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const pendingOrdersCount = orders.filter((o) => o.estado === 'Abierto').length;
  const pendingBalance = orders
    .filter((o) => o.estado === 'Abierto')
    .reduce((sum, o) => sum + Math.max(0, o.saldo), 0);

  return (
    <>
      <header
        id="main-header"
        className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-md transition-colors duration-200 ${
          isDark
            ? 'bg-[#0F1B3C]/95 border-[#223368] text-white'
            : 'bg-[#FBF7EF]/95 border-[#E8DFC8] text-[#1A2B5C] shadow-[#E8DFC8]/40'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Logo & Brand */}
            <div
              id="brand-logo-btn"
              onClick={() => setActiveTab(isComprador ? 'compras' : 'list')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF6FA5] via-rose-500 to-[#1A2B5C] p-0.5 shadow-md shadow-[#FF6FA5]/20 flex items-center justify-center">
                <div
                  className={`w-full h-full rounded-[14px] flex items-center justify-center transition-colors ${
                    isDark ? 'bg-[#0F1B3C]' : 'bg-[#FFFFFF]'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5 text-[#FF6FA5] group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-extrabold text-base sm:text-lg tracking-tight font-['Outfit',sans-serif] ${
                      isDark ? 'text-white' : 'text-[#1A2B5C]'
                    }`}
                  >
                    Importadora <span className="text-[#FF6FA5]">Chiquiminisos</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#FF6FA5] to-rose-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                    ✨ Kawaii
                  </span>
                </div>
                <p
                  className={`text-[11px] hidden sm:block ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Papelería y Novedades Kawaii · Bolivia (Bs.)
                </p>
              </div>
            </div>

            {/* Actions: Theme Toggle, User Profile Badge, Password & Logout */}
            <div className="flex items-center gap-2">
              {pendingBalance > 0 && !isComprador && (
                <div
                  id="pending-balance-badge"
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
                    isDark
                      ? 'bg-[#FFA26B]/15 border-[#FFA26B]/30 text-[#FFA26B]'
                      : 'bg-[#FFF7ED] border-[#FED7AA] text-[#C2410C]'
                  }`}
                  title="Total por cobrar en pedidos abiertos en Bolivianos"
                >
                  <span>Por cobrar:</span>
                  <span className="font-extrabold">{formatCurrency(pendingBalance)}</span>
                </div>
              )}

              {/* Theme Mode Toggle (Modo Claro / Modo Oscuro) */}
              <button
                id="theme-toggle-btn"
                onClick={toggleTheme}
                type="button"
                className={`p-2 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
                  isDark
                    ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-amber-300 border-[#223368]'
                    : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border-[#E8DFC8]'
                }`}
                title={isDark ? 'Cambiar a Modo Claro ☀️' : 'Cambiar a Modo Oscuro 🌙'}
                aria-label="Cambiar tema"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-[#1A2B5C]" />
                )}
              </button>

              {/* Current user role badge + Change password trigger */}
              <button
                id="my-profile-password-btn"
                onClick={() => setIsPasswordModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs transition text-left group border ${
                  isDark
                    ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] hover:border-[#FF6FA5]/40 text-white'
                    : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] border-[#E8DFC8] hover:border-[#1A2B5C]/40 text-[#1A2B5C]'
                }`}
                title="Haz clic para cambiar tu contraseña"
              >
                <div className="flex flex-col text-right">
                  <span className="font-bold leading-tight truncate max-w-[100px] sm:max-w-[130px] group-hover:text-[#FF6FA5] transition">
                    {userProfile?.displayName || 'Usuario'}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold ${
                      isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                    }`}
                  >
                    {role === 'jefe'
                      ? '👑 Jefa / Admin'
                      : role === 'supervisor'
                      ? '📊 Supervisora'
                      : role === 'comprador'
                      ? '🛒 Compradora'
                      : '💼 Vendedora'}
                  </span>
                </div>
                <KeyRound className="w-3.5 h-3.5 text-[#FF6FA5] group-hover:scale-110 transition" />
              </button>

              <button
                id="logout-btn"
                onClick={() => logout()}
                className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs ${
                  isDark
                    ? 'text-[#9AA6C9] hover:text-rose-300 hover:bg-[#16234F]'
                    : 'text-[#78716C] hover:text-rose-600 hover:bg-[#F5EFE0]'
                }`}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          {/* Dynamic Navigation Tabs Bar according to User Role */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 mt-2 pt-2 border-t overflow-x-auto pb-0.5 ${
              isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
            }`}
          >
            {/* VENDEDOR ROLE ONLY: Only "Ventas" and "Pendientes de Envío" */}
            {isVendedor && (
              <>
                {/* Tab 1: Ventas */}
                <button
                  id="tab-orders-list"
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                    activeTab === 'list' || activeTab === 'new' || activeTab === 'detail' || activeTab === 'edit'
                      ? isDark
                        ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md shadow-[#FF6FA5]/20'
                        : 'bg-[#1A2B5C] text-white shadow-md shadow-[#1A2B5C]/20'
                      : isDark
                      ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white border border-[#223368]'
                      : 'bg-[#F5EFE0] text-[#1A2B5C] hover:bg-[#EBE2CF] border border-[#E8DFC8]'
                  }`}
                >
                  <ListOrdered className="w-4 h-4 shrink-0" />
                  <span className="truncate">Ventas</span>
                </button>

                {/* Tab 2: Pendientes de Envío */}
                <button
                  id="tab-shipping-list"
                  onClick={() => setActiveTab('shipping')}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                    activeTab === 'shipping'
                      ? isDark
                        ? 'bg-[#B39DDB] text-[#2E1065] font-black shadow-md shadow-[#B39DDB]/20'
                        : 'bg-[#1A2B5C] text-white shadow-md shadow-[#1A2B5C]/20'
                      : isDark
                      ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white border border-[#223368]'
                      : 'bg-[#F5EFE0] text-[#1A2B5C] hover:bg-[#EBE2CF] border border-[#E8DFC8]'
                  }`}
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  <span className="truncate">Pendientes de Envío</span>
                  {pendingOrdersCount > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#FF6FA5] text-[#1A2B5C]'
                    }`}>
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* SUPERVISOR / JEFE: Full Access to all Modules */}
            {(isJefe || isSupervisor) && (
              <>
                {/* Tab 1: Ventas */}
                <button
                  id="tab-orders-list"
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 min-w-[75px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                    activeTab === 'list' || activeTab === 'new' || activeTab === 'detail' || activeTab === 'edit'
                      ? isDark
                        ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black shadow-md shadow-[#FF6FA5]/20'
                        : 'bg-[#1A2B5C] text-white shadow-md shadow-[#1A2B5C]/20'
                      : isDark
                      ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white border border-[#223368]'
                      : 'bg-[#F5EFE0] text-[#1A2B5C] hover:bg-[#EBE2CF] border border-[#E8DFC8]'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Ventas</span>
                </button>

                {/* Tab 2: Pendientes de Envío */}
                <button
                  id="tab-shipping-list"
                  onClick={() => setActiveTab('shipping')}
                  className={`flex-1 min-w-[85px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                    activeTab === 'shipping'
                      ? isDark
                        ? 'bg-[#B39DDB] text-[#2E1065] font-black shadow-md shadow-[#B39DDB]/20'
                        : 'bg-[#1A2B5C] text-white shadow-md shadow-[#1A2B5C]/20'
                      : isDark
                      ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white border border-[#223368]'
                      : 'bg-[#F5EFE0] text-[#1A2B5C] hover:bg-[#EBE2CF] border border-[#E8DFC8]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Envíos</span>
                  {pendingOrdersCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black hidden sm:inline ${
                      isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#FF6FA5] text-[#1A2B5C]'
                    }`}>
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Tab: COMPRAS (Supervisor, Jefe, Comprador) */}
            {canAccessCompras && (
              <button
                id="tab-compras-mgmt"
                onClick={() => setActiveTab('compras')}
                className={`flex-1 min-w-[85px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === 'compras'
                    ? isDark
                      ? 'bg-[#FFA26B] text-[#7C2D12] font-black shadow-md shadow-[#FFA26B]/20'
                      : 'bg-[#EA580C] text-white font-bold shadow-md shadow-[#EA580C]/20'
                    : isDark
                    ? 'bg-[#16234F] text-[#FFA26B] hover:text-white border border-[#223368]'
                    : 'bg-[#F5EFE0] text-[#C2410C] hover:bg-[#EBE2CF] border border-[#E8DFC8]'
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
                className={`flex-1 min-w-[85px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === 'reports'
                    ? isDark
                      ? 'bg-[#4FD1B5] text-[#064E3B] font-black shadow-md shadow-[#4FD1B5]/20'
                      : 'bg-[#0F766E] text-white font-bold shadow-md shadow-[#0F766E]/20'
                    : isDark
                    ? 'bg-[#16234F] text-[#4FD1B5] hover:text-white border border-[#223368]'
                    : 'bg-[#F5EFE0] text-[#0F766E] hover:bg-[#EBE2CF] border border-[#E8DFC8]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Reportes</span>
              </button>
            )}

            {/* Tab: Personal & Claves (Jefe y Supervisor) */}
            {(isJefe || isSupervisor) && (
              <button
                id="tab-users-mgmt"
                onClick={() => setActiveTab('users')}
                className={`flex-1 min-w-[80px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === 'users'
                    ? isDark
                      ? 'bg-[#B39DDB] text-[#2E1065] font-black shadow-md shadow-[#B39DDB]/20'
                      : 'bg-[#1A2B5C] text-white font-bold shadow-md shadow-[#1A2B5C]/20'
                    : isDark
                    ? 'bg-[#16234F] text-[#B39DDB] hover:text-white border border-[#223368]'
                    : 'bg-[#F5EFE0] text-[#1A2B5C] hover:bg-[#EBE2CF] border border-[#E8DFC8]'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
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
