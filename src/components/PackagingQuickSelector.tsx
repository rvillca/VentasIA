import React from 'react';
import { ALL_PACKAGING_PRESETS, PackagingPreset } from '../lib/packaging';

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
  const activeBg =
    theme === 'amber'
      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
      : 'bg-indigo-600 text-white font-bold border-indigo-400 shadow-sm';

  const inactiveBg =
    theme === 'amber'
      ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60 hover:text-amber-200'
      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60 hover:text-indigo-200';

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
              className={`px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-medium transition active:scale-95 whitespace-nowrap ${
                isSelected ? activeBg : inactiveBg
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
