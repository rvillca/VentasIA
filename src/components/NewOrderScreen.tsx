import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  MapPin,
  Phone,
  User,
  Package,
  ArrowLeft,
  Bot,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { Order, OrderItem } from '../types';
import { formatCurrency, getNextOrderNumber, formatBoliviaPhone } from '../lib/storage';
import { VikaGuideModal } from './VikaGuideModal';

interface NewOrderScreenProps {
  orders: Order[];
  onSaveOrder: (newOrder: Order) => void;
  onCancel: () => void;
  initialDraft?: {
    productos?: Array<{
      nombre: string;
      variante?: string;
      cantidad: number;
      precioUnitario: number;
    }>;
    pagado?: number;
    observaciones?: string;
    cliente?: string;
    telefono?: string;
    lugarEntrega?: string;
  } | null;
  onOpenVika?: () => void;
}

const PACKAGING_PRESETS = [
  'Box de 24 u.',
  'Box de 36 u.',
  'Box de 48 u.',
  'Box de 60 u.',
  'Docena (12 u.)',
  'Media Docena (6 u.)',
  'Unidad',
];

export const NewOrderScreen: React.FC<NewOrderScreenProps> = ({
  orders,
  onSaveOrder,
  onCancel,
  initialDraft,
  onOpenVika,
}) => {
  // Order form state
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [lugarEntrega, setLugarEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [productos, setProductos] = useState<OrderItem[]>([
    {
      id: `item-${Date.now()}-0`,
      nombre: '',
      variante: '',
      cantidad: 1,
      precioUnitario: 0,
    },
  ]);
  const [pagado, setPagado] = useState<number>(0);

  // Auto-populate from initialDraft when VIKA prepares a list
  useEffect(() => {
    if (initialDraft) {
      if (initialDraft.productos && initialDraft.productos.length > 0) {
        const loadedItems: OrderItem[] = initialDraft.productos.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          nombre: item.nombre || '',
          variante: item.variante || '',
          cantidad: Math.max(1, item.cantidad || 1),
          precioUnitario: Math.max(0, item.precioUnitario || 0),
        }));
        setProductos(loadedItems);
      }
      if (initialDraft.pagado !== undefined) setPagado(initialDraft.pagado);
      if (initialDraft.observaciones) setObservaciones(initialDraft.observaciones);
      if (initialDraft.cliente) setCliente(initialDraft.cliente);
      if (initialDraft.telefono) setTelefono(initialDraft.telefono);
      if (initialDraft.lugarEntrega) setLugarEntrega(initialDraft.lugarEntrega);
    }
  }, [initialDraft]);

  // Add a new empty product row
  const handleAddProduct = () => {
    setProductos((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        nombre: '',
        variante: '',
        cantidad: 1,
        precioUnitario: 0,
      },
    ]);
  };

  // Remove a product row
  const handleRemoveProduct = (id: string) => {
    if (productos.length === 1) {
      setProductos([
        {
          id: `item-${Date.now()}-0`,
          nombre: '',
          variante: '',
          cantidad: 1,
          precioUnitario: 0,
        },
      ]);
      return;
    }
    setProductos((prev) => prev.filter((p) => p.id !== id));
  };

  // Update product fields
  const handleUpdateProduct = (
    id: string,
    field: keyof OrderItem,
    value: string | number
  ) => {
    setProductos((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Quick payment presets
  const calculatedTotal = productos.reduce((sum, item) => {
    return sum + (item.cantidad || 0) * (item.precioUnitario || 0);
  }, 0);

  const calculatedSaldo = Math.max(0, calculatedTotal - pagado);

  const handleSetQuickPayment = (type: 'zero' | 'half' | 'full') => {
    if (type === 'zero') setPagado(0);
    else if (type === 'half') setPagado(Math.round(calculatedTotal / 2));
    else if (type === 'full') setPagado(calculatedTotal);
  };

  // Save the order
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCliente = cliente.trim() || 'Cliente Mostrador / TikTok';
    const cleanProductos = productos.filter((p) => p.nombre.trim() !== '');

    if (cleanProductos.length === 0) {
      alert('Por favor ingresa al menos un producto o pídele a VIKA que arme tu lista.');
      return;
    }

    const nextNumber = getNextOrderNumber(orders);
    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      orderNumber: nextNumber,
      cliente: cleanCliente,
      telefono: telefono.trim(),
      lugarEntrega: lugarEntrega.trim(),
      observaciones: observaciones.trim(),
      productos: cleanProductos,
      total: calculatedTotal,
      pagado: Math.max(0, pagado),
      saldo: calculatedSaldo,
      estado: 'Abierto',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveOrder(newOrder);
  };

  return (
    <div id="new-order-container" className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <button
            id="back-to-list-btn"
            type="button"
            onClick={onCancel}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-xl transition-all"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight">
              Nuevo Pedido de Venta
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Registra artículos, presentaciones y asigna precios en Bolivianos (Bs.)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Ver guía de dictado para VIKA"
          >
            <HelpCircle className="w-4 h-4 text-yellow-300" />
            <span className="hidden sm:inline">Guía de Dictado</span>
          </button>

          {onOpenVika && (
            <button
              id="new-order-ask-vika-btn"
              type="button"
              onClick={onOpenVika}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/40 border border-cyan-400/40 transition active:scale-95"
              title="Pedirle a VIKA que prepare el listado por ti"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
              <span>Dictar a VIKA</span>
            </button>
          )}
        </div>
      </div>

      {/* VIKA Assistant Quick Banner */}
      {onOpenVika && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-white shrink-0 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2">
                ¿Quieres armar el pedido dictando por voz o texto?
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Boxes · Docenas · Unidades
                </span>
              </p>
              <p className="text-[11px] text-slate-300">
                Dicta: <em>«1 box de 48 de gomas Kitty más 1 docena de bolígrafos más 1 box de 24 de tajadores Kuromi»</em>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Ver ejemplos
            </button>
            <button
              type="button"
              onClick={onOpenVika}
              className="flex-1 sm:flex-initial px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-purple-900/30"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Abrir VIKA</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Order Form */}
      <form onSubmit={handleSaveOrder} className="space-y-6">
        {/* Customer & Delivery Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-cyan-400" />
            Datos del Destinatario y Entrega
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nombre del Cliente
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-cliente-name"
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ej. Camila Rodriguez / TikTok Live"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Teléfono / WhatsApp</span>
                <span className="text-[10px] text-cyan-400 font-bold">🇧🇴 +591</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-cliente-phone"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  onBlur={() => {
                    if (telefono.trim()) {
                      setTelefono(formatBoliviaPhone(telefono));
                    }
                  }}
                  placeholder="Ej. 71234567 o +591 71234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            {/* Lugar de Entrega */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Lugar o Punto de Entrega
              </label>
              <div className="relative mb-2">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-delivery-location"
                  type="text"
                  value={lugarEntrega}
                  onChange={(e) => setLugarEntrega(e.target.value)}
                  placeholder="Ej. Teleférico Morado Prado / Envío Cochabamba"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              {/* Quick Delivery Shortcuts */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Envío a Domicilio',
                  'Teleférico Morado',
                  'Teleférico Rojo',
                  'Ceja El Alto',
                  'Plaza San Francisco',
                  'Cochabamba - Centro',
                  'Santa Cruz - 2do Anillo',
                  'Retiro en Tienda',
                ].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLugarEntrega(loc)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded-lg border border-slate-700/60 transition-colors"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Observaciones / Notas Especiales
              </label>
              <textarea
                id="input-observaciones"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles de empaque, regalo, horario convenido o especificaciones..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Products List Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                Artículos del Pedido ({productos.length})
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ingresa o ajusta el precio unitario en Bs. para cada artículo dictado
              </p>
            </div>

            <button
              id="add-product-btn"
              type="button"
              onClick={handleAddProduct}
              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Artículo</span>
            </button>
          </div>

          <div className="space-y-3">
            {productos.map((prod, index) => {
              const subtotal = (prod.cantidad || 0) * (prod.precioUnitario || 0);
              return (
                <div
                  key={prod.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      {/* Product Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Producto #{index + 1}
                        </label>
                        <input
                          type="text"
                          value={prod.nombre}
                          onChange={(e) =>
                            handleUpdateProduct(prod.id, 'nombre', e.target.value)
                          }
                          placeholder="Ej. Gomas Kitty, Bolígrafos Sanrio, Tajadores Kuromi..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 font-semibold"
                        />
                      </div>

                      {/* Variant / Presentation */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                          <span>Presentación / Empaque / Variante</span>
                          <span className="text-[10px] text-purple-300">Selección rápida:</span>
                        </label>
                        <input
                          type="text"
                          value={prod.variante}
                          onChange={(e) =>
                            handleUpdateProduct(prod.id, 'variante', e.target.value)
                          }
                          placeholder="Ej. Box de 48 u., Docena (12 u.), Media Docena..."
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-1.5"
                        />

                        {/* Quick Presentation presets */}
                        <div className="flex flex-wrap gap-1">
                          {PACKAGING_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleUpdateProduct(prod.id, 'variante', preset)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                                prod.variante === preset
                                  ? 'bg-purple-600 text-white font-bold'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(prod.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors mt-6"
                      title="Eliminar artículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity & Unit Price & Subtotal Row */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 items-center">
                    {/* Quantity with touch buttons */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Cantidad
                      </label>
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateProduct(
                              prod.id,
                              'cantidad',
                              Math.max(1, (prod.cantidad || 1) - 1)
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-800 active:bg-slate-700 text-base font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={prod.cantidad}
                          onChange={(e) =>
                            handleUpdateProduct(
                              prod.id,
                              'cantidad',
                              Math.max(1, parseInt(e.target.value, 10) || 1)
                            )
                          }
                          className="w-full bg-transparent text-center text-xs font-bold text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateProduct(
                              prod.id,
                              'cantidad',
                              (prod.cantidad || 1) + 1
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-800 active:bg-slate-700 text-base font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Precio Unitario (Bs.)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                          Bs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={prod.precioUnitario || ''}
                          onChange={(e) =>
                            handleUpdateProduct(
                              prod.id,
                              'precioUnitario',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-9 pr-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </div>
                    </div>

                    {/* Subtotal Display */}
                    <div className="text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Subtotal
                      </span>
                      <span className="text-sm font-extrabold text-cyan-300">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Calculation Summary Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white font-['Outfit',sans-serif] flex items-center gap-2 border-b border-slate-800 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Cálculo de Pagos y Saldo (Bolivia)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Total Calculado */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Pedido
              </span>
              <span className="text-2xl font-black text-white font-['Outfit',sans-serif] tracking-tight">
                {formatCurrency(calculatedTotal)}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Calculado automáticamente
              </p>
            </div>

            {/* Pagado (Abono Manual) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                Monto Pagado / Abono (Bs.)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                  Bs.
                </span>
                <input
                  id="input-order-pagado"
                  type="number"
                  min="0"
                  step="1"
                  value={pagado || ''}
                  onChange={(e) =>
                    setPagado(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  placeholder="0"
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg py-2 pl-9 pr-3 text-base font-bold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Quick Payment Shortcut Chips */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('zero')}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-medium"
                >
                  Bs. 0
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('half')}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-medium"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('full')}
                  className="flex-1 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-[10px] text-emerald-300 rounded font-medium"
                >
                  Total
                </button>
              </div>
            </div>

            {/* Saldo Pendiente */}
            <div
              className={`border rounded-xl p-4 transition-colors ${
                calculatedSaldo <= 0
                  ? 'bg-emerald-950/40 border-emerald-500/40'
                  : 'bg-amber-950/40 border-amber-500/40'
              }`}
            >
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Saldo Pendiente
              </span>
              <span
                className={`text-2xl font-black font-['Outfit',sans-serif] tracking-tight ${
                  calculatedSaldo <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {formatCurrency(calculatedSaldo)}
              </span>
              <span
                className={`inline-block text-[11px] font-bold mt-1 px-2 py-0.5 rounded-md ${
                  calculatedSaldo <= 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {calculatedSaldo <= 0 ? '✅ Totalmente Pagado' : '⚠️ Pendiente de Cobro'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            id="confirm-save-order-btn"
            type="submit"
            className="flex-1 py-4 px-6 rounded-xl font-bold text-base text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 active:scale-[0.99] shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Guardar Pedido Permanentemente</span>
          </button>

          <button
            id="cancel-confirmation-btn"
            type="button"
            onClick={onCancel}
            className="py-3.5 px-6 rounded-xl font-semibold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] transition-all"
          >
            Cancelar
          </button>
        </div>
      </form>

      {/* Guide Modal */}
      <VikaGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectPrompt={(prompt) => {
          if (onOpenVika) {
            onOpenVika();
          }
        }}
      />
    </div>
  );
};
