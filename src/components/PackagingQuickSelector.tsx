import React from 'react';
import { ALL_PACKAGING_PRESETS } from '../lib/packaging';
import { useTheme } from '../contexts/ThemeContext';

interface PackagingQuickSelectorProps {
  value: string;
  onChange: (newValue: string) => void;
  onSetQuantity?: (units: number) => void;
  theme?: 'indigo' | 'amber';
  size?: 'sm' | 'xs';
}

export const PackagingQuickSelector: React.FC<PackagingQuickSelectorProps> = ({
  value,
  onChange,
  onSetQuantity,
  theme = 'indigo',
  size = 'xs',
}) => {
  const { isDark } = useTheme();

  const getActiveClasses = () => {
    if (theme === 'amber') {
      return isDark
        ? 'bg-amber-400 text-slate-950 font-bold border-amber-400 shadow-sm'
        : 'bg-amber-500 text-white font-bold border-amber-500 shadow-sm';
    }
    return isDark
      ? 'bg-[#FF6FA5] text-[#0F1B3C] font-bold border-[#FF6FA5] shadow-sm'
      : 'bg-[#1A2B5C] text-white font-bold border-[#1A2B5C] shadow-sm';
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
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        {ALL_PACKAGING_PRESETS.map((preset) => {
          const isSelected = value === preset.label || value === preset.shortLabel;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onChange(preset.label);
              }}
              title={`Seleccionar ${preset.label} (${preset.units} unidades)`}
              className={`px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-medium transition active:scale-95 whitespace-nowrap cursor-pointer ${
                isSelected ? getActiveClasses() : getInactiveClasses()
              }`}
            >
              <span>{preset.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
