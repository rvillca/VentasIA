import React, { useState } from 'react';
import {
  X,
  Package,
  Sparkles,
  Check,
  Box,
  Gift,
  Tag,
  Layers,
  Edit3,
} from 'lucide-react';
import { ALL_PACKAGING_PRESETS, PackagingPreset } from '../lib/packaging';
import { useTheme } from '../contexts/ThemeContext';

interface PackagingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  currentValue: string;
  onSelect: (presetLabel: string, suggestedUnits?: number) => void;
}

export const PackagingSelectionModal: React.FC<PackagingSelectionModalProps> = ({
  isOpen,
  onClose,
  productName = 'Producto',
  currentValue,
  onSelect,
}) => {
  const { isDark } = useTheme();
  const [customText, setCustomText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'boxes' | 'docenas' | 'packs'>('all');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PackagingPreset) => {
    onSelect(preset.label, preset.units);
    onClose();
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customText.trim()) {
      onSelect(customText.trim());
      onClose();
    }
  };

  const filteredPresets = ALL_PACKAGING_PRESETS.filter((p) => {
    if (activeTab === 'boxes') return p.type === 'box' || p.type === 'half_box';
    if (activeTab === 'docenas') return p.type === 'dozen' || p.type === 'half_dozen';
    if (activeTab === 'packs') return p.type === 'unit';
    return true;
  });

  return (
    <div
      id="packaging-selection-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`border w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh] animate-slideUp ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between shadow-sm ${
            isDark ? 'bg-[#0F1B3C] text-white' : 'bg-[#1A2B5C] text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Package className="w-5 h-5 text-pink-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-['Outfit',sans-serif] tracking-tight leading-tight">
                Elegir Presentación / Box
              </h3>
              <p className="text-xs text-white/80 font-medium truncate max-w-[240px] sm:max-w-xs">
                Para: <span className="font-bold underline">{productName || 'Artículo'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition active:scale-95 cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Tab Selector */}
        <div
          className={`px-4 py-2.5 border-b flex gap-1.5 overflow-x-auto ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer ${
              activeTab === 'all'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white'
                : 'bg-white text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
            }`}
          >
            ✨ Todos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('boxes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer ${
              activeTab === 'boxes'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white'
                : 'bg-white text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
            }`}
          >
            📦 Cajas / Boxes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docenas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer ${
              activeTab === 'docenas'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white'
                : 'bg-white text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
            }`}
          >
            🎁 Docenas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('packs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer ${
              activeTab === 'packs'
                ? isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] text-white shadow-sm'
                : isDark
                ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white'
                : 'bg-white text-[#78716C] hover:text-[#1A2B5C] border border-[#E8DFC8]'
            }`}
          >
            🏷️ Unidades / Sets
          </button>
        </div>

        {/* Presets Grid with BIG Touch Targets */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <p className={`text-xs font-medium ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Toca el empaque o tamaño deseado para asignarlo cómodamente:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredPresets.map((preset) => {
              const isSelected =
                currentValue === preset.label || currentValue === preset.shortLabel;
              const isHalf = preset.type === 'half_box' || preset.type === 'half_dozen';

              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between gap-3 active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-[#0F1B3C] border-[#FF6FA5] text-white ring-2 ring-[#FF6FA5]/60 shadow-md'
                        : 'bg-[#FBF7EF] border-[#1A2B5C] text-[#1A2B5C] ring-2 ring-[#1A2B5C]/30 shadow-md'
                      : isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-white'
                      : 'bg-white hover:bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-base font-bold shadow-inner ${
                        preset.type === 'box'
                          ? isDark
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isHalf
                          ? isDark
                            ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border border-[#FF6FA5]/30'
                            : 'bg-pink-100 text-pink-700 border border-pink-200'
                          : preset.type === 'dozen'
                          ? isDark
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                          : isDark
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                      }`}
                    >
                      {preset.type === 'box' ? (
                        <Box className="w-5 h-5" />
                      ) : preset.type === 'dozen' ? (
                        <Gift className="w-5 h-5" />
                      ) : preset.type === 'unit' ? (
                        <Tag className="w-5 h-5" />
                      ) : (
                        <Layers className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={`font-extrabold text-sm sm:text-base block truncate ${
                        isDark ? 'text-white' : 'text-[#1A2B5C]'
                      }`}>
                        {preset.label}
                      </span>
                      <span className={`text-xs font-semibold flex items-center gap-1 ${
                        isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                      }`}>
                        <span>{preset.units} {preset.units === 1 ? 'unidad' : 'unidades'}</span>
                        {isHalf && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                            isDark
                              ? 'bg-[#FF6FA5]/20 text-[#FF6FA5] border-[#FF6FA5]/30'
                              : 'bg-[#1A2B5C]/10 text-[#1A2B5C] border-[#1A2B5C]/20'
                          }`}>
                            Medio
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isSelected ? (
                      <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center shadow-md ${
                        isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#1A2B5C]'
                      }`}>
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                        isDark
                          ? 'text-[#9AA6C9] bg-[#16234F] border-[#223368]'
                          : 'text-[#78716C] bg-[#FBF7EF] border-[#E8DFC8]'
                      }`}>
                        Elegir
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Packs extra buttons */}
          <div className="pt-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              ✨ Packs Rápidos Kawaii:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Pack x 3 u.', units: 3 },
                { label: 'Pack x 6 u.', units: 6 },
                { label: 'Pack x 10 u.', units: 10 },
                { label: 'Set Completo', units: 1 },
              ].map((pack) => (
                <button
                  key={pack.label}
                  type="button"
                  onClick={() => {
                    onSelect(pack.label, pack.units);
                    onClose();
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold text-center active:scale-95 transition border cursor-pointer ${
                    isDark
                      ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-white'
                      : 'bg-[#FBF7EF] hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  {pack.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Text Form */}
          <div className={`pt-3 border-t ${isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5 ${
              isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
            }`}>
              <Edit3 className="w-3.5 h-3.5" />
              ¿Otro empaque no listado? Escribe aquí:
            </span>
            <form onSubmit={handleApplyCustom} className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Ej. Exhibidor de 30 u., Blister x 4, Caja Master..."
                className={`flex-1 border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />
              <button
                type="submit"
                disabled={!customText.trim()}
                className={`px-4 py-2.5 disabled:opacity-40 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer ${
                  isDark
                    ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                    : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
                }`}
              >
                Aplicar
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t flex items-center justify-between ${
          isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
        }`}>
          <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Selecciona la presentación y se aplicará al artículo seleccionado.
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 border cursor-pointer ${
              isDark
                ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                : 'bg-white hover:bg-[#E8DFC8] text-[#1A2B5C] border-[#E8DFC8]'
            }`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
