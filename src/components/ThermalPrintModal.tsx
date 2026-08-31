import React, { useState } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Phone,
  MapPin,
  Package,
  Calendar,
  Share2,
  Copy,
  Bluetooth,
  Truck,
  Receipt,
  Layers,
  Smartphone,
} from 'lucide-react';
import { Order } from '../types';
import { formatCurrency, formatBoliviaPhone } from '../lib/storage';

export type PrintMode = 'sale' | 'shipping' | 'both';

interface ThermalPrintModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  initialMode?: PrintMode;
}

export const ThermalPrintModal: React.FC<ThermalPrintModalProps> = ({
  order,
  isOpen,
  onClose,
  initialMode = 'both',
}) => {
  const [printMode, setPrintMode] = useState<PrintMode>(initialMode);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (!isOpen) return null;

  const formattedDate = new Date(order.createdAt).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalItemsCount = order.productos.reduce((acc, p) => acc + p.cantidad, 0);

  // 1. Text generator for Sale / Complete Ticket
  const generateSaleText = () => {
    let t = `================================\n`;
    t += `   IMPORTADORA CHIQUIMINISOS    \n`;
    t += ` Papelería y artículos Kawaii  \n`;
    t += `================================\n`;
    t += `PEDIDO #${String(order.orderNumber).padStart(3, '0')}\n`;
    t += `Fecha: ${formattedDate}\n`;
    if (order.vendedorNombre) {
      t += `Atendido por: ${order.vendedorNombre}\n`;
    }
    t += `--------------------------------\n`;
    t += `CLIENTE: ${order.cliente || 'Mostrador / TikTok'}\n`;
    if (order.telefono) {
      t += `TEL/WPP: ${formatBoliviaPhone(order.telefono)}\n`;
    }
    if (order.lugarEntrega) {
      t += `ENTREGA: ${order.lugarEntrega}\n`;
    }
    t += `--------------------------------\n`;
    t += `CANT  ARTÍCULO             TOTAL\n`;
    t += `--------------------------------\n`;
    order.productos.forEach((item) => {
      const subtotal = item.cantidad * item.precioUnitario;
      t += `${item.cantidad}x ${item.nombre.slice(0, 18).padEnd(18, ' ')} ${formatCurrency(subtotal).padStart(8, ' ')}\n`;
      if (item.variante) {
        t += `   └ ${item.variante}\n`;
      }
    });
    t += `--------------------------------\n`;
    t += `TOTAL A PAGAR:      ${formatCurrency(order.total).padStart(12, ' ')}\n`;
    t += `PAGADO / ADELANTO:  ${formatCurrency(order.pagado).padStart(12, ' ')}\n`;
    t += `SALDO POR COBRAR:   ${formatCurrency(order.saldo).padStart(12, ' ')}\n`;
    if (order.observaciones) {
      t += `--------------------------------\n`;
      t += `OBS: ${order.observaciones}\n`;
    }
    t += `================================\n`;
    t += ` ¡Gracias por tu compra! 🇧🇴 \n`;
    t += `   Importadora Chiquiminisos    \n`;
    t += `================================\n`;
    return t;
  };

  // 2. Text generator for Shipping / Package Label (No prices details, clear logistics)
  const generateShippingText = () => {
    let t = `================================\n`;
    t += `   IMPORTADORA CHIQUIMINISOS    \n`;
    t += `      📦 RÓTULO DE ENVÍO 📦     \n`;
    t += `================================\n`;
    t += `PEDIDO #${String(order.orderNumber).padStart(3, '0')}\n`;
    t += `Fecha: ${formattedDate}\n`;
    t += `--------------------------------\n`;
    t += `DESTINATARIO:\n`;
    t += `${(order.cliente || 'CLIENTE').toUpperCase()}\n`;
    t += `--------------------------------\n`;
    t += `TELÉFONO / WHATSAPP:\n`;
    t += `${formatBoliviaPhone(order.telefono) || 'No especificado'}\n`;
    t += `--------------------------------\n`;
    t += `DESTINO / ENTREGA:\n`;
    t += `${(order.lugarEntrega || 'Mostrador / Por coordinar').toUpperCase()}\n`;
    t += `--------------------------------\n`;
    t += `CONTENIDO (${totalItemsCount} art.):\n`;
    order.productos.forEach((item) => {
      t += `- ${item.cantidad}x ${item.nombre}${item.variante ? ` (${item.variante})` : ''}\n`;
    });
    t += `--------------------------------\n`;
    if (order.saldo <= 0) {
      t += `ESTADO: ✅ PAGADO COMPLETO\n`;
    } else {
      t += `ESTADO: ⚠️ COBRAR EN DESTINO\n`;
      t += `SALDO PENDIENTE: ${formatCurrency(order.saldo)}\n`;
    }
    if (order.observaciones) {
      t += `--------------------------------\n`;
      t += `NOTA: ${order.observaciones}\n`;
    }
    t += `================================\n`;
    t += `Remite: Importadora Chiquiminisos\n`;
    t += `Papelería y artículos Kawaii 🇧🇴\n`;
    t += `================================\n`;
    return t;
  };

  // Combined text according to current printMode
  const getSelectedPlainText = () => {
    if (printMode === 'sale') return generateSaleText() + '\n\n\n';
    if (printMode === 'shipping') return generateShippingText() + '\n\n\n';
    return (
      generateSaleText() +
      `\n\n- - - - - - - - - - - - - - - - \n      ✂️ CORTAR AQUÍ ✂️      \n- - - - - - - - - - - - - - - - \n\n` +
      generateShippingText() +
      '\n\n\n'
    );
  };

  // HTML Builder for Browser & Direct Thermal Print
  const getSelectedPrintHtml = () => {
    const saleHtml = `
      <div class="ticket-block">
        <div class="center">
          <div class="title">IMPORTADORA CHIQUIMINISOS</div>
          <div class="subtitle">Papelería y artículos Kawaii</div>
          <div class="bold" style="margin-top:2px; font-size:10px;">*** TICKET DE VENTA ***</div>
          <div style="font-size:14px; font-weight:900; margin: 2px 0;">PEDIDO #${String(order.orderNumber).padStart(3, '0')}</div>
          <div style="font-size:9px;">${formattedDate}</div>
          ${order.vendedorNombre ? `<div style="font-size:9px;">Atendido por: ${order.vendedorNombre}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          <div><span class="bold">CLIENTE:</span> ${order.cliente || 'Mostrador / TikTok'}</div>
          ${order.telefono ? `<div><span class="bold">TEL/WPP:</span> ${formatBoliviaPhone(order.telefono)}</div>` : ''}
          ${order.lugarEntrega ? `<div><span class="bold">ENTREGA:</span> ${order.lugarEntrega}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="row bold" style="font-size:9px;">
          <span>CANT / ARTÍCULO</span>
          <span>TOTAL</span>
        </div>
        <div class="divider"></div>

        ${order.productos
          .map((item) => {
            const sub = item.cantidad * item.precioUnitario;
            return `
            <div class="item-row">
              <div class="row">
                <span class="bold">${item.cantidad}x ${item.nombre}</span>
                <span class="bold">${formatCurrency(sub)}</span>
              </div>
              ${item.variante ? `<div class="variante">└ ${item.variante}</div>` : ''}
              <div class="variante">(P.U: ${formatCurrency(item.precioUnitario)})</div>
            </div>
          `;
          })
          .join('')}

        <div class="divider"></div>

        <div class="row">
          <span>TOTAL A PAGAR:</span>
          <span class="total-box">${formatCurrency(order.total)}</span>
        </div>
        <div class="row">
          <span>PAGADO:</span>
          <span>${formatCurrency(order.pagado)}</span>
        </div>
        <div class="divider"></div>
        <div class="row total-box">
          <span>SALDO POR COBRAR:</span>
          <span>${formatCurrency(order.saldo)}</span>
        </div>

        ${
          order.observaciones
            ? `
          <div class="divider"></div>
          <div style="font-size:9px;"><span class="bold">OBS:</span> ${order.observaciones}</div>
        `
            : ''
        }

        <div class="divider"></div>

        <div class="center" style="font-size:9px; margin-top: 4px;">
          <div class="bold">¡Gracias por tu compra! 🇧🇴</div>
          <div>Importadora Chiquiminisos</div>
          <div>Papelería y artículos Kawaii</div>
        </div>
      </div>
    `;

    const shippingHtml = `
      <div class="ticket-block">
        <div class="center">
          <div class="title">IMPORTADORA CHIQUIMINISOS</div>
          <div class="shipping-banner">📦 RÓTULO DE ENVÍO / PAQUETE 📦</div>
          <div style="font-size:16px; font-weight:900; margin: 3px 0;">PEDIDO #${String(order.orderNumber).padStart(3, '0')}</div>
          <div style="font-size:9px;">Fecha: ${formattedDate}</div>
        </div>

        <div class="double-divider"></div>

        <div class="shipping-box">
          <div class="shipping-label">DESTINATARIO:</div>
          <div class="shipping-value" style="font-size:13px;">${(order.cliente || 'CLIENTE').toUpperCase()}</div>
        </div>

        <div class="divider"></div>

        <div class="shipping-box">
          <div class="shipping-label">TELÉFONO / WHATSAPP:</div>
          <div class="shipping-value" style="font-size:13px;">${formatBoliviaPhone(order.telefono) || 'No registrado'}</div>
        </div>

        <div class="divider"></div>

        <div class="shipping-box">
          <div class="shipping-label">DESTINO / LUGAR DE ENTREGA:</div>
          <div class="shipping-value" style="font-size:12px;">${(order.lugarEntrega || 'Mostrador / Por coordinar').toUpperCase()}</div>
        </div>

        <div class="divider"></div>

        <div>
          <div class="bold" style="font-size:10px;">CONTENIDO (${totalItemsCount} artículos):</div>
          <div style="font-size:9px; margin-top:2px;">
            ${order.productos
              .map(
                (item) => `
              <div>• ${item.cantidad}x ${item.nombre} ${item.variante ? `(${item.variante})` : ''}</div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="divider"></div>

        <div class="center" style="margin: 4px 0;">
          ${
            order.saldo <= 0
              ? `
            <div class="status-paid">✅ PAGADO COMPLETO</div>
          `
              : `
            <div class="status-collect">
              ⚠️ COBRAR EN DESTINO<br>
              <span style="font-size:14px; font-weight:900;">SALDO: ${formatCurrency(order.saldo)}</span>
            </div>
          `
          }
        </div>

        ${
          order.observaciones
            ? `
          <div class="divider"></div>
          <div style="font-size:9px;"><span class="bold">NOTA:</span> ${order.observaciones}</div>
        `
            : ''
        }

        <div class="double-divider"></div>

        <div class="center" style="font-size:8px;">
          <div>Remite: <strong>Importadora Chiquiminisos</strong></div>
          <div>Papelería y artículos Kawaii · Bolivia 🇧🇴</div>
        </div>
      </div>
    `;

    let bodyContent = '';
    if (printMode === 'sale') bodyContent = saleHtml;
    else if (printMode === 'shipping') bodyContent = shippingHtml;
    else {
      bodyContent = `
        ${saleHtml}
        <div class="cut-line">
          - - - - - - - - - - - - - - - - -<br>
          ✂️ CORTAR AQUÍ ✂️<br>
          - - - - - - - - - - - - - - - - -
        </div>
        ${shippingHtml}
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket #${String(order.orderNumber).padStart(3, '0')} - Importadora Chiquiminisos</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.25;
              margin: 0;
              padding: 4px;
              background: #fff;
              color: #000;
              width: 100%;
              max-width: 58mm;
            }
            .ticket-block {
              padding: 2px 0;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .title { font-size: 12px; font-weight: 900; font-family: sans-serif; }
            .subtitle { font-size: 8.5px; font-family: sans-serif; }
            .shipping-banner { font-size: 10px; font-weight: 900; background: #000; color: #fff; padding: 2px 0; margin-top: 2px; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; }
            .double-divider { border-top: 2px solid #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; }
            .item-row { margin: 2px 0; }
            .variante { font-size: 9px; padding-left: 10px; color: #333; }
            .total-box { font-size: 12px; font-weight: 900; }
            .shipping-box { margin: 2px 0; }
            .shipping-label { font-size: 8.5px; font-weight: bold; color: #333; }
            .shipping-value { font-weight: 900; }
            .status-paid { font-size: 11px; font-weight: 900; border: 1px solid #000; padding: 3px; }
            .status-collect { font-size: 11px; font-weight: 900; border: 2px solid #000; padding: 3px; background: #f0f0f0; }
            .cut-line { text-align: center; font-size: 9px; font-weight: bold; margin: 12px 0; }
          </style>
        </head>
        <body>
          ${bodyContent}
        </body>
      </html>
    `;
  };

  // Launch Print Dialog
  const handlePrint = () => {
    try {
      const printContent = getSelectedPrintHtml();
      const printWindow = window.open('', '_blank', 'width=400,height=650');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Fallback window print:', err);
      window.print();
    }
  };

  // RawBT Bluetooth app launcher
  const handleBluetoothRawBT = () => {
    const text = getSelectedPlainText();
    try {
      const rawbtUri = `rawbt:data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`;
      window.location.href = rawbtUri;
    } catch (err) {
      console.warn('RawBT error, copying text instead:', err);
      handleCopyText();
    }
  };

  // Copy plain text
  const handleCopyText = async () => {
    const text = getSelectedPlainText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Native share sheet
  const handleShare = async () => {
    const text = getSelectedPlainText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket #${order.orderNumber} (${printMode.toUpperCase()}) - Chiquiminisos`,
          text: text,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <>
      {/* Interactive Modal Preview (hidden on print) */}
      <div
        id="thermal-print-modal"
        className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:hidden animate-in fade-in duration-150 overflow-y-auto"
      >
        <div className="bg-slate-900 border border-purple-500/40 rounded-2xl sm:rounded-3xl max-w-md w-full my-auto max-h-[95vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-purple-500/30">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-900/40 shrink-0">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white font-['Outfit',sans-serif]">
                  Imprimir Tickets Térmicos
                </h2>
                <p className="text-[11px] text-slate-400">
                  Importadora Chiquiminisos · 58mm / 80mm
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector Tabs (Venta / Envío / Ambos) */}
          <div className="px-3 pt-3 pb-1 bg-slate-950/90 border-b border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
              <span>¿Qué deseas imprimir?</span>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                Pedido #{String(order.orderNumber).padStart(3, '0')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPrintMode('both')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  printMode === 'both'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>1. Ambos</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('sale')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  printMode === 'sale'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>2. Venta</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('shipping')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  printMode === 'shipping'
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>3. Envío</span>
              </button>
            </div>
          </div>

          {/* Ticket Live Preview Area */}
          <div className="p-3 sm:p-5 overflow-y-auto bg-slate-950/70 flex flex-col items-center space-y-3">
            {/* Guide Button / Info Alert */}
            <div className="w-full max-w-[320px] bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-2.5 flex items-start justify-between gap-2 text-[11px] text-indigo-200">
              <div className="flex items-start gap-1.5">
                <Smartphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> Puedes imprimir sólo el rótulo de paquete, la comanda o ambos juntos.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-cyan-400 hover:text-cyan-300 font-bold underline shrink-0"
              >
                {showGuide ? 'Ocultar' : 'Guía'}
              </button>
            </div>

            {showGuide && (
              <div className="w-full max-w-[320px] bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 space-y-2 animate-in fade-in">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Bluetooth className="w-3.5 h-3.5 text-purple-400" />
                  Uso en celular / tablet con comanderas Bluetooth:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-300">
                  <li>
                    <strong>Opción 1:</strong> Pulsa <em>"Mandar a Imprimir"</em> para seleccionar la impresora nativa en Android o iOS.
                  </li>
                  <li>
                    <strong>Opción 2 (Bluetooth con RawBT):</strong> Pulsa <em>"App RawBT"</em> para imprimir directo a tu comanderita inalámbrica.
                  </li>
                  <li>
                    <strong>Rótulo de Envío:</strong> Está optimizado sin precios para que lo pegues en la bolsa o caja de la encomienda.
                  </li>
                </ol>
              </div>
            )}

            {/* LIVE PAPER PREVIEW */}
            <div className="w-full max-w-[300px] sm:max-w-[320px] space-y-3 select-all">
              {/* TICKET 1: VENTA (Rendered if 'sale' or 'both') */}
              {(printMode === 'sale' || printMode === 'both') && (
                <div className="bg-white text-black p-3.5 sm:p-4 rounded-xl shadow-2xl font-mono text-xs border border-slate-300 space-y-2.5">
                  <div className="text-center border-b border-dashed border-black pb-2 space-y-0.5">
                    <p className="text-xs sm:text-sm font-black tracking-wider uppercase font-sans">
                      IMPORTADORA CHIQUIMINISOS
                    </p>
                    <p className="text-[10px] text-gray-700 font-sans font-semibold">
                      Papelería y artículos Kawaii
                    </p>
                    <p className="text-[11px] font-bold mt-1">*** TICKET DE VENTA ***</p>
                    <p className="text-sm font-black mt-0.5">PEDIDO #{String(order.orderNumber).padStart(3, '0')}</p>
                    <p className="text-[10px] text-gray-600">{formattedDate}</p>
                    {order.vendedorNombre && (
                      <p className="text-[10px] text-gray-700">Atendido por: {order.vendedorNombre}</p>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="border-b border-dashed border-black pb-2 text-[11px] space-y-0.5">
                    <p>
                      <span className="font-bold">CLIENTE:</span> {order.cliente || 'Mostrador / TikTok'}
                    </p>
                    {order.telefono && (
                      <p>
                        <span className="font-bold">TEL/WPP:</span> {formatBoliviaPhone(order.telefono)}
                      </p>
                    )}
                    {order.lugarEntrega && (
                      <p>
                        <span className="font-bold">ENTREGA:</span> {order.lugarEntrega}
                      </p>
                    )}
                  </div>

                  {/* Items Detailed Table */}
                  <div className="border-b border-dashed border-black pb-2 space-y-1.5 text-[11px]">
                    <div className="flex justify-between font-bold border-b border-gray-300 pb-1 text-[10px]">
                      <span>CANT / ARTÍCULO</span>
                      <span>TOTAL</span>
                    </div>
                    {order.productos.map((item, idx) => {
                      const subtotal = item.cantidad * item.precioUnitario;
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between items-start">
                            <span className="font-bold">
                              {item.cantidad}x {item.nombre}
                            </span>
                            <span className="font-bold">
                              {formatCurrency(subtotal)}
                            </span>
                          </div>
                          {item.variante && (
                            <p className="text-[10px] text-gray-600 pl-3">
                              └ {item.variante}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-600 pl-3">
                            (P.U: {formatCurrency(item.precioUnitario)})
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="space-y-1 text-right text-[11px] pt-1">
                    <div className="flex justify-between">
                      <span>TOTAL A PAGAR:</span>
                      <span className="font-black text-sm">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>PAGADO / ADELANTO:</span>
                      <span className="font-bold">{formatCurrency(order.pagado)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-black pt-1 font-black text-sm">
                      <span>SALDO POR COBRAR:</span>
                      <span>{formatCurrency(order.saldo)}</span>
                    </div>
                  </div>

                  {order.observaciones && (
                    <div className="border-t border-dashed border-black pt-2 text-[10px]">
                      <p className="font-bold">OBSERVACIONES:</p>
                      <p className="italic text-gray-800">{order.observaciones}</p>
                    </div>
                  )}

                  <div className="text-center pt-2 border-t border-dashed border-black text-[10px] text-gray-700 space-y-0.5">
                    <p className="font-semibold">¡Gracias por tu preferencia! 🇧🇴</p>
                    <p>Importadora Chiquiminisos</p>
                  </div>
                </div>
              )}

              {/* Cut Line indicator when previewing 'both' */}
              {printMode === 'both' && (
                <div className="flex items-center justify-center gap-2 text-cyan-400 font-mono text-[10px] font-bold py-1">
                  <span>- - - - -</span>
                  <span>✂️ CORTAR TICKET AQUÍ ✂️</span>
                  <span>- - - - -</span>
                </div>
              )}

              {/* TICKET 2: RÓTULO DE ENVÍO (Rendered if 'shipping' or 'both') */}
              {(printMode === 'shipping' || printMode === 'both') && (
                <div className="bg-white text-black p-3.5 sm:p-4 rounded-xl shadow-2xl font-mono text-xs border-2 border-slate-800 space-y-2">
                  <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
                    <p className="text-xs font-black uppercase font-sans tracking-wide">
                      IMPORTADORA CHIQUIMINISOS
                    </p>
                    <div className="bg-black text-white font-sans font-black text-[11px] py-1 px-2 rounded mt-1">
                      📦 RÓTULO DE ENVÍO / PAQUETE 📦
                    </div>
                    <p className="text-base font-black mt-1">PEDIDO #{String(order.orderNumber).padStart(3, '0')}</p>
                    <p className="text-[10px] text-gray-600">{formattedDate}</p>
                  </div>

                  {/* Big Shipping Destination Block */}
                  <div className="space-y-2 py-1">
                    <div className="bg-gray-100 p-2 rounded border border-gray-300">
                      <p className="text-[9px] font-bold text-gray-600 uppercase font-sans">DESTINATARIO / CLIENTE:</p>
                      <p className="text-sm font-black uppercase tracking-tight text-black">
                        {order.cliente || 'CLIENTE (MOSTRADOR / TIKTOK)'}
                      </p>
                    </div>

                    <div className="bg-gray-100 p-2 rounded border border-gray-300">
                      <p className="text-[9px] font-bold text-gray-600 uppercase font-sans">TELÉFONO / WHATSAPP:</p>
                      <p className="text-sm font-black text-black">
                        {formatBoliviaPhone(order.telefono) || 'No especificado'}
                      </p>
                    </div>

                    <div className="bg-gray-100 p-2 rounded border border-gray-300">
                      <p className="text-[9px] font-bold text-gray-600 uppercase font-sans">DESTINO / ENTREGA:</p>
                      <p className="text-xs font-black uppercase text-black">
                        {order.lugarEntrega || 'Mostrador / Por coordinar'}
                      </p>
                    </div>
                  </div>

                  {/* Summary of Items without Prices */}
                  <div className="border-t border-b border-dashed border-black py-2 space-y-1">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span>CONTENIDO DEL PAQUETE:</span>
                      <span>{totalItemsCount} ART. TOTAL</span>
                    </div>
                    <div className="space-y-0.5 text-[10px] text-gray-800">
                      {order.productos.map((item, idx) => (
                        <div key={idx}>
                          • <span className="font-bold">{item.cantidad}x</span> {item.nombre}{' '}
                          {item.variante ? `(${item.variante})` : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Status for Delivery Guy / Freight */}
                  <div className="text-center py-1">
                    {order.saldo <= 0 ? (
                      <div className="border-2 border-emerald-600 bg-emerald-50 text-emerald-900 font-black text-xs py-1.5 px-2 rounded">
                        ✅ PAGADO COMPLETO (ENTREGAR)
                      </div>
                    ) : (
                      <div className="border-2 border-amber-600 bg-amber-50 text-amber-900 font-black text-xs py-1.5 px-2 rounded">
                        ⚠️ COBRAR EN DESTINO: {formatCurrency(order.saldo)}
                      </div>
                    )}
                  </div>

                  {order.observaciones && (
                    <div className="border-t border-dashed border-black pt-1.5 text-[10px]">
                      <span className="font-bold">NOTA DE ENVÍO: </span>
                      <span className="italic">{order.observaciones}</span>
                    </div>
                  )}

                  <div className="text-center pt-2 border-t-2 border-black text-[9px] text-gray-700">
                    <p className="font-bold">Remite: Importadora Chiquiminisos</p>
                    <p>Papelería y artículos Kawaii · Bolivia 🇧🇴</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 space-y-2">
            {/* Primary Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 active:scale-[0.98] transition"
            >
              <Printer className="w-5 h-5" />
              <span>
                {printMode === 'both'
                  ? 'Mandar a Imprimir Ambos Tickets'
                  : printMode === 'sale'
                  ? 'Mandar a Imprimir Ticket de Venta'
                  : 'Mandar a Imprimir Rótulo de Envío'}
              </span>
            </button>

            {/* Mobile Alternative Actions (Bluetooth / Share / Copy) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
              <button
                type="button"
                onClick={handleBluetoothRawBT}
                className="py-2 px-1 sm:px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1 transition text-center"
                title="Abrir con app RawBT Bluetooth"
              >
                <Bluetooth className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">App RawBT</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="py-2 px-1 sm:px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1 transition text-center"
                title="Compartir comanda a otra app o Bluetooth"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">Compartir</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="py-2 px-1 sm:px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-[11px] flex flex-col sm:flex-row items-center justify-center gap-1 transition text-center"
                title="Copiar texto de ticket"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
