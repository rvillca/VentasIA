import React, { useRef, useState } from 'react';
import {
  X,
  Package,
  Share2,
  Copy,
  Check,
  Download,
  Phone,
  MapPin,
  User,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Order } from '../types';
import {
  formatCurrency,
  generateWhatsAppPreparationText,
  formatArticleItem,
} from '../lib/storage';
import { useTheme } from '../contexts/ThemeContext';

interface OrderPreparationCardModalProps {
  order: Order;
  onClose: () => void;
}

export const OrderPreparationCardModal: React.FC<OrderPreparationCardModalProps> = ({
  order,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const totalPiezas = order.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const dateFormatted = new Date(order.createdAt).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyText = () => {
    const text = generateWhatsAppPreparationText(order);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppPreparationText(order));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Generate canvas image of the preparation sheet with LARGE, ultra-clear fonts for warehouse
  const generateCanvas = (): HTMLCanvasElement => {
    const width = 720;
    const padding = 34;
    const itemHeight = 60;
    const baseHeight = 520;
    const height = baseHeight + order.productos.length * itemHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // 2x retina
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.scale(2, 2);

    // Background - Clean Cream / White
    ctx.fillStyle = '#FBF7EF';
    ctx.fillRect(0, 0, width, height);

    // Header bar (Chic Navy Kawaii)
    ctx.fillStyle = '#1A2B5C';
    ctx.fillRect(0, 0, width, 94);

    // Title text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillText('📦 ORDEN DE PREPARACIÓN Y EMPAQUE', padding, 40);

    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#FFB5D0';
    ctx.fillText('✨ Importadora Chiquiminisos · Control de Almacén y Despacho', padding, 68);

    // Order # Badge (Big, contrasty)
    const badgeText = `PEDIDO #${String(order.orderNumber).padStart(3, '0')}`;
    ctx.fillStyle = '#FF6FA5';
    ctx.fillRect(width - padding - 150, 26, 150, 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, width - padding - 75, 53);
    ctx.textAlign = 'left';

    // Client Info Box (White with warm border)
    let y = 120;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E8DFC8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(padding, y, width - padding * 2, 116);
    ctx.strokeRect(padding, y, width - padding * 2, 116);

    ctx.fillStyle = '#78716C';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillText('CLIENTE:', padding + 16, y + 28);
    ctx.fillText('DESTINO / ENVÍO:', padding + 16, y + 60);
    ctx.fillText('TELÉFONO / FECHA:', padding + 16, y + 92);

    ctx.fillStyle = '#1A2B5C';
    ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
    ctx.fillText(order.cliente || 'Cliente Mostrador', padding + 90, y + 28);

    ctx.fillStyle = '#059669'; // Emerald for location
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText(order.lugarEntrega || 'Mostrador / Por coordinar', padding + 152, y + 60);

    ctx.fillStyle = '#44403C';
    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${order.telefono || 'Sin teléfono'}   ·   ${dateFormatted}`, padding + 160, y + 92);

    // Items Section Header (Prominent)
    y += 145;
    ctx.fillStyle = '#1A2B5C';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`📋 LISTA DE ARTÍCULOS (${totalPiezas} piezas en total)`, padding, y);

    ctx.strokeStyle = '#E8DFC8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, y + 10);
    ctx.lineTo(width - padding, y + 10);
    ctx.stroke();

    // Items list with BIG, legible typography
    y += 32;
    order.productos.forEach((prod, i) => {
      // Row box (White / Light Cream alternate)
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F5EFE0';
      ctx.fillRect(padding, y - 20, width - padding * 2, itemHeight);
      ctx.strokeStyle = '#E8DFC8';
      ctx.strokeRect(padding, y - 20, width - padding * 2, itemHeight);

      // Checkbox placeholder square
      ctx.strokeStyle = '#1A2B5C';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(padding + 12, y - 9, 20, 20);

      // Article Formatted Item (Clear & prominent)
      ctx.fillStyle = '#1A2B5C';
      ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
      let title = formatArticleItem(prod);
      if (title.length > 56) title = title.substring(0, 54) + '...';
      ctx.fillText(title, padding + 44, y + 6);

      y += itemHeight;
    });

    // Payment Box at bottom (High contrast)
    y += 10;
    const isPaid = order.saldo <= 0;
    ctx.fillStyle = isPaid ? '#ECFDF5' : '#FFFBEB';
    ctx.strokeStyle = isPaid ? '#10B981' : '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.fillRect(padding, y, width - padding * 2, 54);
    ctx.strokeRect(padding, y, width - padding * 2, 54);

    ctx.fillStyle = isPaid ? '#065F46' : '#92400E';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    const payStatus = isPaid
      ? '✅ PEDIDO PAGADO EN TOTALIDAD (Solo empacar)'
      : `⚠️ COBRAR EN DESTINO / ENTREGA: ${formatCurrency(order.saldo)}`;
    ctx.fillText(payStatus, padding + 16, y + 33);

    const totalText = `TOTAL: ${formatCurrency(order.total)}`;
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(totalText, width - padding - 16, y + 33);
    ctx.textAlign = 'left';

    // Observaciones / Notes if any
    if (order.observaciones && order.observaciones.trim()) {
      y += 68;
      ctx.fillStyle = '#FFF7ED';
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 1;
      ctx.fillRect(padding, y, width - padding * 2, 44);
      ctx.strokeRect(padding, y, width - padding * 2, 44);

      ctx.fillStyle = '#9A3412';
      ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
      let obs = `📝 NOTA DE EMPAQUE: ${order.observaciones.trim()}`;
      if (obs.length > 70) obs = obs.substring(0, 70) + '...';
      ctx.fillText(obs, padding + 14, y + 27);
    }

    return canvas;
  };

  const handleDownloadImage = () => {
    try {
      const canvas = generateCanvas();
      const link = document.createElement('a');
      link.download = `ficha_preparacion_pedido_${order.orderNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error downloading image:', err);
    }
  };

  const handleCopyImageToClipboard = async () => {
    try {
      setIsGeneratingImg(true);
      const canvas = generateCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGeneratingImg(false);
          return;
        }
        try {
          if (navigator.clipboard && (window as any).ClipboardItem) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ 'image/png': blob }),
            ]);
            setCopiedImage(true);
            setTimeout(() => setCopiedImage(false), 3000);
          } else {
            handleDownloadImage();
          }
        } catch (clipErr) {
          console.warn('Clipboard write failed, downloading instead:', clipErr);
          handleDownloadImage();
        } finally {
          setIsGeneratingImg(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error exporting image:', err);
      setIsGeneratingImg(false);
    }
  };

  return (
    <div
      id="preparation-card-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        className={`border w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] ${
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
            <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-md">
              <Package className="w-6 h-6 text-pink-300" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg leading-tight font-['Outfit',sans-serif]">
                Ficha de Preparación para WhatsApp
              </h2>
              <p className="text-xs text-white/80 font-medium">
                Lista visual con letra grande y clara para el grupo de despacho
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body / Visual Ticket Preview */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Action Toolbar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              id="btn-share-whatsapp-prep"
              type="button"
              onClick={handleShareWhatsApp}
              className="py-3 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar WhatsApp</span>
            </button>

            <button
              id="btn-copy-img-prep"
              type="button"
              onClick={handleCopyImageToClipboard}
              disabled={isGeneratingImg}
              className={`py-3 px-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
              }`}
            >
              {copiedImage ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Foto Copiada!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Foto / Captura</span>
                </>
              )}
            </button>

            <button
              id="btn-copy-text-prep"
              type="button"
              onClick={handleCopyText}
              className={`col-span-2 sm:col-span-1 py-3 px-3.5 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-white'
                  : 'bg-[#FBF7EF] hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>¡Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>
          </div>

          {/* Visual Preparation Card Preview */}
          <div
            ref={cardRef}
            className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            {/* Card Top */}
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'}`}>
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider block ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                  Vale de Almacén y Empaque
                </span>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <h3 className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    Pedido #{String(order.orderNumber).padStart(3, '0')}
                  </h3>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                      isDark
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {totalPiezas} {totalPiezas === 1 ? 'pieza' : 'piezas'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs block flex items-center gap-1 justify-end font-medium ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  {dateFormatted}
                </span>
                {order.vendedorNombre && (
                  <span className={`text-xs font-bold block mt-0.5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                    Por: {order.vendedorNombre}
                  </span>
                )}
              </div>
            </div>

            {/* Recipient & Location (Larger & Clearer) */}
            <div
              className={`rounded-2xl p-3.5 border space-y-2 text-sm ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                <span className={`font-bold text-xs uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Cliente:</span>
                <strong className={`text-base sm:text-lg ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  {order.cliente || 'Sin nombre'}
                </strong>
              </div>
              {order.lugarEntrega && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className={`font-bold text-xs uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Destino:</span>
                  <span className={`font-extrabold text-sm sm:text-base ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {order.lugarEntrega}
                  </span>
                </div>
              )}
              {order.telefono && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className={`font-bold text-xs uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Celular:</span>
                  <span className={`font-mono font-bold text-sm ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                    {order.telefono}
                  </span>
                </div>
              )}
            </div>

            {/* Items Checklist with BIGGER FONTS */}
            <div className="space-y-2">
              <div className={`flex items-center justify-between text-xs font-black uppercase tracking-wider px-1 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                <span>Artículos a preparar (Toca para tachar)</span>
                <span>Cant.</span>
              </div>
              <div className="space-y-1.5">
                {order.productos.map((item, idx) => {
                  const isChecked = !!checkedItems[idx];
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => toggleCheck(idx)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? isDark
                            ? 'bg-[#0F1B3C] border-emerald-500/30 opacity-50 line-through text-[#9AA6C9]'
                            : 'bg-[#FBF7EF] border-emerald-300 opacity-50 line-through text-[#78716C]'
                          : isDark
                          ? 'bg-[#16234F] border-[#223368] hover:border-[#FF6FA5]/40 text-white'
                          : 'bg-white border-[#E8DFC8] hover:border-[#1A2B5C]/30 text-[#1A2B5C]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition shrink-0 ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : isDark
                              ? 'border-[#223368] bg-[#0F1B3C]'
                              : 'border-[#E8DFC8] bg-[#FBF7EF]'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <span className={`font-extrabold text-sm sm:text-base block ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                            {formatArticleItem(item)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment & Collection Alert */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between text-xs sm:text-sm ${
                order.saldo <= 0
                  ? isDark
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {order.saldo <= 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                )}
                <span className="font-extrabold">
                  {order.saldo <= 0
                    ? '✅ 100% Pagado (Solo preparar)'
                    : `⚠️ Cobrar en Entrega: ${formatCurrency(order.saldo)}`}
                </span>
              </div>
              <span className={`text-xs font-mono font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Total: {formatCurrency(order.total)}
              </span>
            </div>

            {/* Special Packing Notes */}
            {order.observaciones && order.observaciones.trim() && (
              <div
                className={`border rounded-2xl p-3 text-xs sm:text-sm ${
                  isDark
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <strong className="block text-xs uppercase font-bold mb-1">
                  📝 Nota especial de empaque:
                </strong>
                <span>{order.observaciones.trim()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}
        >
          <p className={`text-xs font-medium ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
            Pulsa <strong>Foto / Captura</strong> para copiar o descargar la imagen en alta resolución.
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              isDark
                ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border border-[#223368]'
                : 'bg-white hover:bg-[#E8DFC8] text-[#1A2B5C] border border-[#E8DFC8]'
            }`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
