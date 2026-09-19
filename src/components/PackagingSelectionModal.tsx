import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Check,
  Box,
  Gift,
  Tag,
  Layers,
  Edit3,
  Trash2,
  Sparkles,
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

  useEffect(() => {
    if (isOpen) {
      const isStandardPreset = ALL_PACKAGING_PRESETS.some(
        (p) => p.label === currentValue || p.shortLabel === currentValue
      );
      setCustomText(isStandardPreset ? '' : currentValue || '');
    }
  }, [isOpen, currentValue]);

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

  const handleClearVariant = () => {
    onSelect('');
    onClose();
  };

  const boxPresets = ALL_PACKAGING_PRESETS.filter(
    (p) => p.type === 'box' || p.type === 'half_box'
  );
  const dozenPresets = ALL_PACKAGING_PRESETS.filter(
    (p) => p.type === 'dozen' || p.type === 'half_dozen'
  );
  const unitPreset = ALL_PACKAGING_PRESETS.find((p) => p.type === 'unit') || {
    label: 'Unidad',
    shortLabel: '🏷️ Unidad (1u)',
    units: 1,
    type: 'unit',
    category: 'unit',
  };

  return (
    <div
      id="packaging-selection-modal-overlay"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slideUp border ${
          isDark
            ? 'bg-[#0F1B3C] border-[#223368] text-white'
            : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
        }`}
      >
        {/* Mobile Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-400/40 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div
          className={`px-5 py-3.5 flex items-center justify-between border-b shrink-0 ${
            isDark
              ? 'bg-[#16234F] border-[#223368] text-white'
              : 'bg-[#1A2B5C] border-[#1A2B5C] text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
                isDark ? 'bg-[#FF6FA5]/20 text-[#FF6FA5]' : 'bg-white/15 text-amber-300'
              }`}
            >
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black font-['Outfit',sans-serif] tracking-tight leading-tight">
                Elige el Box o Empaque
              </h3>
              <p className="text-xs text-white/80 font-medium truncate max-w-[220px] sm:max-w-xs">
                Para: <span className="font-bold underline">{productName || 'Artículo'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition active:scale-95 cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body: Primero los Boxes y Docenas, y al final Unidad / Ingreso Manual */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* 1. SECCIÓN PRINCIPAL: BOTONES DE LOS BOXES */}
          <div>
            <span
              className={`text-[11px] font-black uppercase tracking-wider block mb-2 flex items-center gap-1.5 ${
                isDark ? 'text-amber-400' : 'text-[#1A2B5C]'
              }`}
            >
              <Box className="w-4 h-4 text-amber-500" />
              <span>Cajas y Boxes:</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              {boxPresets.map((preset) => {
                const isSelected =
                  currentValue === preset.label || currentValue === preset.shortLabel;
                const isHalf = preset.type === 'half_box';

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset as PackagingPreset)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between gap-2 active:scale-[0.98] cursor-pointer min-h-[58px] ${
                      isSelected
                        ? isDark
                          ? 'bg-[#FF6FA5]/20 border-[#FF6FA5] text-white ring-2 ring-[#FF6FA5]/40 shadow-md'
                          : 'bg-[#FBF7EF] border-[#1A2B5C] text-[#1A2B5C] ring-2 ring-[#1A2B5C]/30 shadow-md'
                        : isDark
                        ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-white'
                        : 'bg-[#FBF7EF] hover:bg-white border-[#E8DFC8] text-[#1A2B5C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                          isHalf
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <Box className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs sm:text-sm block truncate leading-tight">
                          {preset.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold block ${
                            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                          }`}
                        >
                          {preset.units} {preset.units === 1 ? 'u.' : 'unidades'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 shadow-sm ${
                          isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#1A2B5C] text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DOCENAS */}
          <div>
            <span
              className={`text-[11px] font-black uppercase tracking-wider block mb-2 flex items-center gap-1.5 ${
                isDark ? 'text-purple-400' : 'text-purple-700'
              }`}
            >
              <Gift className="w-4 h-4 text-purple-500" />
              <span>Docenas:</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              {dozenPresets.map((preset) => {
                const isSelected =
                  currentValue === preset.label || currentValue === preset.shortLabel;

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset as PackagingPreset)}
                    className={`p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between gap-2 active:scale-[0.98] cursor-pointer min-h-[56px] ${
                      isSelected
                        ? isDark
                          ? 'bg-[#FF6FA5]/20 border-[#FF6FA5] text-white ring-2 ring-[#FF6FA5]/40 shadow-md'
                          : 'bg-[#FBF7EF] border-[#1A2B5C] text-[#1A2B5C] ring-2 ring-[#1A2B5C]/30 shadow-md'
                        : isDark
                        ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-white'
                        : 'bg-[#FBF7EF] hover:bg-white border-[#E8DFC8] text-[#1A2B5C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs sm:text-sm block truncate leading-tight">
                          {preset.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold block ${
                            isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                          }`}
                        >
                          {preset.units} unidades
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 shadow-sm ${
                          isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#1A2B5C] text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. PARTE FINAL: OPCIÓN DE UNIDAD, PACKS Y MANUAL (como solicitó el usuario) */}
          <div
            className={`pt-3 border-t space-y-3 ${
              isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
            }`}
          >
            <span
              className={`text-[11px] font-black uppercase tracking-wider block flex items-center gap-1.5 ${
                isDark ? 'text-[#FF6FA5]' : 'text-[#78716C]'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-teal-500" />
              <span>Otras Opciones (Unidad o Manual):</span>
            </span>

            {/* Botón de Venta Suelta / Unidad */}
            <div>
              <button
                type="button"
                onClick={() => handleSelectPreset(unitPreset as PackagingPreset)}
                className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between gap-3 active:scale-[0.98] cursor-pointer min-h-[52px] ${
                  currentValue === 'Unidad' || currentValue === '🏷️ Unidad (1u)' || !currentValue
                    ? isDark
                      ? 'bg-teal-500/20 border-teal-400 text-white ring-2 ring-teal-400/40'
                      : 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-500/20'
                    : isDark
                    ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-white'
                    : 'bg-white hover:bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-sm block">Vender por Unidad Suelta</span>
                    <span
                      className={`text-[11px] font-medium block ${
                        isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                      }`}
                    >
                      Sin empaque especial (1 sola unidad)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-teal-500 text-white shadow-xs">
                  Elegir Unidad
                </span>
              </button>
            </div>

            {/* Packs rápidos adicionales */}
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
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center active:scale-95 transition border cursor-pointer ${
                    isDark
                      ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-slate-200'
                      : 'bg-[#FBF7EF] hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
                  }`}
                >
                  {pack.label}
                </button>
              ))}
            </div>

            {/* Ingreso manual libre */}
            <div
              className={`p-3 rounded-2xl border ${
                isDark ? 'bg-[#16234F]/70 border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Ingreso Manual personalizado:
              </span>
              <form onSubmit={handleApplyCustom} className="flex gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Ej. Blister x 4, Color Rosa, Exhibidor..."
                  className={`flex-1 border rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/50 focus:ring-2 focus:ring-[#FF6FA5]'
                      : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50 focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!customText.trim()}
                  className={`px-3.5 py-2 disabled:opacity-40 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer ${
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
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-3 border-t flex items-center justify-between gap-2 shrink-0 ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}
        >
          {currentValue ? (
            <button
              type="button"
              onClick={handleClearVariant}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5 cursor-pointer"
              title="Dejar este artículo sin empaque o variante"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar</span>
            </button>
          ) : (
            <span className={`text-[11px] font-medium ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Toca un botón para elegir
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 border cursor-pointer ${
              isDark
                ? 'bg-[#0F1B3C] hover:bg-[#16234F] text-white border-[#223368]'
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
