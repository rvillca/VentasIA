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
import { formatArticleItem } from '../lib/packaging';
import { useTheme } from '../contexts/ThemeContext';

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
  const { isDark } = useTheme();
  const [printMode, setPrintMode] = useState<PrintMode>(initialMode);
  const [rawbtFormat, setRawbtFormat] = useState<'text' | 'html'>('text');
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

  const LINE_WIDTH = 32;

  // Center string within exact width
  const centerText = (str: string, width: number = LINE_WIDTH) => {
    const clean = str.trim();
    if (clean.length >= width) return clean.slice(0, width);
    const diff = width - clean.length;
    const left = Math.floor(diff / 2);
    const right = diff - left;
    return ' '.repeat(left) + clean + ' '.repeat(right);
  };

  // Align two columns with right column pinned tightly to the right border (column 32)
  const justifyCols = (left: string, right: string, width: number = LINE_WIDTH) => {
    const l = left.trim();
    const r = right.trim();
    const space = width - l.length - r.length;
    if (space >= 1) {
      return l + ' '.repeat(space) + r;
    }
    const maxLeft = width - r.length - 1;
    if (maxLeft > 3) {
      return l.slice(0, maxLeft) + ' ' + r;
    }
    return l + '\n' + r.padStart(width, ' ');
  };

  // Wrap text cleanly by words to exact width
  const wrapTextToLines = (text: string, width: number = LINE_WIDTH): string[] => {
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      if (!cur) {
        cur = w;
      } else if (cur.length + 1 + w.length <= width) {
        cur += ' ' + w;
      } else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines.length > 0 ? lines : [''];
  };

  // 1. Text generator for Sale / Complete Ticket (384 dots / 32 columns full width)
  const generateSaleText = () => {
    let t = `================================\n`;
    t += `${centerText('IMPORTADORA CHIQUIMINISOS')}\n`;
    t += `${centerText('Papelería y artículos Kawaii')}\n`;
    t += `${centerText('*** TICKET DE VENTA ***')}\n`;
    t += `================================\n`;
    t += `${centerText(`PEDIDO #${String(order.orderNumber).padStart(3, '0')}`)}\n`;
    t += `${centerText(`Fecha: ${formattedDate}`)}\n`;
    if (order.vendedorNombre) {
      t += `${centerText(`Atendido por: ${order.vendedorNombre}`)}\n`;
    }
    t += `--------------------------------\n`;

    const clientLines = wrapTextToLines(`CLIENTE: ${order.cliente || 'Mostrador / TikTok'}`);
    clientLines.forEach((l) => {
      t += `${l}\n`;
    });
    if (order.telefono) {
      t += `TEL/WPP: ${formatBoliviaPhone(order.telefono)}\n`;
    }
    if (order.lugarEntrega) {
      const entregaLines = wrapTextToLines(`ENTREGA: ${order.lugarEntrega}`);
      entregaLines.forEach((l) => {
        t += `${l}\n`;
      });
    }
    t += `--------------------------------\n`;
    t += `${justifyCols('ARTÍCULO / DETALLE', 'TOTAL', LINE_WIDTH)}\n`;
    t += `--------------------------------\n`;

    order.productos.forEach((item) => {
      const subtotal = item.cantidad * item.precioUnitario;
      const subtotalStr = formatCurrency(subtotal);
      const itemTitle = formatArticleItem(item);
      const isMultiQty = item.cantidad > 1;

      // Print full article title wrapped to line width
      const titleLines = wrapTextToLines(itemTitle, LINE_WIDTH);
      titleLines.forEach((l) => {
        t += `${l}\n`;
      });

      if (isMultiQty) {
        // Multi-quantity: show subtotal and (Bs. X c/u)
        t += `${justifyCols('   ↳ Subtotal:', subtotalStr, LINE_WIDTH)}\n`;
        t += `      (${formatCurrency(item.precioUnitario)} c/u)\n`;
      } else {
        // Single quantity (cantidad === 1): show ONLY subtotal without (c/u)
        t += `${justifyCols('   ↳ Subtotal:', subtotalStr, LINE_WIDTH)}\n`;
      }
    });

    t += `--------------------------------\n`;
    t += `${justifyCols('TOTAL A PAGAR:', formatCurrency(order.total), LINE_WIDTH)}\n`;
    t += `${justifyCols('PAGADO / ADELANTO:', formatCurrency(order.pagado), LINE_WIDTH)}\n`;
    t += `--------------------------------\n`;
    t += `${justifyCols('SALDO POR COBRAR:', formatCurrency(order.saldo), LINE_WIDTH)}\n`;

    if (order.observaciones) {
      t += `--------------------------------\n`;
      const obsLines = wrapTextToLines(`OBS: ${order.observaciones}`);
      obsLines.forEach((l) => {
        t += `${l}\n`;
      });
    }

    t += `================================\n`;
    t += `${centerText('¡Gracias por tu compra! 🇧🇴')}\n`;
    t += `${centerText('Importadora Chiquiminisos')}\n`;
    t += `================================\n`;
    return t;
  };

  // 2. Text generator for Shipping / Package Label (384 dots / 32 columns full width)
  const generateShippingText = () => {
    let t = `================================\n`;
    t += `${centerText('IMPORTADORA CHIQUIMINISOS')}\n`;
    t += `${centerText('Papelería y artículos Kawaii')}\n`;
    t += `${centerText('📦 RÓTULO DE ENVÍO 📦')}\n`;
    t += `================================\n`;
    t += `${centerText(`PEDIDO #${String(order.orderNumber).padStart(3, '0')}`)}\n`;
    t += `${centerText(`Fecha: ${formattedDate}`)}\n`;
    t += `--------------------------------\n`;
    t += `DESTINATARIO / CLIENTE:\n`;
    const clientLines = wrapTextToLines((order.cliente || 'CLIENTE').toUpperCase());
    clientLines.forEach((l) => {
      t += `${l}\n`;
    });
    if (order.telefono) {
      t += `TEL/WPP: ${formatBoliviaPhone(order.telefono)}\n`;
    }
    t += `--------------------------------\n`;
    t += `DIRECCIÓN DE ENTREGA:\n`;
    const entregaLines = wrapTextToLines((order.lugarEntrega || 'Mostrador / Por coordinar').toUpperCase());
    entregaLines.forEach((l) => {
      t += `${l}\n`;
    });
    t += `--------------------------------\n`;
    t += `${justifyCols('DETALLE PRODUCTOS:', `${totalItemsCount} ART. TOTAL`, LINE_WIDTH)}\n`;
    order.productos.forEach((item) => {
      const itemLines = wrapTextToLines(`• ${formatArticleItem(item)}`);
      itemLines.forEach((l) => {
        t += `${l}\n`;
      });
    });
    if (order.observaciones) {
      t += `--------------------------------\n`;
      const obsLines = wrapTextToLines(`OBS / NOTA: ${order.observaciones}`);
      obsLines.forEach((l) => {
        t += `${l}\n`;
      });
    }
    t += `================================\n`;
    return t;
  };

  // Combined text according to current printMode (only 2 lines feed for ~1cm end margin)
  const getSelectedPlainText = () => {
    if (printMode === 'sale') return generateSaleText() + '\n\n';
    if (printMode === 'shipping') return generateShippingText() + '\n\n';
    return (
      generateSaleText() +
      `\n--------------------------------\n      ✂️ CORTAR AQUÍ ✂️      \n--------------------------------\n\n` +
      generateShippingText() +
      '\n\n'
    );
  };

  // HTML Builder for Browser & Direct Thermal Print (48mm / 384 dots full printable area)
  const getSelectedPrintHtml = () => {
    const saleHtml = `
      <div class="ticket-block">
        <div class="center">
          <div class="title">IMPORTADORA CHIQUIMINISOS</div>
          <div class="subtitle">Papelería y artículos Kawaii</div>
          <div class="ticket-type-banner">*** TICKET DE VENTA ***</div>
          <div class="order-number">PEDIDO #${String(order.orderNumber).padStart(3, '0')}</div>
          <div class="order-meta">${formattedDate}</div>
          ${order.vendedorNombre ? `<div class="order-meta">Atendido por: ${order.vendedorNombre}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="info-section">
          <div class="info-row"><span class="bold">CLIENTE:</span> ${order.cliente || 'Mostrador / TikTok'}</div>
          ${order.telefono ? `<div class="info-row"><span class="bold">TEL/WPP:</span> ${formatBoliviaPhone(order.telefono)}</div>` : ''}
          ${order.lugarEntrega ? `<div class="info-row"><span class="bold">ENTREGA:</span> ${order.lugarEntrega}</div>` : ''}
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="th-art">ARTÍCULO / DETALLE</th>
              <th class="th-tot">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${order.productos
              .map((item) => {
                const sub = item.cantidad * item.precioUnitario;
                return `
                <tr class="item-row">
                  <td class="td-art">
                    <div class="item-title">${formatArticleItem(item)}</div>
                    ${item.cantidad > 1 ? `<div class="item-pu">(${formatCurrency(item.precioUnitario)} c/u)</div>` : ''}
                  </td>
                  <td class="td-tot">${formatCurrency(sub)}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <table class="totals-table">
          <tr>
            <td class="tot-label">TOTAL A PAGAR:</td>
            <td class="tot-amount tot-grand">${formatCurrency(order.total)}</td>
          </tr>
          <tr>
            <td class="tot-label">PAGADO / ADELANTO:</td>
            <td class="tot-amount">${formatCurrency(order.pagado)}</td>
          </tr>
          <tr class="saldo-row">
            <td class="tot-label tot-saldo-lbl">SALDO POR COBRAR:</td>
            <td class="tot-amount tot-saldo-val">${formatCurrency(order.saldo)}</td>
          </tr>
        </table>

        ${
          order.observaciones
            ? `
          <div class="divider"></div>
          <div class="info-row" style="font-size:11.5px;"><span class="bold">OBS:</span> ${order.observaciones}</div>
        `
            : ''
        }

        <div class="divider"></div>

        <div class="center" style="font-size:11.5px; margin-top: 5px;">
          <div class="bold">¡Gracias por tu compra! 🇧🇴</div>
          <div>Importadora Chiquiminisos</div>
          <div style="font-size:10px;">Papelería y artículos Kawaii</div>
        </div>
      </div>
    `;

    const shippingHtml = `
      <div class="ticket-block">
        <div class="center">
          <div class="title">IMPORTADORA CHIQUIMINISOS</div>
          <div class="subtitle">Papelería y artículos Kawaii</div>
          <div class="shipping-banner">📦 RÓTULO DE ENVÍO / PAQUETE 📦</div>
          <div class="order-number">PEDIDO #${String(order.orderNumber).padStart(3, '0')}</div>
          <div class="order-meta">Fecha: ${formattedDate}</div>
        </div>

        <div class="double-divider"></div>

        <div class="shipping-box">
          <div class="shipping-label">CLIENTE / DESTINATARIO:</div>
          <div class="shipping-name">${(order.cliente || 'CLIENTE').toUpperCase()}</div>
          ${order.telefono ? `<div class="shipping-phone">TEL/WPP: ${formatBoliviaPhone(order.telefono)}</div>` : ''}
        </div>

        <div class="shipping-box">
          <div class="shipping-label">DIRECCIÓN DE ENTREGA:</div>
          <div class="shipping-address">${(order.lugarEntrega || 'Mostrador / Por coordinar').toUpperCase()}</div>
        </div>

        <div class="double-divider"></div>

        <div class="shipping-box">
          <div class="shipping-products-header">
            <span>DETALLE DE PRODUCTOS:</span>
            <span>${totalItemsCount} ART. TOTAL</span>
          </div>
          <div style="margin-top:3px;">
            ${order.productos
              .map(
                (item) => `
              <div class="shipping-item">• <strong>${formatArticleItem(item)}</strong></div>
            `
              )
              .join('')}
          </div>
        </div>

        ${
          order.observaciones
            ? `
          <div class="divider"></div>
          <div style="font-size:11.5px; word-break: break-word;"><span class="bold">OBS / NOTA:</span> ${order.observaciones}</div>
        `
            : ''
        }

        <div class="double-divider"></div>
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
            *, *:before, *:after {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html {
              margin: 0;
              padding: 0;
              width: 100%;
              background: #fff;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 13px;
              line-height: 1.25;
              margin: 0;
              padding: 3px 2px 8px 2px;
              background: #fff;
              color: #000;
              width: 100%;
            }
            .ticket-block {
              width: 100%;
              padding: 1px 0;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .title {
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 0.5px;
              line-height: 1.15;
            }
            .subtitle {
              font-size: 11px;
              font-weight: 600;
              color: #222;
              margin-top: 1px;
            }
            .ticket-type-banner {
              font-size: 12px;
              font-weight: 900;
              letter-spacing: 0.5px;
              margin: 3px 0 2px 0;
            }
            .order-number {
              font-size: 20px;
              font-weight: 900;
              margin: 2px 0;
              line-height: 1.1;
            }
            .order-meta {
              font-size: 11px;
              color: #111;
            }
            .divider {
              border-top: 1.5px dashed #000;
              margin: 5px 0;
              width: 100%;
            }
            .double-divider {
              border-top: 2.5px solid #000;
              margin: 5px 0;
              width: 100%;
            }
            .info-section {
              font-size: 12.5px;
              line-height: 1.35;
            }
            .info-row {
              margin: 2px 0;
              word-break: break-word;
            }

            /* Items Table - 100% full width, edge-to-edge */
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 3px 0;
              table-layout: auto;
            }
            .items-table th {
              font-size: 11.5px;
              font-weight: 900;
              padding: 3px 0;
              border-top: 1.5px dashed #000;
              border-bottom: 1.5px dashed #000;
            }
            .th-art {
              text-align: left;
            }
            .th-tot {
              text-align: right;
              white-space: nowrap;
              padding-left: 6px;
            }
            .item-row td {
              padding: 4px 0 3px 0;
              vertical-align: top;
              border-bottom: 0.5px dashed #ccc;
            }
            .td-art {
              text-align: left;
              padding-right: 6px;
            }
            .item-title {
              font-size: 13px;
              font-weight: 800;
              line-height: 1.25;
              color: #000;
              word-break: break-word;
            }
            .item-pu {
              font-size: 11px;
              font-weight: 600;
              color: #333;
              margin-top: 2px;
            }
            .td-tot {
              text-align: right;
              white-space: nowrap;
              font-size: 14px;
              font-weight: 900;
              color: #000;
              vertical-align: top;
              padding-top: 1px;
            }

            /* Totals Table - 100% width, amounts strictly right-aligned */
            .totals-table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0 2px 0;
            }
            .totals-table td {
              padding: 2px 0;
            }
            .tot-label {
              text-align: left;
              font-size: 12.5px;
              font-weight: 700;
            }
            .tot-amount {
              text-align: right;
              white-space: nowrap;
              font-size: 13px;
              font-weight: 800;
            }
            .tot-grand {
              font-size: 16px;
              font-weight: 900;
            }
            .saldo-row {
              border-top: 1.5px dashed #000;
            }
            .saldo-row td {
              padding-top: 4px;
            }
            .tot-saldo-lbl {
              font-size: 13.5px;
              font-weight: 900;
            }
            .tot-saldo-val {
              font-size: 16px;
              font-weight: 900;
            }

            /* Shipping Ticket Elements */
            .shipping-banner {
              font-size: 13px;
              font-weight: 900;
              background: #000;
              color: #fff;
              padding: 4px 2px;
              margin: 3px 0;
              text-align: center;
              width: 100%;
            }
            .shipping-box {
              width: 100%;
              border: 2px solid #000;
              padding: 5px 6px;
              background: #fafafa;
              margin: 4px 0;
            }
            .shipping-label {
              font-size: 10.5px;
              font-weight: 900;
              text-transform: uppercase;
              color: #333;
              margin-bottom: 2px;
            }
            .shipping-name {
              font-size: 16px;
              font-weight: 900;
              line-height: 1.2;
              color: #000;
              word-break: break-word;
            }
            .shipping-phone {
              font-size: 14px;
              font-weight: 900;
              color: #000;
              margin-top: 3px;
            }
            .shipping-address {
              font-size: 14px;
              font-weight: 800;
              line-height: 1.25;
              color: #000;
              word-break: break-word;
            }
            .shipping-products-header {
              display: flex;
              justify-content: space-between;
              font-size: 11.5px;
              font-weight: 900;
              border-bottom: 1px dashed #000;
              padding-bottom: 3px;
              margin-bottom: 4px;
            }
            .shipping-item {
              font-size: 12.5px;
              font-weight: 700;
              line-height: 1.3;
              margin: 3px 0;
              word-break: break-word;
            }
            .cut-line {
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              margin: 10px 0;
              letter-spacing: 1px;
            }
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

  // Safe UTF-8 to Base64 encoder for full Unicode, ñ, and Spanish accent support
  const encodeUtf8Base64 = (str: string): string => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Safe external URI launcher for Android browsers
  const launchExternalUri = (uri: string) => {
    const link = document.createElement('a');
    link.href = uri;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 250);
  };

  // RawBT Bluetooth app launcher with explicit UTF-8 charset
  const handleBluetoothRawBT = (formatChoice?: 'text' | 'html') => {
    const format = formatChoice || rawbtFormat;
    try {
      if (format === 'html') {
        const html = getSelectedPrintHtml();
        const base64Data = encodeUtf8Base64(html);
        const rawbtUri = `rawbt:data:text/html;charset=utf-8;base64,${base64Data}`;
        launchExternalUri(rawbtUri);
      } else {
        const text = getSelectedPlainText();
        const base64Data = encodeUtf8Base64(text);
        const rawbtUri = `rawbt:data:text/plain;charset=utf-8;base64,${base64Data}`;
        launchExternalUri(rawbtUri);
      }
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
      {/* Interactive Modal Preview */}
      <div
        id="thermal-print-modal"
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:hidden animate-in fade-in duration-150 overflow-y-auto"
      >
        <div
          className={`border rounded-2xl sm:rounded-3xl max-w-md w-full my-auto max-h-[95vh] flex flex-col overflow-hidden shadow-2xl ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          {/* Header */}
          <div
            className={`p-3.5 sm:p-4 border-b flex items-center justify-between ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#1A2B5C] border-[#1A2B5C]'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-sm shrink-0">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white font-['Outfit',sans-serif]">
                  Imprimir Tickets Térmicos
                </h2>
                <p className="text-[11px] text-white/80">
                  Importadora Chiquiminisos · 58mm / 80mm
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector Tabs (Venta / Envío / Ambos) */}
          <div
            className={`px-3 pt-3 pb-2 border-b ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}
          >
            <div className="text-[11px] font-medium mb-1.5 flex items-center justify-between">
              <span className={isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}>¿Qué deseas imprimir?</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
              }`}>
                Pedido #{String(order.orderNumber).padStart(3, '0')}
              </span>
            </div>
            <div
              className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
                isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
              }`}
            >
              <button
                type="button"
                onClick={() => setPrintMode('both')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  printMode === 'both'
                    ? isDark
                      ? 'bg-[#FF6FA5] text-[#0F1B3C] shadow-sm'
                      : 'bg-[#1A2B5C] text-white shadow-sm'
                    : isDark
                    ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]'
                    : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>1. Ambos</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('sale')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  printMode === 'sale'
                    ? isDark
                      ? 'bg-[#FF6FA5] text-[#0F1B3C] shadow-sm'
                      : 'bg-[#1A2B5C] text-white shadow-sm'
                    : isDark
                    ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]'
                    : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>2. Venta</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('shipping')}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  printMode === 'shipping'
                    ? isDark
                      ? 'bg-[#2DD4BF] text-[#0F1B3C] shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : isDark
                    ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]'
                    : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>3. Envío</span>
              </button>
            </div>
          </div>

          {/* Ticket Live Preview Area */}
          <div
            className={`p-3 sm:p-5 overflow-y-auto flex flex-col items-center space-y-3 ${
              isDark ? 'bg-[#0F1B3C]' : 'bg-[#F5EFE0]'
            }`}
          >
            {/* Guide Button / Info Alert */}
            <div
              className={`w-full max-w-[320px] border rounded-xl p-2.5 flex items-start justify-between gap-2 text-[11px] ${
                isDark
                  ? 'bg-[#16234F] border-[#223368] text-[#9AA6C9]'
                  : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <div className="flex items-start gap-1.5">
                <Smartphone className="w-4 h-4 text-[#1A2B5C] dark:text-[#FF6FA5] shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> Puedes imprimir sólo el rótulo de paquete, la comanda o ambos juntos.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className={`font-bold underline shrink-0 cursor-pointer ${
                  isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                }`}
              >
                {showGuide ? 'Ocultar' : 'Guía'}
              </button>
            </div>

            {showGuide && (
              <div
                className={`w-full max-w-[320px] border rounded-xl p-3 text-xs space-y-2 animate-in fade-in ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-slate-300'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              >
                <p className="font-bold flex items-center gap-1.5">
                  <Bluetooth className="w-3.5 h-3.5 text-blue-500" />
                  Impresión Bluetooth con RawBT (tildes y 'ñ'):
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                  <li>
                    <strong>Soporte de caracteres especiales (ñ, tildes):</strong> Se envía con codificación explícita <em>UTF-8</em> para palabras como "Pestañas" o "Papelería".
                  </li>
                  <li>
                    <strong>Si tu impresora aún no muestra la 'ñ':</strong> Selecciona el modo <em>"Gráfico (HTML)"</em> abajo. Este modo dibuja el ticket como gráfico vectorial nítido sin depender del hardware de la comanderita.
                  </li>
                  <li>
                    <strong>Ajuste en app RawBT:</strong> En la app RawBT &gt; Configuración &gt; Modelo de impresora, comprueba que la página de códigos sea <em>CP850 / Latin-1</em> o <em>UTF-8</em>.
                  </li>
                  <li>
                    <strong>Rótulo de Envío:</strong> Diseñado sin montos para pegar directamente en paquetes de encomienda.
                  </li>
                </ol>
              </div>
            )}

            {/* LIVE PAPER PREVIEW (58mm / 384 dots printable width) */}
            <div className="w-full max-w-[320px] space-y-3 select-all">
              {/* TICKET 1: VENTA */}
              {(printMode === 'sale' || printMode === 'both') && (
                <div className="bg-white text-black p-3.5 sm:p-4 rounded-xl shadow-xl font-sans text-xs border border-stone-300 space-y-2.5 w-full">
                  <div className="text-center border-b-2 border-dashed border-black pb-2 space-y-0.5">
                    <p className="text-sm sm:text-base font-black tracking-wider uppercase">
                      IMPORTADORA CHIQUIMINISOS
                    </p>
                    <p className="text-[11px] text-gray-700 font-semibold">
                      Papelería y artículos Kawaii
                    </p>
                    <p className="text-xs font-black mt-1">*** TICKET DE VENTA ***</p>
                    <p className="text-base font-black mt-0.5">PEDIDO #{String(order.orderNumber).padStart(3, '0')}</p>
                    <p className="text-[11px] text-gray-600">{formattedDate}</p>
                    {order.vendedorNombre && (
                      <p className="text-[11px] text-gray-700">Atendido por: {order.vendedorNombre}</p>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="border-b-2 border-dashed border-black pb-2 text-xs space-y-1">
                    <p className="break-words">
                      <span className="font-black">CLIENTE:</span> {order.cliente || 'Mostrador / TikTok'}
                    </p>
                    {order.telefono && (
                      <p>
                        <span className="font-black">TEL/WPP:</span> {formatBoliviaPhone(order.telefono)}
                      </p>
                    )}
                    {order.lugarEntrega && (
                      <p className="break-words">
                        <span className="font-black">ENTREGA:</span> {order.lugarEntrega}
                      </p>
                    )}
                  </div>

                  {/* Items Full-Width Table */}
                  <div className="border-b-2 border-dashed border-black pb-2">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-black text-[11px] font-black uppercase">
                          <th className="text-left py-1">ARTÍCULO / DETALLE</th>
                          <th className="text-right py-1 whitespace-nowrap pl-2">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.productos.map((item, idx) => {
                          const subtotal = item.cantidad * item.precioUnitario;
                          return (
                            <tr key={idx} className="align-top">
                              <td className="py-1.5 pr-2">
                                <div className="font-bold text-xs leading-snug break-words">
                                  {formatArticleItem(item)}
                                </div>
                                {item.cantidad > 1 && (
                                  <div className="text-[11px] text-gray-600 font-medium mt-0.5">
                                    ({formatCurrency(item.precioUnitario)} c/u)
                                  </div>
                                )}
                              </td>
                              <td className="py-1.5 text-right whitespace-nowrap font-black text-xs text-black">
                                {formatCurrency(subtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Table */}
                  <table className="w-full border-collapse text-xs pt-1">
                    <tbody>
                      <tr>
                        <td className="py-1 text-left font-bold">TOTAL A PAGAR:</td>
                        <td className="py-1 text-right whitespace-nowrap font-black text-sm text-black">
                          {formatCurrency(order.total)}
                        </td>
                      </tr>
                      <tr className="text-gray-700">
                        <td className="py-0.5 text-left font-medium">PAGADO / ADELANTO:</td>
                        <td className="py-0.5 text-right whitespace-nowrap font-bold">
                          {formatCurrency(order.pagado)}
                        </td>
                      </tr>
                      <tr className="border-t-2 border-dashed border-black">
                        <td className="pt-1.5 text-left font-black text-xs">SALDO POR COBRAR:</td>
                        <td className="pt-1.5 text-right whitespace-nowrap font-black text-sm text-black">
                          {formatCurrency(order.saldo)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {order.observaciones && (
                    <div className="border-t-2 border-dashed border-black pt-2 text-xs">
                      <span className="font-black">OBS: </span>
                      <span className="italic text-gray-800 break-words">{order.observaciones}</span>
                    </div>
                  )}

                  <div className="text-center pt-2 border-t-2 border-dashed border-black text-[11px] text-gray-700 space-y-0.5">
                    <p className="font-bold text-black">¡Gracias por tu compra! 🇧🇴</p>
                    <p>Importadora Chiquiminisos</p>
                    <p className="text-[10px]">Papelería y artículos Kawaii</p>
                  </div>
                </div>
              )}

              {/* Cut Line indicator when previewing 'both' */}
              {printMode === 'both' && (
                <div className="flex items-center justify-center gap-2 text-stone-500 font-mono text-[11px] font-bold py-1">
                  <span>- - - - -</span>
                  <span>✂️ CORTAR TICKET AQUÍ ✂️</span>
                  <span>- - - - -</span>
                </div>
              )}

              {/* TICKET 2: RÓTULO DE ENVÍO */}
              {(printMode === 'shipping' || printMode === 'both') && (
                <div className="bg-white text-black p-3.5 sm:p-4 rounded-xl shadow-xl font-sans text-xs border-2 border-stone-800 space-y-2.5 w-full">
                  <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
                    <p className="text-sm font-black uppercase tracking-wide">
                      IMPORTADORA CHIQUIMINISOS
                    </p>
                    <p className="text-[11px] text-gray-700 font-medium">
                      Papelería y artículos Kawaii
                    </p>
                    <div className="bg-black text-white font-black text-xs py-1.5 px-2 rounded mt-1.5 tracking-wide">
                      📦 RÓTULO DE ENVÍO / PAQUETE 📦
                    </div>
                    <p className="text-lg font-black mt-1">PEDIDO #{String(order.orderNumber).padStart(3, '0')}</p>
                    <p className="text-[11px] text-gray-600">{formattedDate}</p>
                  </div>

                  {/* Destination */}
                  <div className="space-y-2 py-1">
                    <div className="bg-gray-50 p-2.5 rounded-lg border-2 border-black">
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-wider">CLIENTE / DESTINATARIO:</p>
                      <p className="text-base font-black uppercase tracking-tight text-black break-words leading-tight mt-0.5">
                        {order.cliente || 'CLIENTE (MOSTRADOR / TIKTOK)'}
                      </p>
                      {order.telefono && (
                        <p className="text-xs font-black text-gray-900 mt-1">
                          TEL/WPP: {formatBoliviaPhone(order.telefono)}
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-lg border-2 border-black">
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-wider">DIRECCIÓN DE ENTREGA:</p>
                      <p className="text-xs sm:text-sm font-black uppercase text-black break-words leading-snug mt-0.5">
                        {order.lugarEntrega || 'Mostrador / Por coordinar'}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="border-t-2 border-b-2 border-dashed border-black py-2 space-y-1.5">
                    <div className="flex justify-between font-black text-[11px] border-b border-gray-300 pb-1">
                      <span>DETALLE DE PRODUCTOS:</span>
                      <span>{totalItemsCount} ART. TOTAL</span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-900">
                      {order.productos.map((item, idx) => (
                        <div key={idx} className="break-words font-medium">
                          • <span className="font-bold">{formatArticleItem(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.observaciones && (
                    <div className="border-t-2 border-dashed border-black pt-1.5 text-xs">
                      <span className="font-black">OBS / NOTA: </span>
                      <span className="italic break-words">{order.observaciones}</span>
                    </div>
                  )}

                  <div className="border-t-2 border-black pt-1" />
                </div>
              )}
            </div>
          </div>

          {/* Action Bar - RawBT as Primary Highlighted Action */}
          <div className="p-3 sm:p-4 border-t space-y-2 bg-white border-[#E8DFC8]">
            {/* RawBT Format Mode Selector: Texto UTF-8 vs Gráfico HTML */}
            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="text-[#1A2B5C] font-semibold flex items-center gap-1">
                <Bluetooth className="w-3.5 h-3.5 text-sky-600" />
                Modo Bluetooth (RawBT):
              </span>
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-300">
                <button
                  type="button"
                  onClick={() => setRawbtFormat('text')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    rawbtFormat === 'text'
                      ? 'bg-[#1A2B5C] text-white shadow-xs'
                      : 'text-stone-600 hover:text-black'
                  }`}
                  title="Impresión rápida de texto nativo con codificación UTF-8"
                >
                  Texto UTF-8
                </button>
                <button
                  type="button"
                  onClick={() => setRawbtFormat('html')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    rawbtFormat === 'html'
                      ? 'bg-[#1A2B5C] text-white shadow-xs'
                      : 'text-stone-600 hover:text-black'
                  }`}
                  title="Impresión en modo gráfico: bordes exactos y 100% compatible con tildes y 'ñ'"
                >
                  Gráfico (HTML)
                </button>
              </div>
            </div>

            {/* Primary Highlighted Print Button: RawBT */}
            <button
              id="btn-print-rawbt-primary"
              type="button"
              onClick={() => handleBluetoothRawBT()}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition cursor-pointer bg-[#1A2B5C] hover:bg-[#223773] text-white border border-[#1A2B5C]"
              title={`Imprimir con RawBT en formato ${rawbtFormat === 'html' ? 'Gráfico (HTML con diseño exacto)' : 'Texto plano UTF-8'}`}
            >
              <Bluetooth className="w-5 h-5 text-sky-300 shrink-0" />
              <Printer className="w-5 h-5 shrink-0" />
              <span>Imprimir con App RawBT ({rawbtFormat === 'html' ? 'Gráfico' : 'Texto UTF-8'})</span>
            </button>

            {/* Secondary Alternative Actions */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
              <button
                id="btn-print-browser"
                type="button"
                onClick={handlePrint}
                className="py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-center cursor-pointer border bg-[#FBF7EF] hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]"
                title="Impresión por diálogo de navegador o PC"
              >
                <Printer className="w-3.5 h-3.5 text-[#1A2B5C] shrink-0" />
                <span className="truncate">Navegador / PC</span>
              </button>

              <button
                id="btn-share-ticket"
                type="button"
                onClick={handleShare}
                className="py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-center cursor-pointer border bg-[#FBF7EF] hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]"
                title="Compartir comanda a otra app o Bluetooth"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">Compartir</span>
              </button>

              <button
                id="btn-copy-ticket"
                type="button"
                onClick={handleCopyText}
                className="py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-center cursor-pointer border bg-[#FBF7EF] hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]"
                title="Copiar texto de ticket"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-600 shrink-0" />
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
