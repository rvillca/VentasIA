import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useFinancialPrivacy } from '../contexts/FinancialPrivacyContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface BalanceToggleBtnProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md';
}

export const BalanceToggleBtn: React.FC<BalanceToggleBtnProps> = ({
  className = '',
  showText = true,
  size = 'sm',
}) => {
  const { showBalances, toggleShowBalances } = useFinancialPrivacy();
  const { isDark } = useTheme();
  const { isJefe, isSupervisor } = useAuth();

  // Only relevant for Jefe and Supervisor
  if (!isJefe && !isSupervisor) {
    return null;
  }

  return (
    <button
      id="btn-toggle-balance-visibility"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleShowBalances();
      }}
      title={showBalances ? 'Ocultar saldos (modo privacidad)' : 'Mostrar saldos (modo seguro)'}
      aria-label={showBalances ? 'Ocultar saldos' : 'Mostrar saldos'}
      className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer select-none active:scale-95 ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'
      } ${
        showBalances
          ? isDark
            ? 'bg-amber-400/15 border border-amber-400/40 text-amber-300 hover:bg-amber-400/25'
            : 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
          : isDark
          ? 'bg-[#16234F] border border-[#223368] text-[#9AA6C9] hover:text-white hover:bg-[#1C2C66]'
          : 'bg-[#F5EFE0] border border-[#E8DFC8] text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#EBE2CF]'
      } ${className}`}
    >
      {showBalances ? (
        <>
          <Eye className={size === 'sm' ? 'w-3.5 h-3.5 text-amber-500' : 'w-4 h-4 text-amber-500'} />
          {showText && <span className="hidden sm:inline">Ocultar saldos</span>}
        </>
      ) : (
        <>
          <EyeOff className={size === 'sm' ? 'w-3.5 h-3.5 text-[#78716C]' : 'w-4 h-4 text-[#78716C]'} />
          {showText && <span className="hidden sm:inline">Ver saldos</span>}
        </>
      )}
    </button>
  );
};
