import React from 'react';
import {
  X,
  Sparkles,
  Package,
  Mic,
  CheckCircle2,
  Copy,
  Lightbulb,
  Layers,
  Bot,
  DollarSign,
} from 'lucide-react';

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
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-purple-500/30">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-purple-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-900/40">
              <Lightbulb className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-1.5">
                Guía de Dictado con VIKA IA
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  Bolivia 🇧🇴
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Aprende a dictar tus pedidos en boxes, docenas y unidades
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-200">
          {/* Key Rule Box */}
          <div className="bg-gradient-to-br from-purple-950/40 to-slate-950 border border-purple-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              ¿Cómo funciona el armado de pedidos?
            </div>
            <p className="text-slate-300 leading-relaxed text-xs sm:text-[13px]">
              VIKA está entrenada para <strong>identificar productos, paquetes y cantidades exactas</strong>. No necesitas preocuparte por los precios al dictar: VIKA creará la lista limpia y luego le colocas los precios en el formulario con cálculo automático del total en <strong>Bolivianos (Bs.)</strong>.
            </p>
          </div>

          {/* Formats Supported */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              Presentaciones y Unidades Soportadas
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="block text-purple-400 font-bold text-xs">📦 Box</span>
                <span className="text-[11px] text-slate-400">24, 36, 48 ó 60 u.</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="block text-indigo-400 font-bold text-xs">🎁 1 Docena</span>
                <span className="text-[11px] text-slate-400">12 unidades</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="block text-cyan-400 font-bold text-xs">✨ Media Docena</span>
                <span className="text-[11px] text-slate-400">6 unidades</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="block text-emerald-400 font-bold text-xs">🏷️ Unidad</span>
                <span className="text-[11px] text-slate-400">1 pieza suelta</span>
              </div>
            </div>
          </div>

          {/* Example Dictations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-4 h-4" />
              Ejemplos Prácticos de Dictado
            </h3>

            <div className="space-y-2.5">
              {examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-purple-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-200">
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
                          className="px-2 py-0.5 bg-purple-600/30 hover:bg-purple-600/60 text-purple-200 rounded-lg text-[10px] font-semibold transition"
                        >
                          Usar este ejemplo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(ex.dictado, idx)}
                        className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                        title="Copiar texto"
                      >
                        {copiedIndex === idx ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono leading-relaxed">
                    "{ex.dictado}"
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">
                    {ex.explicacion}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Step by Step Flow */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Flujo Rápido de 3 Pasos:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
              <li>
                <strong>Habla o escribe a VIKA</strong> con tus artículos (ej. 1 box de 48, 1 docena, etc.).
              </li>
              <li>
                VIKA arma la lista ordenada y tocas <strong>«Cargar a Nuevo Pedido y Asignar Precios»</strong>.
              </li>
              <li>
                Colocas los precios unitarios (Bs.) en el formulario, se auto-calcula el total y guardas.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition active:scale-95"
          >
            ¡Entendido, vamos a dictar!
          </button>
        </div>
      </div>
    </div>
  );
};
