import React from 'react';
import {
  X,
  Sparkles,
  Package,
  Mic,
  CheckCircle2,
  Copy,
  Lightbulb,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface VikaGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

export const VikaGuideModal: React.FC<VikaGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  const { isDark } = useTheme();
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const examples = [
    {
      title: 'Pedido con Boxes y Docenas',
      dictado:
        'Arma un pedido de 1 box de 48 de gomas Kitty más una docena de bolígrafos Sanrio más 1 box de 24 de TAJADORES KUROMI',
      explicacion:
        'VIKA creará 3 productos exactos con sus cantidades y formatos (Box 48u, Docena 12u, Box 24u) listos para que ingreses los precios en el formulario.',
    },
    {
      title: 'Pedido Mixto con Media Docena y Unidades',
      dictado:
        'Quiero 2 docenas de libretas Kuromi, media docena de estuches Stitch y 3 mochilas Spiderman para Camila',
      explicacion:
        'VIKA reconoce "media docena", "2 docenas" y 3 mochilas, asignando también a Camila como cliente.',
    },
    {
      title: 'Box de 36 y 60 Unidades con Destino',
      dictado:
        '1 box de 36 plumones kawaii y 1 box de 60 stickers Sanrio para entregar en Teleférico Morado al 71234567',
      explicacion:
        'Extrae los 2 boxes de papelería, el punto de entrega y el número de WhatsApp (+591).',
    },
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      id="vika-guide-modal"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        className={`border rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shadow-sm ${
            isDark
              ? 'bg-[#0F1B3C] border-[#223368] text-white'
              : 'bg-[#1A2B5C] border-[#1A2B5C] text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-inner">
              <Lightbulb className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-1.5">
                Guía de Dictado con VIKA IA
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                  Bolivia 🇧🇴
                </span>
              </h2>
              <p className="text-xs text-white/80">
                Aprende a dictar tus pedidos en boxes, docenas y unidades
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Key Rule Box */}
          <div
            className={`border rounded-2xl p-4 space-y-2 ${
              isDark
                ? 'bg-[#0F1B3C] border-[#223368]'
                : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
              isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
            }`}>
              <Sparkles className="w-4 h-4 text-amber-400" />
              ¿Cómo funciona el armado de pedidos?
            </div>
            <p className={`leading-relaxed text-xs sm:text-[13px] ${isDark ? 'text-slate-300' : 'text-[#78716C]'}`}>
              VIKA está entrenada para <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>identificar productos, paquetes y cantidades exactas</strong>. No necesitas preocuparte por los precios al dictar: VIKA creará la lista limpia y luego le colocas los precios en el formulario con cálculo automático del total en <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>Bolivianos (Bs.)</strong>.
            </p>
          </div>

          {/* Formats Supported */}
          <div className="space-y-2.5">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-cyan-300' : 'text-[#1A2B5C]'
            }`}>
              <Package className="w-4 h-4" />
              Presentaciones y Unidades Soportadas
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className={`border rounded-xl p-2.5 text-center ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}>
                <span className={`block font-bold text-xs ${isDark ? 'text-purple-300' : 'text-[#1A2B5C]'}`}>📦 Box Entero</span>
                <span className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>24, 36, 48 ó 60 u.</span>
              </div>
              <div className={`border rounded-xl p-2.5 text-center ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}>
                <span className={`block font-bold text-xs ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>📦 Medio Box (½)</span>
                <span className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>12, 18, 24 ó 30 u.</span>
              </div>
              <div className={`border rounded-xl p-2.5 text-center ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}>
                <span className={`block font-bold text-xs ${isDark ? 'text-indigo-300' : 'text-[#1A2B5C]'}`}>🎁 1 Docena</span>
                <span className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>12 unidades</span>
              </div>
              <div className={`border rounded-xl p-2.5 text-center ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}>
                <span className={`block font-bold text-xs ${isDark ? 'text-cyan-300' : 'text-[#1A2B5C]'}`}>✨ Media Docena</span>
                <span className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>6 unidades</span>
              </div>
              <div className={`border rounded-xl p-2.5 text-center sm:col-span-2 ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}>
                <span className={`block font-bold text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>🏷️ Unidad Suelta</span>
                <span className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>1 pieza individual</span>
              </div>
            </div>
          </div>

          {/* Example Dictations */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-amber-300' : 'text-[#1A2B5C]'
            }`}>
              <Mic className="w-4 h-4" />
              Ejemplos Prácticos de Dictado
            </h3>

            <div className="space-y-2.5">
              {examples.map((ex, idx) => (
                <div
                  key={idx}
                  className={`border rounded-2xl p-3.5 space-y-2 transition ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                      {ex.title}
                    </span>
                    <div className="flex items-center gap-1">
                      {onSelectPrompt && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPrompt(ex.dictado);
                            onClose();
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition border cursor-pointer ${
                            isDark
                              ? 'bg-[#16234F] text-[#FF6FA5] border-[#223368]'
                              : 'bg-white text-[#1A2B5C] border-[#E8DFC8]'
                          }`}
                        >
                          Usar este ejemplo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(ex.dictado, idx)}
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                        }`}
                        title="Copiar texto"
                      >
                        {copiedIndex === idx ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className={`border rounded-xl p-2.5 text-xs font-mono leading-relaxed ${
                    isDark
                      ? 'bg-[#16234F] border-[#223368] text-white'
                      : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                  }`}>
                    "{ex.dictado}"
                  </div>

                  <p className={`text-[11px] leading-snug ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                    {ex.explicacion}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Step by Step Flow */}
          <div className={`border rounded-2xl p-4 space-y-2 ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}>
            <h4 className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Flujo Rápido de 3 Pasos:
            </h4>
            <ol className={`list-decimal list-inside space-y-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-[#78716C]'}`}>
              <li>
                <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>Habla o escribe a VIKA</strong> con tus artículos (ej. 1 box de 48, 1 docena, etc.).
              </li>
              <li>
                VIKA arma la lista ordenada y tocas <strong className={isDark ? 'text-white' : 'text-[#1A2B5C]'}>«Cargar a Nuevo Pedido y Asignar Precios»</strong>.
              </li>
              <li>
                Colocas los precios unitarios (Bs.) en el formulario, se auto-calcula el total y guardas.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex justify-end ${
          isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer ${
              isDark
                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
            }`}
          >
            ¡Entendido, vamos a dictar!
          </button>
        </div>
      </div>
    </div>
  );
};
