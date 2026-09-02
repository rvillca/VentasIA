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
  Box,
  Pencil,
  Check,
} from 'lucide-react';
import { Order, OrderItem } from '../types';
import { formatCurrency, getNextOrderNumber, formatBoliviaPhone } from '../lib/storage';
import { VikaGuideModal } from './VikaGuideModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { PackagingQuickSelector } from './PackagingQuickSelector';
import { PackagingSelectionModal } from './PackagingSelectionModal';

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

export const NewOrderScreen: React.FC<NewOrderScreenProps> = ({
  orders,
  onSaveOrder,
  onCancel,
  initialDraft,
  onOpenVika,
}) => {
  const { userProfile } = useAuth();
  const { isDark } = useTheme();

  // Order form state
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [lugarEntrega, setLugarEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [packagingModalItem, setPackagingModalItem] = useState<OrderItem | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(`item-init-0`);
  const [productos, setProductos] = useState<OrderItem[]>([
    {
      id: `item-init-0`,
      nombre: '',
      variante: '',
      cantidad: 1,
      precioUnitario: 0,
    },
  ]);
  const [pagado, setPagado] = useState<number>(0);

  // Check if an item has all core fields completed (nombre, variante, cantidad > 0, precio > 0)
  const isItemComplete = (item: OrderItem): boolean => {
    return Boolean(
      item.nombre && item.nombre.trim() !== '' &&
      item.variante && item.variante.trim() !== '' &&
      (item.cantidad || 0) > 0 &&
      (item.precioUnitario || 0) > 0
    );
  };

  // Helper to scroll and focus directly on an item card and input
  const focusAndCenterProduct = (id: string) => {
    setTimeout(() => {
      const cardEl = document.getElementById(`product-card-${id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputEl = document.getElementById(`product-name-input-${id}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
      }
    }, 120);
  };

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
        // Find if any item is incomplete; if so, expand that one, otherwise keep all collapsed
        const firstIncomplete = loadedItems.find((it) => !isItemComplete(it));
        setEditingItemId(firstIncomplete ? firstIncomplete.id : null);
      }
      if (initialDraft.pagado !== undefined) setPagado(initialDraft.pagado);
      if (initialDraft.observaciones) setObservaciones(initialDraft.observaciones);
      if (initialDraft.cliente) setCliente(initialDraft.cliente);
      if (initialDraft.telefono) setTelefono(initialDraft.telefono);
      if (initialDraft.lugarEntrega) setLugarEntrega(initialDraft.lugarEntrega);
    }
  }, [initialDraft]);

  // Add a new empty product row, expand it, and center/focus view
  const handleAddProduct = () => {
    const newId = `item-${Date.now()}-${productos.length}`;
    setProductos((prev) => [
      ...prev,
      {
        id: newId,
        nombre: '',
        variante: '',
        cantidad: 1,
        precioUnitario: 0,
      },
    ]);
    setEditingItemId(newId);
    focusAndCenterProduct(newId);
  };

  // Start editing an item, expanding it and focusing input
  const handleStartEditing = (id: string) => {
    setEditingItemId(id);
    focusAndCenterProduct(id);
  };

  // Remove a product row
  const handleRemoveProduct = (id: string) => {
    if (productos.length === 1) {
      const resetId = `item-${Date.now()}-0`;
      setProductos([
        {
          id: resetId,
          nombre: '',
          variante: '',
          cantidad: 1,
          precioUnitario: 0,
        },
      ]);
      setEditingItemId(resetId);
      return;
    }
    setProductos((prev) => prev.filter((p) => p.id !== id));
    if (editingItemId === id) {
      setEditingItemId(null);
    }
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
    else if (type === 'half') setPagado(Number((calculatedTotal / 2).toFixed(2)));
    else if (type === 'full') setPagado(calculatedTotal);
  };

  // Save the order
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCliente = cliente.trim() || 'Cliente Mostrador / TikTok';
    const cleanProductos = productos
      .filter((p) => p.nombre.trim() !== '')
      .map((p) => ({
        ...p,
        cantidad: Math.max(1, p.cantidad || 1),
      }));

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
      vendedorUid: userProfile?.uid,
      vendedorNombre: userProfile?.displayName || 'Vendedor',
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
            className={`p-2.5 rounded-2xl transition-all border cursor-pointer ${
              isDark
                ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
            }`}
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight ${
              isDark ? 'text-white' : 'text-[#1A2B5C]'
            }`}>
              Nuevo Pedido de Venta
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
              Registra artículos, presentaciones y asigna precios en Bolivianos (Bs.)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className={`px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border cursor-pointer ${
              isDark
                ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-[#B39DDB] border-[#223368]'
                : 'bg-white hover:bg-[#F5EFE0] text-[#5B21B6] border-[#E8DFC8]'
            }`}
            title="Ver guía de dictado para VIKA"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Guía de Dictado</span>
          </button>

          {onOpenVika && (
            <button
              id="new-order-ask-vika-btn"
              type="button"
              onClick={onOpenVika}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25 border border-[#FF6FA5]'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
              }`}
              title="Pedirle a VIKA que prepare el listado por ti"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dictar a VIKA</span>
            </button>
          )}
        </div>
      </div>

      {/* VIKA Assistant Quick Banner */}
      {onOpenVika && (
        <div className={`mb-6 p-4 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
          isDark
            ? 'bg-[#16234F] border-[#223368]'
            : 'bg-white border-[#E8DFC8]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#1A2B5C] text-white'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-xs font-bold font-['Outfit',sans-serif] flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                ¿Quieres armar el pedido dictando por voz o texto?
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  isDark ? 'bg-[#FF6FA5]/20 text-[#FF6FA5]' : 'bg-[#E8DFC8] text-[#1A2B5C]'
                }`}>
                  Boxes · Docenas · Unidades
                </span>
              </p>
              <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Dicta: <em>«1 box de 48 de gomas Kitty más 1 docena de bolígrafos más 1 box de 24 de tajadores Kuromi»</em>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition border cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] text-[#9AA6C9] hover:text-white border-[#223368]'
                  : 'bg-[#F5EFE0] text-[#1A2B5C] hover:bg-[#EBE2CF] border-[#E8DFC8]'
              }`}
            >
              Ver ejemplos
            </button>
            <button
              type="button"
              onClick={onOpenVika}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Abrir VIKA</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Order Form */}
      <form onSubmit={handleSaveOrder} className="space-y-6">
        {/* Customer & Delivery Card */}
        <div className={`border rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <h2 className={`text-base font-bold font-['Outfit',sans-serif] flex items-center gap-2 border-b pb-3 ${
            isDark ? 'text-white border-[#223368]' : 'text-[#1A2B5C] border-[#E8DFC8]'
          }`}>
            <User className={`w-5 h-5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
            Datos del Destinatario y Entrega
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cliente */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Nombre del Cliente
              </label>
              <div className="relative">
                <User className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`} />
                <input
                  id="input-cliente-name"
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ej. Camila Rodriguez / TikTok Live"
                  className={`w-full border rounded-xl py-2.5 pl-10 pr-3.5 text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                <span>Teléfono / WhatsApp</span>
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>🇧🇴 +591</span>
              </label>
              <div className="relative">
                <Phone className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`} />
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
                  className={`w-full border rounded-xl py-2.5 pl-10 pr-3.5 text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
                />
              </div>
            </div>

            {/* Lugar de Entrega */}
            <div className="sm:col-span-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Lugar o Punto de Entrega
              </label>
              <div className="relative mb-2">
                <MapPin className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`} />
                <input
                  id="input-delivery-location"
                  type="text"
                  value={lugarEntrega}
                  onChange={(e) => setLugarEntrega(e.target.value)}
                  placeholder="Ej. Teleférico Morado Prado / Envío Cochabamba"
                  className={`w-full border rounded-xl py-2.5 pl-10 pr-3.5 text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                      : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
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
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-[#9AA6C9] hover:text-white border-[#223368]'
                        : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border-[#E8DFC8]'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div className="sm:col-span-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Observaciones / Notas Especiales
              </label>
              <textarea
                id="input-observaciones"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles de empaque, regalo, horario convenido o especificaciones..."
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Products List Card */}
        <div className={`border rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
          }`}>
            <div>
              <h2 className={`text-base font-bold font-['Outfit',sans-serif] flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                <Package className={`w-5 h-5 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
                Artículos del Pedido ({productos.length})
              </h2>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Ingresa o ajusta el precio unitario en Bs. para cada artículo
              </p>
            </div>

            <button
              id="add-product-btn"
              type="button"
              onClick={handleAddProduct}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors border cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] text-[#FF6FA5] border-[#223368]'
                  : 'bg-[#F5EFE0] hover:bg-[#EBE2CF] text-[#1A2B5C] border-[#E8DFC8]'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Agregar Artículo</span>
            </button>
          </div>

          <div className="space-y-3">
            {productos.map((prod, index) => {
              const subtotal = (prod.cantidad || 0) * (prod.precioUnitario || 0);
              const complete = isItemComplete(prod);
              const isExpanded = editingItemId === prod.id || (editingItemId === null && !complete);

              // Compact collapsed row for products that are completed or not currently being edited
              if (!isExpanded) {
                return (
                  <div
                    key={prod.id}
                    id={`product-card-${prod.id}`}
                    onClick={() => handleStartEditing(prod.id)}
                    className={`p-3 sm:py-2.5 sm:px-3.5 border rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                      isDark
                        ? 'bg-[#0F1B3C]/75 border-[#223368] hover:bg-[#16234F] hover:border-[#FF6FA5]/40 text-white'
                        : 'bg-[#FBF7EF] border-[#E8DFC8] hover:bg-[#F5EFE0] hover:border-[#1A2B5C]/30 text-[#1A2B5C]'
                    }`}
                    title="Toca para editar este artículo"
                  >
                    {/* Left: Product index and summary */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                          isDark ? 'bg-[#16234F] text-[#FF6FA5]' : 'bg-[#EAE0D0] text-[#1A2B5C]'
                        }`}
                      >
                        #{index + 1}
                      </span>

                      <div className="flex flex-wrap sm:flex-nowrap items-baseline sm:items-center gap-x-2 gap-y-0.5 min-w-0 flex-1 text-xs sm:text-sm">
                        <span className="font-bold truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                          {prod.nombre || 'Artículo sin nombre'}
                        </span>

                        {complete ? (
                          <>
                            <span className={`hidden sm:inline ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>·</span>
                            <span className={`text-[11px] sm:text-xs font-semibold shrink-0 ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                              {prod.cantidad}x {prod.variante || 'Unidad'}
                            </span>
                            <span className={`hidden sm:inline ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>·</span>
                            <span className={`font-black text-xs sm:text-sm shrink-0 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                              {formatCurrency(subtotal)}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                            ⚠️ Faltan datos (toca para completar)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions (Edit & Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditing(prod.id);
                        }}
                        className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                          isDark
                            ? 'text-[#9AA6C9] group-hover:text-[#FF6FA5] hover:bg-[#16234F]'
                            : 'text-[#78716C] group-hover:text-[#1A2B5C] hover:bg-white'
                        }`}
                        title="Editar artículo"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProduct(prod.id);
                        }}
                        className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                          isDark
                            ? 'text-[#9AA6C9] hover:text-rose-400 hover:bg-[#16234F]'
                            : 'text-[#78716C] hover:text-rose-600 hover:bg-white'
                        }`}
                        title="Eliminar artículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              // Expanded full editing card
              return (
                <div
                  key={prod.id}
                  id={`product-card-${prod.id}`}
                  className={`p-3.5 sm:p-4 border-2 rounded-2xl space-y-3 transition-all ${
                    isDark
                      ? 'bg-[#0F1B3C] border-[#FF6FA5]/60 shadow-lg shadow-[#FF6FA5]/5'
                      : 'bg-[#FBF7EF] border-[#1A2B5C]/50 shadow-md shadow-[#1A2B5C]/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      {/* Product Name & Header */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            htmlFor={`product-name-input-${prod.id}`}
                            className={`block text-[11px] font-bold uppercase tracking-wider ${
                              isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                            }`}
                          >
                            Producto #{index + 1} (En edición)
                          </label>

                          {complete && (
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                                isDark
                                  ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-[#4FD1B5] border-[#4FD1B5]/30'
                                  : 'bg-white hover:bg-[#EAE0D0] text-[#0F766E] border-[#99F6E4]'
                              }`}
                              title="Listo / Colapsar este artículo"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Listo</span>
                            </button>
                          )}
                        </div>

                        <input
                          id={`product-name-input-${prod.id}`}
                          type="text"
                          value={prod.nombre}
                          onChange={(e) =>
                            handleUpdateProduct(prod.id, 'nombre', e.target.value)
                          }
                          placeholder="Ej. Gomas Kitty, Bolígrafos Sanrio, Tajadores Kuromi..."
                          className={`w-full border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none ${
                            isDark
                              ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                              : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                          }`}
                        />
                      </div>

                      {/* Variant / Presentation */}
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 flex items-center justify-between ${
                          isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                        }`}>
                          <span>Presentación / Empaque / Variante</span>
                          <span className={`text-[10px] font-bold ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`}>
                            Toca para abrir ventana:
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={prod.variante}
                            onClick={() => setPackagingModalItem(prod)}
                            onChange={(e) =>
                              handleUpdateProduct(prod.id, 'variante', e.target.value)
                            }
                            placeholder="Ej. Box de 48 u., Docena (12 u.), Medio Box..."
                            className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                              isDark
                                ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/60 focus:ring-2 focus:ring-[#FF6FA5]'
                                : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/60 focus:ring-2 focus:ring-[#1A2B5C]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setPackagingModalItem(prod)}
                            className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer ${
                              isDark
                                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C]'
                                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white'
                            }`}
                            title="Abrir ventana de selección de cajas y docenas"
                          >
                            <Box className="w-3.5 h-3.5" />
                            <span>Elegir Box</span>
                          </button>
                        </div>

                        {/* Direct Mobile Quick Badge if selected */}
                        {prod.variante && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                              Seleccionado:
                            </span>
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 border ${
                              isDark
                                ? 'bg-[#16234F] text-[#FF6FA5] border-[#223368]'
                                : 'bg-white text-[#1A2B5C] border-[#E8DFC8]'
                            }`}>
                              ✨ {prod.variante}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(prod.id)}
                      className={`p-2 rounded-xl transition-colors mt-6 cursor-pointer ${
                        isDark
                          ? 'text-[#9AA6C9] hover:text-rose-400 hover:bg-[#16234F]'
                          : 'text-[#78716C] hover:text-rose-600 hover:bg-white'
                      }`}
                      title="Eliminar artículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity & Unit Price & Subtotal Row */}
                  <div className={`grid grid-cols-3 gap-2 pt-2 border-t items-center ${
                    isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
                  }`}>
                    {/* Quantity with touch buttons */}
                    <div>
                      <label className={`block text-[10px] uppercase font-bold mb-1 ${
                        isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                      }`}>
                        Cantidad
                      </label>
                      <div className={`flex items-center border rounded-xl overflow-hidden ${
                        isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
                      }`}>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateProduct(
                              prod.id,
                              'cantidad',
                              Math.max(0, (prod.cantidad || 0) - 1)
                            )
                          }
                          className={`w-8 h-8 flex items-center justify-center text-base font-bold ${
                            isDark ? 'text-white hover:bg-[#0F1B3C]' : 'text-[#1A2B5C] hover:bg-[#F5EFE0]'
                          }`}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={prod.cantidad === 0 ? '' : prod.cantidad}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateProduct(
                              prod.id,
                              'cantidad',
                              val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0)
                            );
                          }}
                          placeholder="0"
                          className={`w-full bg-transparent text-center text-xs font-black focus:outline-none ${
                            isDark ? 'text-white' : 'text-[#1A2B5C]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateProduct(
                              prod.id,
                              'cantidad',
                              (prod.cantidad || 0) + 1
                            )
                          }
                          className={`w-8 h-8 flex items-center justify-center text-base font-bold ${
                            isDark ? 'text-white hover:bg-[#0F1B3C]' : 'text-[#1A2B5C] hover:bg-[#F5EFE0]'
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className={`block text-[10px] uppercase font-bold mb-1 ${
                        isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                      }`}>
                        Precio Unitario (Bs.)
                      </label>
                      <div className="relative">
                        <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold ${
                          isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                        }`}>
                          Bs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={prod.precioUnitario === 0 ? '' : (prod.precioUnitario || '')}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateProduct(
                              prod.id,
                              'precioUnitario',
                              val === '' ? 0 : Math.max(0, parseFloat(val) || 0)
                            );
                          }}
                          placeholder="0.00"
                          className={`w-full border rounded-xl py-1.5 pl-9 pr-2 text-xs font-black focus:outline-none ${
                            isDark
                              ? 'bg-[#16234F] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                              : 'bg-white border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Subtotal Display */}
                    <div className="text-right">
                      <span className={`block text-[10px] uppercase font-bold mb-0.5 ${
                        isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                      }`}>
                        Subtotal
                      </span>
                      <span className={`text-sm font-black font-['Outfit',sans-serif] ${
                        isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                      }`}>
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Add Product Button - Always visible at the end of the list */}
            <button
              id="add-product-btn-bottom"
              type="button"
              onClick={handleAddProduct}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border-2 border-dashed transition-all active:scale-[0.99] cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C]/50 hover:bg-[#16234F] text-[#FF6FA5] border-[#223368] hover:border-[#FF6FA5]/60'
                  : 'bg-[#FBF7EF] hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8] hover:border-[#1A2B5C]/40'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Agregar Otro Artículo</span>
            </button>
          </div>
        </div>

        {/* Financial Calculation Summary Card */}
        <div className={`border rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}>
          <h2 className={`text-base font-bold font-['Outfit',sans-serif] flex items-center gap-2 border-b pb-3 ${
            isDark ? 'text-white border-[#223368]' : 'text-[#1A2B5C] border-[#E8DFC8]'
          }`}>
            <DollarSign className={`w-5 h-5 ${isDark ? 'text-[#4FD1B5]' : 'text-[#0F766E]'}`} />
            Cálculo de Pagos y Saldo (Bolivia)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Total Calculado */}
            <div className={`border rounded-2xl p-4 ${
              isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
            }`}>
              <span className={`block text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Total Pedido
              </span>
              <span className={`text-2xl font-black font-['Outfit',sans-serif] tracking-tight ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                {formatCurrency(calculatedTotal)}
              </span>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA6C9]/70' : 'text-[#78716C]/80'}`}>
                Calculado automáticamente
              </p>
            </div>

            {/* Pagado (Abono Manual) */}
            <div className={`border rounded-2xl p-4 space-y-2 ${
              isDark ? 'bg-[#0F1B3C] border-[#4FD1B5]/30' : 'bg-[#E6FFFA] border-[#99F6E4]'
            }`}>
              <label className={`block text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-[#4FD1B5]' : 'text-[#0D9488]'
              }`}>
                Monto Pagado / Abono (Bs.)
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                  isDark ? 'text-[#4FD1B5]' : 'text-[#0D9488]'
                }`}>
                  Bs.
                </span>
                <input
                  id="input-order-pagado"
                  type="number"
                  min="0"
                  step="any"
                  value={pagado === 0 ? '' : pagado}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPagado(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                  }}
                  placeholder="0.00"
                  className={`w-full border rounded-xl py-2 pl-9 pr-3 text-base font-black focus:outline-none ${
                    isDark
                      ? 'bg-[#16234F] border-[#4FD1B5]/50 text-[#4FD1B5] focus:ring-2 focus:ring-[#4FD1B5]'
                      : 'bg-white border-[#99F6E4] text-[#0F766E] focus:ring-2 focus:ring-[#0F766E]'
                  }`}
                />
              </div>

              {/* Quick Payment Shortcut Chips */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('zero')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition ${
                    isDark
                      ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white border-[#223368]'
                      : 'bg-white text-[#1A2B5C] hover:bg-[#F5EFE0] border-[#E8DFC8]'
                  }`}
                >
                  Bs. 0
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('half')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition ${
                    isDark
                      ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white border-[#223368]'
                      : 'bg-white text-[#1A2B5C] hover:bg-[#F5EFE0] border-[#E8DFC8]'
                  }`}
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('full')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-black border transition ${
                    isDark
                      ? 'bg-[#4FD1B5] text-[#064E3B] border-[#4FD1B5]'
                      : 'bg-[#0F766E] text-white border-[#0F766E]'
                  }`}
                >
                  Total
                </button>
              </div>
            </div>

            {/* Saldo Pendiente */}
            <div
              className={`border rounded-2xl p-4 transition-colors ${
                calculatedSaldo <= 0
                  ? isDark
                    ? 'bg-[#0F1B3C] border-[#4FD1B5]/30'
                    : 'bg-[#E6FFFA] border-[#99F6E4]'
                  : isDark
                  ? 'bg-[#0F1B3C] border-[#FFA26B]/30'
                  : 'bg-[#FFF7ED] border-[#FED7AA]'
              }`}
            >
              <span className={`block text-xs font-bold uppercase tracking-wider ${
                calculatedSaldo <= 0
                  ? isDark ? 'text-[#4FD1B5]' : 'text-[#0D9488]'
                  : isDark ? 'text-[#FFA26B]' : 'text-[#EA580C]'
              }`}>
                Saldo Pendiente
              </span>
              <span
                className={`text-2xl font-black font-['Outfit',sans-serif] tracking-tight ${
                  calculatedSaldo <= 0
                    ? isDark ? 'text-[#4FD1B5]' : 'text-[#0F766E]'
                    : isDark ? 'text-[#FFA26B]' : 'text-[#C2410C]'
                }`}
              >
                {formatCurrency(calculatedSaldo)}
              </span>
              <span
                className={`inline-block text-[11px] font-black mt-1 px-2.5 py-0.5 rounded-lg border ${
                  calculatedSaldo <= 0
                    ? isDark
                      ? 'bg-[#4FD1B5]/20 text-[#4FD1B5] border-[#4FD1B5]/30'
                      : 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]'
                    : isDark
                    ? 'bg-[#FFA26B]/20 text-[#FFA26B] border-[#FFA26B]/30'
                    : 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]'
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
            className={`flex-1 py-4 px-6 rounded-2xl font-black text-base active:scale-[0.99] shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDark
                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25 border border-[#FF6FA5]'
                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Guardar Pedido Permanentemente</span>
          </button>

          <button
            id="cancel-confirmation-btn"
            type="button"
            onClick={onCancel}
            className={`py-3.5 px-6 rounded-2xl font-bold text-sm transition-all border cursor-pointer ${
              isDark
                ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
            }`}
          >
            Cancelar
          </button>
        </div>
      </form>

      {/* Floating Action Button for Adding Products anywhere without scrolling */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          id="fab-add-product-btn"
          type="button"
          onClick={handleAddProduct}
          className={`py-3 px-4 sm:px-5 rounded-full font-black text-xs sm:text-sm active:scale-95 shadow-2xl flex items-center gap-2 transition-all cursor-pointer border ${
            isDark
              ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] border-[#FF6FA5]/40 shadow-lg shadow-black/40'
              : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white border-[#1A2B5C] shadow-lg shadow-black/25'
          }`}
          title="Agregar artículo rápidamente (+)"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Agregar Artículo</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-0.5 ${
              isDark ? 'bg-[#0F1B3C]/20 text-[#0F1B3C]' : 'bg-white/20 text-white'
            }`}
          >
            {productos.length}
          </span>
        </button>
      </div>

      {/* Packaging Selection Modal for Mobile & Quick selection */}
      {packagingModalItem && (
        <PackagingSelectionModal
          isOpen={!!packagingModalItem}
          onClose={() => setPackagingModalItem(null)}
          productName={packagingModalItem.nombre || `Producto #${productos.findIndex((p) => p.id === packagingModalItem.id) + 1}`}
          currentValue={packagingModalItem.variante}
          onSelect={(presetLabel, suggestedUnits) => {
            handleUpdateProduct(packagingModalItem.id, 'variante', presetLabel);
            if (suggestedUnits && (!packagingModalItem.cantidad || packagingModalItem.cantidad === 0)) {
              handleUpdateProduct(packagingModalItem.id, 'cantidad', 1);
            }
          }}
        />
      )}

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
