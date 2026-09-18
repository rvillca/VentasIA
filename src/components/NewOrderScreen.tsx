import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Bot,
  HelpCircle,
  Pencil,
  Loader2,
  AlertTriangle,
  FileText,
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
  onSaveOrder: (newOrder: Order) => Promise<void> | void;
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
  };
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
  const [showObsInput, setShowObsInput] = useState(false);
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const isDiscardingRef = useRef<boolean>(false);
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const DRAFT_STORAGE_KEY = 'ventasia_new_order_draft';
  const [restoredDraftTime, setRestoredDraftTime] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmittingRef.current) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const isItemComplete = (item: OrderItem): boolean => {
    return Boolean(
      item.nombre &&
      item.nombre.trim() !== '' &&
      (item.cantidad || 0) > 0 &&
      (item.precioUnitario || 0) > 0
    );
  };

  const focusAndCenterProduct = (id: string) => {
    setTimeout(() => {
      const cardEl = document.getElementById(`product-card-${id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      const inputEl = document.getElementById(`product-name-input-${id}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
      }
    }, 80);
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
        const firstIncomplete = loadedItems.find((it) => !isItemComplete(it));
        setEditingItemId(firstIncomplete ? firstIncomplete.id : null);
      }
      if (initialDraft.pagado !== undefined) setPagado(initialDraft.pagado);
      if (initialDraft.observaciones) {
        setObservaciones(initialDraft.observaciones);
        setShowObsInput(true);
      }
      if (initialDraft.cliente) setCliente(initialDraft.cliente);
      if (initialDraft.telefono) setTelefono(initialDraft.telefono);
      if (initialDraft.lugarEntrega) setLugarEntrega(initialDraft.lugarEntrega);
    } else {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const hasContent =
            (parsed.cliente && parsed.cliente.trim() !== '') ||
            (parsed.telefono && parsed.telefono.trim() !== '') ||
            (parsed.lugarEntrega && parsed.lugarEntrega.trim() !== '') ||
            (parsed.observaciones && parsed.observaciones.trim() !== '') ||
            (parsed.productos &&
              parsed.productos.some((p: any) => (p.nombre && p.nombre.trim() !== '') || p.precioUnitario > 0));

          if (hasContent) {
            if (parsed.cliente) setCliente(parsed.cliente);
            if (parsed.telefono) setTelefono(parsed.telefono);
            if (parsed.lugarEntrega) setLugarEntrega(parsed.lugarEntrega);
            if (parsed.observaciones) {
              setObservaciones(parsed.observaciones);
              setShowObsInput(true);
            }
            if (parsed.pagado !== undefined) setPagado(parsed.pagado);
            if (parsed.productos && parsed.productos.length > 0) {
              setProductos(parsed.productos);
              setEditingItemId(parsed.productos[0]?.id || null);
            }
            if (parsed.savedAt) {
              const d = new Date(parsed.savedAt);
              setRestoredDraftTime(
                d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              );
            }
            setShowDraftBanner(true);
          }
        }
      } catch (e) {
        console.warn('Could not restore order draft:', e);
      }
    }
  }, [initialDraft]);

  // Continuously auto-save to localStorage
  useEffect(() => {
    if (isDiscardingRef.current || isSubmittingRef.current) return;

    const hasMeaningfulData =
      cliente.trim() !== '' ||
      telefono.trim() !== '' ||
      lugarEntrega.trim() !== '' ||
      observaciones.trim() !== '' ||
      productos.some((p) => p.nombre.trim() !== '' || p.precioUnitario > 0);

    if (hasMeaningfulData) {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            cliente,
            telefono,
            lugarEntrega,
            observaciones,
            pagado,
            productos,
            savedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.warn('Could not auto-save order draft:', e);
      }
    }
  }, [cliente, telefono, lugarEntrega, observaciones, pagado, productos]);

  const handleDiscardDraft = () => {
    isDiscardingRef.current = true;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not remove order draft:', e);
    }

    setCliente('');
    setTelefono('');
    setLugarEntrega('');
    setObservaciones('');
    setShowObsInput(false);
    setPagado(0);
    const freshId = `item-${Date.now()}-0`;
    setProductos([
      {
        id: freshId,
        nombre: '',
        variante: '',
        cantidad: 1,
        precioUnitario: 0,
      },
    ]);
    setEditingItemId(freshId);
    setShowDraftBanner(false);
    setRestoredDraftTime(null);
    setConfirmDiscard(false);

    // Keep draft storage clean after reset settles
    setTimeout(() => {
      isDiscardingRef.current = false;
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
    }, 400);
  };

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

  const handleStartEditing = (id: string) => {
    setEditingItemId(id);
    focusAndCenterProduct(id);
  };

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

  // Calculations
  const calculatedTotal = productos.reduce((sum, item) => {
    return sum + (item.cantidad || 0) * (item.precioUnitario || 0);
  }, 0);

  const calculatedSaldo = Math.max(0, calculatedTotal - pagado);

  const handleSetQuickPayment = (type: 'zero' | 'half' | 'full') => {
    if (type === 'zero') setPagado(0);
    else if (type === 'half') setPagado(Number((calculatedTotal / 2).toFixed(2)));
    else if (type === 'full') setPagado(calculatedTotal);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    const cleanCliente = cliente.trim() || 'Cliente Mostrador / TikTok';
    const cleanProductos = productos
      .filter((p) => p.nombre.trim() !== '')
      .map((p) => ({
        ...p,
        cantidad: Math.max(1, p.cantidad || 1),
      }));

    if (cleanProductos.length === 0) {
      setFormError('Por favor ingresa al menos un producto con nombre antes de guardar.');
      setTimeout(() => setFormError(null), 4000);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
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

      await onSaveOrder(newOrder);

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
    } catch (err) {
      console.error('Error in onSaveOrder:', err);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const nextNumber = getNextOrderNumber(orders);

  return (
    <div
      id="new-order-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
    >
      {/* Ventana Emergente (Modal Dialog) Compacta para Móvil, Tablet y PC */}
      <div
        id="new-order-modal-dialog"
        className={`relative w-full sm:max-w-2xl lg:max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl border transition-all overflow-hidden ${
          isDark
            ? 'bg-[#16234F] border-[#223368] text-white'
            : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag/Grab indicator */}
        <div className="sm:hidden w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2" />

        {/* Modal Header (Fijo / Sticky) */}
        <div
          className={`shrink-0 px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-3 ${
            isDark
              ? 'bg-[#0F1B3C]/90 border-[#223368]'
              : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black ${
                isDark
                  ? 'bg-[#FF6FA5] text-[#0F1B3C]'
                  : 'bg-[#1A2B5C] text-white'
              }`}
            >
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black font-['Outfit',sans-serif] tracking-tight">
                  Nueva Venta
                </h2>
                <span
                  className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                    isDark
                      ? 'bg-[#16234F] text-[#FF6FA5] border-[#FF6FA5]/30'
                      : 'bg-white text-[#1A2B5C] border-[#E8DFC8]'
                  }`}
                >
                  #{String(nextNumber).padStart(3, '0')}
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Ingreso rápido de cliente, productos y cobro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenVika && (
              <button
                type="button"
                onClick={onOpenVika}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer border ${
                  isDark
                    ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] border-[#FF6FA5]'
                    : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white border-[#1A2B5C]'
                }`}
                title="Dictar a VIKA con voz o texto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dictar a VIKA</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className={`p-2 rounded-xl transition border cursor-pointer ${
                isDark
                  ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-amber-400 border-[#223368]'
                  : 'bg-white hover:bg-[#F5EFE0] text-amber-600 border-[#E8DFC8]'
              }`}
              title="Guía de ayuda"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="close-new-order-modal-btn"
              onClick={onCancel}
              className={`p-2 rounded-xl transition border cursor-pointer ${
                isDark
                  ? 'bg-[#16234F] hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border-[#223368]'
                  : 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-[#E8DFC8]'
              }`}
              title="Cerrar ventana (Esc)"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <form
          id="new-order-form"
          onSubmit={handleSaveOrder}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {/* Borrador recuperado banner */}
          {showDraftBanner && (
            <div
              className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs shadow-sm transition-all ${
                isDark
                  ? 'bg-[#16234F] border-[#4FD1B5]/40 text-[#4FD1B5]'
                  : 'bg-[#E6FFFA] border-[#99F6E4] text-[#0F766E]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>💾 Borrador activo {restoredDraftTime && `(${restoredDraftTime})`}</span>
              </div>

              {confirmDiscard ? (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-2.5 py-1 text-rose-500 animate-fadeIn">
                  <span className="text-[11px] font-bold">¿Borrar todo?</span>
                  <button
                    id="confirm-discard-draft-btn"
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-2.5 py-0.5 rounded-lg font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition text-xs cursor-pointer"
                  >
                    Sí, Vaciar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(false)}
                    className="px-2 py-0.5 rounded-lg text-xs font-semibold opacity-70 hover:opacity-100 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDraftBanner(false)}
                    className="px-2.5 py-1 rounded-lg font-bold bg-white/20 text-inherit hover:bg-white/30 transition cursor-pointer"
                    title="Mantener borrador"
                  >
                    Mantener
                  </button>
                  <button
                    id="discard-draft-btn"
                    type="button"
                    onClick={() => setConfirmDiscard(true)}
                    className="px-2.5 py-1 rounded-lg font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-400/30 transition cursor-pointer flex items-center gap-1"
                    title="Descartar borrador y empezar de cero"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Descartar</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Banner de error de validación en el formulario */}
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-500 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Bloque 1: Destinatario y Entrega (Compacto en Grid) */}
          <div
            className={`border rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-sm ${
              isDark ? 'bg-[#0F1B3C]/70 border-[#223368]' : 'bg-[#FBF7EF]/80 border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Cliente y Destino</span>
              </span>
              {!showObsInput && (
                <button
                  type="button"
                  onClick={() => setShowObsInput(true)}
                  className={`text-[11px] font-bold underline cursor-pointer ${
                    isDark ? 'text-[#9AA6C9] hover:text-white' : 'text-[#78716C] hover:text-[#1A2B5C]'
                  }`}
                >
                  + Observación
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Cliente */}
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Nombre Cliente
                </label>
                <div className="relative">
                  <User
                    className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    id="input-cliente-name"
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Ej. Camila / TikTok Live"
                    className={`w-full border rounded-xl py-2 pl-8 pr-3 text-xs sm:text-sm focus:outline-none ${
                      isDark
                        ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  <span>WhatsApp / Teléfono</span>
                  <span className="text-[10px] font-bold text-[#FF6FA5]">🇧🇴 +591</span>
                </label>
                <div className="relative">
                  <Phone
                    className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
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
                    placeholder="Ej. 71234567"
                    className={`w-full border rounded-xl py-2 pl-8 pr-3 text-xs sm:text-sm focus:outline-none ${
                      isDark
                        ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              </div>

              {/* Punto de Entrega */}
              <div className="sm:col-span-2">
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Lugar o Punto de Entrega
                </label>
                <div className="relative mb-1.5">
                  <MapPin
                    className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                    }`}
                  />
                  <input
                    id="input-delivery-location"
                    type="text"
                    value={lugarEntrega}
                    onChange={(e) => setLugarEntrega(e.target.value)}
                    placeholder="Ej. Teleférico Morado / Envío Cochabamba..."
                    className={`w-full border rounded-xl py-2 pl-8 pr-3 text-xs sm:text-sm focus:outline-none ${
                      isDark
                        ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>

                {/* Accesos rápidos de entrega */}
                <div className="flex flex-wrap gap-1">
                  {[
                    'Retiro en Tienda',
                    'Teleférico Morado',
                    'Teleférico Rojo',
                    'Ceja El Alto',
                    'Envío a Domicilio',
                    'Cochabamba',
                    'Santa Cruz',
                  ].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLugarEntrega(loc)}
                      className={`px-2 py-0.5 text-[10px] rounded-lg border transition-colors cursor-pointer ${
                        lugarEntrega === loc
                          ? isDark
                            ? 'bg-[#FF6FA5] text-[#0F1B3C] border-[#FF6FA5] font-bold'
                            : 'bg-[#1A2B5C] text-white border-[#1A2B5C] font-bold'
                          : isDark
                          ? 'bg-[#16234F] text-[#9AA6C9] hover:text-white border-[#223368]'
                          : 'bg-white text-[#1A2B5C] hover:bg-[#F5EFE0] border-[#E8DFC8]'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observaciones (Opcional) */}
              {showObsInput && (
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className={`block text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                      }`}
                    >
                      Observaciones / Notas
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowObsInput(false);
                        setObservaciones('');
                      }}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Ocultar
                    </button>
                  </div>
                  <textarea
                    id="input-observaciones"
                    rows={1}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Detalles de regalo, especificaciones o empaque..."
                    className={`w-full border rounded-xl p-2 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50 focus:ring-2 focus:ring-[#FF6FA5]'
                        : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50 focus:ring-2 focus:ring-[#1A2B5C]'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bloque 2: Artículos del Pedido (Compacto, Ágil) */}
          <div
            className={`border rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-sm ${
              isDark ? 'bg-[#0F1B3C]/70 border-[#223368]' : 'bg-[#FBF7EF]/80 border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Artículos del Pedido ({productos.length})</span>
              </span>

              <button
                id="add-product-modal-btn"
                type="button"
                onClick={handleAddProduct}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl flex items-center gap-1 transition active:scale-95 border cursor-pointer ${
                  isDark
                    ? 'bg-[#FF6FA5] text-[#0F1B3C] border-[#FF6FA5]'
                    : 'bg-[#1A2B5C] text-white border-[#1A2B5C]'
                }`}
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Agregar</span>
              </button>
            </div>

            {/* Listado de Artículos */}
            <div className="space-y-2.5">
              {productos.map((prod, index) => {
                const subtotal = (prod.cantidad || 0) * (prod.precioUnitario || 0);
                const complete = isItemComplete(prod);
                const isExpanded = editingItemId === prod.id || (editingItemId === null && !complete);

                // Tarjeta contraída para rapidez
                if (!isExpanded) {
                  return (
                    <div
                      key={prod.id}
                      id={`product-card-${prod.id}`}
                      onClick={() => handleStartEditing(prod.id)}
                      className={`p-2.5 border rounded-xl transition cursor-pointer flex items-center justify-between gap-2 group ${
                        isDark
                          ? 'bg-[#16234F] border-[#223368] hover:border-[#FF6FA5]/50 text-white'
                          : 'bg-white border-[#E8DFC8] hover:border-[#1A2B5C]/30 text-[#1A2B5C]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-[#0F1B3C] text-[#FF6FA5]' : 'bg-[#F5EFE0] text-[#1A2B5C]'
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <span className="font-bold text-xs truncate">
                          {prod.nombre || 'Artículo sin nombre'}
                        </span>
                        <span className="text-[11px] opacity-70 shrink-0">
                          · {prod.cantidad}x {prod.variante || 'Unidad'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-xs font-['Outfit',sans-serif]">
                          {formatCurrency(subtotal)}
                        </span>
                        <Pencil className="w-3 h-3 text-[#FF6FA5] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveProduct(prod.id);
                          }}
                          className="p-1 text-rose-400 hover:text-rose-600 transition"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // Tarjeta expandida para edición directa
                return (
                  <div
                    key={prod.id}
                    id={`product-card-${prod.id}`}
                    className={`p-3 border-2 rounded-2xl space-y-2.5 transition-all ${
                      isDark
                        ? 'bg-[#16234F] border-[#FF6FA5]/60 text-white shadow-md shadow-black/20'
                        : 'bg-white border-[#1A2B5C]/40 text-[#1A2B5C] shadow-md shadow-slate-200/50'
                    }`}
                  >
                    {/* Fila 1: Número, Nombre y Botón Eliminar */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${
                          isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#1A2B5C] text-white'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <input
                        id={`product-name-input-${prod.id}`}
                        type="text"
                        value={prod.nombre}
                        onChange={(e) => handleUpdateProduct(prod.id, 'nombre', e.target.value)}
                        placeholder="Nombre del artículo (ej. Bolígrafo Kuromi)"
                        className={`flex-1 border rounded-xl py-1.5 px-3 text-xs sm:text-sm font-semibold focus:outline-none ${
                          isDark
                            ? 'bg-[#0F1B3C] border-[#223368] text-white placeholder-[#9AA6C9]/50 focus:ring-2 focus:ring-[#FF6FA5]'
                            : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50 focus:ring-2 focus:ring-[#1A2B5C]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(prod.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="Eliminar este artículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Fila 2: Selector Rápido de Presentación / Empaque */}
                    <div>
                      <PackagingQuickSelector
                        value={prod.variante}
                        onChange={(val) => handleUpdateProduct(prod.id, 'variante', val)}
                        onOpenCustomModal={() => setPackagingModalItem(prod)}
                      />
                    </div>

                    {/* Fila 3: Cantidad, Precio Unitario en Bs. y Subtotal */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed dark:border-[#223368] border-[#E8DFC8]">
                      {/* Stepper de Cantidad */}
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                          Cant:
                        </span>
                        <div className="flex items-center border rounded-xl overflow-hidden dark:border-[#223368] border-[#E8DFC8]">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateProduct(
                                prod.id,
                                'cantidad',
                                Math.max(1, (prod.cantidad || 1) - 1)
                              )
                            }
                            className={`px-2 py-1 text-xs font-black cursor-pointer transition ${
                              isDark ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A]' : 'bg-[#F5EFE0] hover:bg-[#EBE2CF]'
                            }`}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={prod.cantidad === 0 ? '' : prod.cantidad}
                            onChange={(e) =>
                              handleUpdateProduct(
                                prod.id,
                                'cantidad',
                                e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="w-12 text-center py-1 text-xs font-black bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateProduct(prod.id, 'cantidad', (prod.cantidad || 0) + 1)
                            }
                            className={`px-2 py-1 text-xs font-black cursor-pointer transition ${
                              isDark ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A]' : 'bg-[#F5EFE0] hover:bg-[#EBE2CF]'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Precio Unitario */}
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                          P. Unit (Bs):
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={prod.precioUnitario === 0 ? '' : prod.precioUnitario}
                          onChange={(e) =>
                            handleUpdateProduct(
                              prod.id,
                              'precioUnitario',
                              e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddProduct();
                            }
                          }}
                          placeholder="0.00"
                          className={`w-20 border rounded-xl py-1 px-2 text-xs font-black text-right focus:outline-none ${
                            isDark
                              ? 'bg-[#0F1B3C] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                              : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                          }`}
                        />
                      </div>

                      {/* Subtotal del Artículo */}
                      <div className="text-right ml-auto">
                        <span className={`block text-[9px] uppercase font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                          Subtotal
                        </span>
                        <span className="text-xs sm:text-sm font-black font-['Outfit',sans-serif] text-[#FF6FA5]">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Botón para agregar otro artículo directamente al final de la lista sin subir al inicio */}
              <div className="pt-1">
                <button
                  id="btn-add-product-list-bottom"
                  type="button"
                  onClick={handleAddProduct}
                  className={`w-full py-2.5 px-4 rounded-xl border-2 border-dashed font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer ${
                    isDark
                      ? 'border-[#FF6FA5]/40 hover:border-[#FF6FA5] bg-[#FF6FA5]/10 hover:bg-[#FF6FA5]/15 text-[#FF6FA5]'
                      : 'border-[#1A2B5C]/30 hover:border-[#1A2B5C] bg-[#1A2B5C]/5 hover:bg-[#1A2B5C]/10 text-[#1A2B5C]'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Agregar Otro Artículo (#{productos.length + 1})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bloque 3: Cobro y Liquidación (Compacto) */}
          <div
            className={`border rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-sm ${
              isDark ? 'bg-[#0F1B3C]/70 border-[#223368]' : 'bg-[#FBF7EF]/80 border-[#E8DFC8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cobro y Saldo</span>
              </span>

              {/* Atajos de pago en 1 clic */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('full')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                    pagado === calculatedTotal && calculatedTotal > 0
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isDark
                      ? 'bg-[#16234F] text-[#4FD1B5] border-[#4FD1B5]/40'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  Total Pagado
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('half')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                    pagado > 0 && pagado === Number((calculatedTotal / 2).toFixed(2))
                      ? 'bg-amber-600 text-white border-amber-600'
                      : isDark
                      ? 'bg-[#16234F] text-amber-300 border-amber-800/40'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  50% Anticipo
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickPayment('zero')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                    pagado === 0
                      ? 'bg-rose-600 text-white border-rose-600'
                      : isDark
                      ? 'bg-[#16234F] text-rose-300 border-rose-800/40'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  Por Cobrar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Monto Pagado */}
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Monto Pagado (Bs.)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={pagado === 0 ? '' : pagado}
                  onChange={(e) =>
                    setPagado(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className={`w-full border rounded-xl py-2 px-3 text-sm font-black focus:outline-none ${
                    isDark
                      ? 'bg-[#16234F] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                      : 'bg-white border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                  }`}
                />
              </div>

              {/* Saldo Resultante */}
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  Saldo Pendiente
                </label>
                <div
                  className={`py-2 px-3 rounded-xl border text-sm font-black flex items-center justify-between font-['Outfit',sans-serif] ${
                    calculatedSaldo > 0
                      ? isDark
                        ? 'bg-amber-950/50 text-[#FFA26B] border-amber-800/40'
                        : 'bg-amber-50 text-[#C2410C] border-amber-200'
                      : isDark
                      ? 'bg-emerald-950/50 text-[#4FD1B5] border-emerald-800/40'
                      : 'bg-emerald-50 text-[#0F766E] border-emerald-200'
                  }`}
                >
                  <span>{formatCurrency(calculatedSaldo)}</span>
                  {calculatedSaldo === 0 ? (
                    <span className="text-[10px] font-bold">✓ Pagado</span>
                  ) : (
                    <span className="text-[10px] font-bold">Por cobrar</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Sticky Footer (Siempre visible en Celular, Tablet y PC) */}
        <div
          className={`shrink-0 p-3 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDark
              ? 'bg-[#0F1B3C] border-[#223368]'
              : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}
        >
          {/* Resumen de Totales */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <span className={`block text-[9px] uppercase font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Total Venta
              </span>
              <span className="text-base sm:text-lg font-black font-['Outfit',sans-serif]">
                {formatCurrency(calculatedTotal)}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />

            <div>
              <span className={`block text-[9px] uppercase font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Saldo a Cobrar
              </span>
              <span
                className={`text-sm sm:text-base font-black font-['Outfit',sans-serif] ${
                  calculatedSaldo > 0 ? 'text-[#FFA26B]' : 'text-emerald-500'
                }`}
              >
                {formatCurrency(calculatedSaldo)}
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="footer-add-product-btn"
              type="button"
              onClick={handleAddProduct}
              className={`py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 border cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-[#1E2D5A] hover:bg-[#253B7A] text-[#FF6FA5] border-[#FF6FA5]/40'
                  : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#1A2B5C]/30'
              }`}
              title="Agregar nuevo artículo sin subir al inicio (+)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Artículo</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isDark ? 'bg-[#FF6FA5] text-[#0F1B3C]' : 'bg-[#1A2B5C] text-white'
                }`}
              >
                {productos.length}
              </span>
            </button>

            <button
              id="cancel-new-order-modal-btn"
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className={`flex-1 sm:flex-initial py-2.5 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition border cursor-pointer ${
                isDark
                  ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
                  : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
              }`}
            >
              Cancelar
            </button>

            <button
              id="confirm-save-order-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveOrder}
              className={`flex-1 sm:flex-initial py-2.5 px-5 sm:px-6 rounded-xl font-black text-xs sm:text-sm active:scale-95 shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isSubmitting ? 'opacity-60 pointer-events-none' : ''
              } ${
                isDark
                  ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25 border border-[#FF6FA5]'
                  : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar Venta</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Botón flotante para agregar artículo desde cualquier posición dentro de la ventana */}
        <div className="absolute bottom-20 right-3 sm:right-6 z-30 pointer-events-none">
          <button
            id="fab-add-product-modal-btn"
            type="button"
            onClick={handleAddProduct}
            className={`pointer-events-auto py-2.5 px-3.5 sm:px-4 rounded-full font-black text-xs sm:text-sm active:scale-95 shadow-2xl flex items-center gap-1.5 transition-all cursor-pointer border ${
              isDark
                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] border-[#FF6FA5]/40 shadow-lg shadow-black/50'
                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white border-[#1A2B5C] shadow-lg shadow-black/30'
            }`}
            title="Agregar nuevo artículo rápidamente (+)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Artículo</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                isDark ? 'bg-[#0F1B3C]/25 text-[#0F1B3C]' : 'bg-white/20 text-white'
              }`}
            >
              {productos.length}
            </span>
          </button>
        </div>

        {/* Modal de selección de empaque / variante */}
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

        {/* Modal Guía VIKA */}
        <VikaGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
          onSelectPrompt={() => {
            if (onOpenVika) {
              onOpenVika();
            }
          }}
        />
      </div>
    </div>
  );
};
