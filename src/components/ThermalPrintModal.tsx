import React from 'react';
import { Printer, X, Download, FileText, CheckCircle2, Phone, MapPin, Package, Calendar } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency, formatBoliviaPhone } from '../lib/storage';

interface ThermalPrintModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalPrintModal: React.FC<ThermalPrintModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      {/* Interactive Modal (hidden on print) */}
      <div
        id="thermal-print-modal"
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:hidden animate-in fade-in duration-150"
      >
        <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-purple-500/30">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-900/40">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                  Comanda / Ticket Térmico
                </h2>
                <p className="text-xs text-slate-400">
                  Listo para imprimir en papel térmico o guardar como PDF en tu celular
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

          {/* Ticket Live Preview */}
          <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950/60 flex flex-col items-center">
            {/* 58mm / 80mm Paper Mockup */}
            <div className="w-full max-w-[320px] bg-white text-black p-4 rounded-xl shadow-2xl font-mono text-xs border border-slate-300 space-y-3">
              {/* Ticket Header */}
              <div className="text-center border-b border-dashed border-black pb-2 space-y-0.5">
                <p className="text-sm font-black tracking-wider uppercase font-sans">TIKTOK LIVE SHOP</p>
                <p className="text-[10px] text-gray-700">Mochilas & Papelería Kawaii</p>
                <p className="text-xs font-bold mt-1">*** TICKET DE ENVÍO ***</p>
                <p className="text-sm font-black mt-1">PEDIDO #{String(order.orderNumber).padStart(3, '0')}</p>
                <p className="text-[10px] text-gray-600">{formattedDate}</p>
              </div>

              {/* Customer Information */}
              <div className="border-b border-dashed border-black pb-2 text-[11px] space-y-1">
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

              {/* Items Table */}
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
                        <p className="text-[10px] text-gray-600 pl-4">
                          └ {item.variante}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-600 pl-4">
                        (P.U: {formatCurrency(item.precioUnitario)})
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Financial Totals */}
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

              {/* Observaciones if any */}
              {order.observaciones && (
                <div className="border-t border-dashed border-black pt-2 text-[10px]">
                  <p className="font-bold">OBSERVACIONES:</p>
                  <p className="italic text-gray-800">{order.observaciones}</p>
                </div>
              )}

              {/* Ticket Footer */}
              <div className="text-center pt-2 border-t border-dashed border-black text-[10px] text-gray-700">
                <p>¡Gracias por tu compra en TikTok Live! 🇧🇴</p>
                <p>Favor revisar su paquete al recibir.</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 active:scale-95 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar como PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Pure Print Layout for Thermal Printers & Cellphone PDF Exporter */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-2 font-mono text-xs w-[58mm] sm:w-[80mm] mx-auto z-[9999]">
        <div className="text-center border-b border-dashed border-black pb-2 space-y-0.5">
          <p className="text-sm font-black uppercase font-sans">TIKTOK LIVE SHOP</p>
          <p className="text-[10px]">Mochilas & Papelería</p>
          <p className="text-xs font-bold mt-1">*** TICKET DE ENVÍO ***</p>
          <p className="text-sm font-black mt-1">PEDIDO #{String(order.orderNumber).padStart(3, '0')}</p>
          <p className="text-[10px]">{formattedDate}</p>
        </div>

        <div className="border-b border-dashed border-black py-2 text-[11px] space-y-1">
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

        <div className="border-b border-dashed border-black py-2 space-y-1 text-[11px]">
          <div className="flex justify-between font-bold border-b border-black pb-0.5 text-[10px]">
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
                  <p className="text-[10px] pl-3">
                    └ {item.variante}
                  </p>
                )}
                <p className="text-[10px] pl-3">
                  (P.U: {formatCurrency(item.precioUnitario)})
                </p>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 text-right text-[11px] pt-1">
          <div className="flex justify-between">
            <span>TOTAL:</span>
            <span className="font-black text-sm">{formatCurrency(order.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>PAGADO:</span>
            <span className="font-bold">{formatCurrency(order.pagado)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-black pt-1 font-black text-sm">
            <span>SALDO:</span>
            <span>{formatCurrency(order.saldo)}</span>
          </div>
        </div>

        {order.observaciones && (
          <div className="border-t border-dashed border-black pt-2 text-[10px]">
            <p className="font-bold">NOTAS:</p>
            <p className="italic">{order.observaciones}</p>
          </div>
        )}

        <div className="text-center pt-2 border-t border-dashed border-black text-[10px]">
          <p>¡Gracias por tu compra!</p>
          <p>Bolivia 🇧🇴</p>
        </div>
      </div>
    </>
  );
};
