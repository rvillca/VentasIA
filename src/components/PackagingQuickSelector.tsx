import React from 'react';
import { Box, X, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PackagingQuickSelectorProps {
  value: string;
  onChange: (newValue: string) => void;
  onOpenCustomModal?: () => void;
  onSetQuantity?: (units: number) => void;
  theme?: 'indigo' | 'amber';
  placeholder?: string;
}

const POPULAR_PRESETS = [
  { label: 'Unidad', shortLabel: '🏷️ Unidad (1u)' },
  { label: 'Docena (12 u.)', shortLabel: '🎁 Docena (12u)' },
  { label: 'Box de 24 u.', shortLabel: '📦 Box 24u' },
  { label: 'Medio Box de 24 (12 u.)', shortLabel: '📦 ½ Box 24' },
  { label: 'Box de 36 u.', shortLabel: '📦 Box 36u' },
  { label: 'Box de 48 u.', shortLabel: '📦 Box 48u' },
];

export const PackagingQuickSelector: React.FC<PackagingQuickSelectorProps> = ({
  value,
  onChange,
  onOpenCustomModal,
  theme = 'indigo',
  placeholder = 'Escribe presentación manual o elige un Box...',
}) => {
  const { isDark } = useTheme();

  const getActiveClasses = () => {
    if (theme === 'amber') {
      return isDark
        ? 'bg-amber-400 text-slate-950 font-black border-amber-400 shadow-sm'
        : 'bg-amber-500 text-white font-black border-amber-500 shadow-sm';
    }
    return isDark
      ? 'bg-[#FF6FA5] text-[#0F1B3C] font-black border-[#FF6FA5] shadow-sm'
      : 'bg-[#1A2B5C] text-white font-black border-[#1A2B5C] shadow-sm';
  };

  const getInactiveClasses = () => {
    if (theme === 'amber') {
      return isDark
        ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-slate-300 border-[#223368] hover:text-amber-200'
        : 'bg-white hover:bg-[#F5EFE0] text-[#78716C] border-[#E8DFC8] hover:text-amber-700';
    }
    return isDark
      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-[#9AA6C9] border-[#223368] hover:text-white'
      : 'bg-white hover:bg-[#F5EFE0] text-[#78716C] border-[#E8DFC8] hover:text-[#1A2B5C]';
  };

  return (
    <div className="space-y-1.5">
      {/* Fila 1: Campo de ingreso manual directo + Botón emergente con touch target amplio */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full border rounded-xl py-2 pl-3 pr-8 text-xs sm:text-sm font-semibold transition focus:outline-none ${
              isDark
                ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/50 focus:ring-2 focus:ring-[#FF6FA5]'
                : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50 focus:ring-2 focus:ring-[#1A2B5C]'
            }`}
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              title="Borrar texto manual"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {onOpenCustomModal && (
          <button
            type="button"
            onClick={onOpenCustomModal}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer shrink-0 min-h-[38px] ${
              theme === 'amber'
                ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600'
                : isDark
                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] border border-[#FF6FA5]'
                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white border border-[#1A2B5C]'
            }`}
            title="Abrir ventana emergente con todos los Boxes y presentaciones"
          >
            <Box className="w-4 h-4" />
            <span>Elegir Box</span>
          </button>
        )}
      </div>

      {/* Fila 2: Accesos rápidos con botones grandes y cómodos para tocar desde el celular */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
          }`}
        >
          Rápido:
        </span>

        {POPULAR_PRESETS.map((preset) => {
          const isSelected = value === preset.label || value === preset.shortLabel;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.label)}
              title={`Seleccionar ${preset.label}`}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition active:scale-95 whitespace-nowrap cursor-pointer min-h-[32px] flex items-center ${
                isSelected ? getActiveClasses() : getInactiveClasses()
              }`}
            >
              <span>{preset.shortLabel}</span>
            </button>
          );
        })}

        {onOpenCustomModal && (
          <button
            type="button"
            onClick={onOpenCustomModal}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition active:scale-95 whitespace-nowrap cursor-pointer min-h-[32px] flex items-center gap-1 ${
              isDark
                ? 'bg-[#16234F] text-[#FF6FA5] border-[#FF6FA5]/40 hover:bg-[#1E2D5A]'
                : 'bg-white text-[#1A2B5C] border-[#1A2B5C]/30 hover:bg-[#F5EFE0]'
            }`}
            title="Ver todas las opciones en la ventana emergente"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Ver más...</span>
          </button>
        )}
      </div>
    </div>
  );
};
