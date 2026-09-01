import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Check,
  Package,
  XCircle,
} from 'lucide-react';
import { Purchase, PurchaseItem, PurchaseStatus } from '../../types';
import { formatCurrency, updatePurchaseInFirestore } from '../../lib/storage';
import { PackagingQuickSelector } from '../PackagingQuickSelector';
import { useTheme } from '../../contexts/ThemeContext';

interface PurchaseEditModalProps {
  purchase: Purchase;
  onClose: () => void;
  onSaved: (updated: Purchase) => void;
  onAnular?: (purchase: Purchase) => void;
}

const FREQUENT_SUPPLIERS = [
  'Importadora Mayorista Sakura Kawaii',
  'Fábrica de Mochilas El Alto',
  'Distribuidora Anime 3D & Figuras',
  'Distribuidora de Papelería Central',
  'Insumos & Embalajes La Paz',
  'Textiles & Confecciones Bolivia',
];

const CATEGORIES = [
  'Mochilas & Bolsos',
  'Papelería Kawaii',
  'Estuches & Cartucheras',
  'Insumos & Embalaje',
  'Accesorios & Llaveros',
  'Varios / Mercadería General',
];

export const PurchaseEditModal: React.FC<PurchaseEditModalProps> = ({
  purchase,
  onClose,
  onSaved,
  onAnular,
}) => {
  const { isDark } = useTheme();
  const [proveedor, setProveedor] = useState(purchase.proveedor || '');
  const [telefonoProveedor, setTelefonoProveedor] = useState(purchase.telefonoProveedor || '');
  const [numeroFacturaRecibo, setNumeroFacturaRecibo] = useState(purchase.numeroFacturaRecibo || '');
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Transferencia' | 'QR' | 'Crédito'>(
    purchase.metodoPago || 'Efectivo'
  );
  const [fechaCompra, setFechaCompra] = useState(() => {
    try {
      return purchase.fechaCompra
        ? new Date(purchase.fechaCompra).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });

  const [items, setItems] = useState<PurchaseItem[]>(() => {
    if (!purchase.productos || purchase.productos.length === 0) {
      return [
        {
          id: 'item_' + Date.now(),
          nombre: '',
          categoria: 'Mochilas & Bolsos',
          variante: '',
          cantidad: 1,
          costoUnitario: 0,
          subtotal: 0,
        },
      ];
    }
    return purchase.productos.map((it, idx) => ({
      ...it,
      id: it.id || `item_${Date.now()}_${idx}`,
      cantidad: Number(it.cantidad) || 1,
      costoUnitario: Number(it.costoUnitario) || 0,
      subtotal: (Number(it.cantidad) || 1) * (Number(it.costoUnitario) || 0),
    }));
  });

  const [pagadoMonto, setPagadoMonto] = useState<number>(purchase.pagado || 0);
  const [observaciones, setObservaciones] = useState(purchase.observaciones || '');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const calculatedTotal = useMemo(() => {
    return items.reduce(
      (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.costoUnitario) || 0),
      0
    );
  }, [items]);

  const calculatedSaldo = Math.max(0, calculatedTotal - (Number(pagadoMonto) || 0));

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], [field]: value };
      const qty = Number(current.cantidad) || 0;
      const unit = Number(current.costoUnitario) || 0;
      current.subtotal = qty * unit;
      copy[index] = current;
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        nombre: '',
        categoria: 'Mochilas & Bolsos',
        variante: '',
        cantidad: 1,
        costoUnitario: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!proveedor.trim()) {
      setFormError('Por favor ingresa el nombre de la empresa o proveedor.');
      return;
    }

    const validItems = items.filter((it) => it.nombre.trim().length > 0);
    if (validItems.length === 0) {
      setFormError('Debes ingresar al menos un artículo con nombre.');
      return;
    }

    let estado: PurchaseStatus = 'Pagado';
    if (purchase.estado === 'Anulado') {
      estado = 'Anulado';
    } else if (calculatedSaldo > 0) {
      estado = 'Saldo Pendiente';
    }

    const updatedData: Partial<Purchase> = {
      proveedor: proveedor.trim(),
      telefonoProveedor: telefonoProveedor.trim() || undefined,
      numeroFacturaRecibo: numeroFacturaRecibo.trim() || undefined,
      metodoPago,
      fechaCompra: fechaCompra || new Date().toISOString(),
      productos: validItems.map((it) => ({
        ...it,
        cantidad: Number(it.cantidad) || 1,
        costoUnitario: Number(it.costoUnitario) || 0,
        subtotal: (Number(it.cantidad) || 1) * (Number(it.costoUnitario) || 0),
      })),
      total: calculatedTotal,
      pagado: Number(pagadoMonto) || 0,
      saldo: calculatedSaldo,
      estado,
      observaciones: observaciones.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      await updatePurchaseInFirestore(purchase.id, updatedData);
      onSaved({
        ...purchase,
        ...updatedData,
      } as Purchase);
      onClose();
    } catch (err: any) {
      console.error('Error al actualizar compra:', err);
      setFormError(err.message || 'Error al guardar los cambios en la compra.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-2xl border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto ${
          isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              isDark
                ? 'bg-[#0F1B3C] border-[#223368] text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-black font-['Outfit',sans-serif] ${
                isDark ? 'text-white' : 'text-[#1A2B5C]'
              }`}>
                Modificar Compra #C-{String(purchase.purchaseNumber).padStart(3, '0')}
              </h3>
              <p className={`text-xs ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Edición de artículos, costos y pagos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDark ? 'text-[#9AA6C9] hover:text-white hover:bg-[#0F1B3C]' : 'text-[#78716C] hover:text-[#1A2B5C] hover:bg-[#FBF7EF]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className={`p-3 border rounded-xl text-xs flex items-center gap-2 ${
            isDark
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supplier Info */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}>
            <div className="sm:col-span-2">
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Proveedor o Mayorista *
              </label>
              <input
                type="text"
                required
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre de la empresa, fábrica o vendedor..."
                className={`w-full border rounded-xl py-2 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />

              {/* Frequent supplier pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {FREQUENT_SUPPLIERS.map((sup, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProveedor(sup)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      proveedor === sup
                        ? isDark
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                          : 'bg-amber-500 text-white font-bold border-amber-500'
                        : isDark
                        ? 'bg-[#16234F] hover:bg-[#1E2D5A] border-[#223368] text-slate-300'
                        : 'bg-white hover:bg-[#F5EFE0] border-[#E8DFC8] text-[#1A2B5C]'
                    }`}
                  >
                    {sup}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Teléfono / WhatsApp Proveedor
              </label>
              <input
                type="text"
                value={telefonoProveedor}
                onChange={(e) => setTelefonoProveedor(e.target.value)}
                placeholder="ej: 71234567"
                className={`w-full border rounded-xl py-2 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                N° Factura / Nota / Recibo
              </label>
              <input
                type="text"
                value={numeroFacturaRecibo}
                onChange={(e) => setNumeroFacturaRecibo(e.target.value)}
                placeholder="ej: FAC-00912 o RECIBO-24"
                className={`w-full border rounded-xl py-2 px-3 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Fecha de Compra
              </label>
              <input
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className={`w-full border rounded-xl py-2 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className={`w-full border rounded-xl py-2 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                }`}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="QR">Pago QR Simple</option>
                <option value="Crédito">Crédito / Por Pagar</option>
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                <Package className="w-4 h-4 text-amber-500" />
                <span>Lotes y Artículos Comprados</span>
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  isDark
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Producto</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={item.id || index}
                  className={`p-3 rounded-2xl border space-y-2 relative transition ${
                    isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        required
                        value={item.nombre}
                        onChange={(e) => handleItemChange(index, 'nombre', e.target.value)}
                        placeholder="Nombre del artículo *"
                        className={`w-full border rounded-xl py-1.5 px-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1A2B5C] ${
                          isDark
                            ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                            : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <select
                        value={item.categoria || 'Mochilas & Bolsos'}
                        onChange={(e) => handleItemChange(index, 'categoria', e.target.value)}
                        className={`w-full border rounded-xl py-1.5 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A2B5C] ${
                          isDark
                            ? 'bg-[#16234F] border-[#223368] text-slate-300'
                            : 'bg-white border-[#E8DFC8] text-[#1A2B5C]'
                        }`}
                      >
                        {CATEGORIES.map((cat, idx) => (
                          <option key={idx} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={item.variante || ''}
                        onChange={(e) => handleItemChange(index, 'variante', e.target.value)}
                        placeholder="Presentación (ej. Box de 24 u., ½ Box...)"
                        className={`w-full border rounded-xl py-1.5 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A2B5C] ${
                          isDark
                            ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                            : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Quick presentation selector */}
                  <div className="pt-0.5">
                    <PackagingQuickSelector
                      value={item.variante || ''}
                      onChange={(preset) => handleItemChange(index, 'variante', preset)}
                      theme="amber"
                    />
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <div className={`flex items-center gap-1 border rounded-xl px-2 py-1 ${
                        isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
                      }`}>
                        <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Cant:</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.cantidad === 0 ? '' : item.cantidad}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemChange(index, 'cantidad', val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                          }}
                          placeholder="0"
                          className={`w-full bg-transparent text-xs font-mono focus:outline-none text-right ${
                            isDark ? 'text-white' : 'text-[#1A2B5C]'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="col-span-4">
                      <div className={`flex items-center gap-1 border rounded-xl px-2 py-1 ${
                        isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
                      }`}>
                        <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>Bs c/u:</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.costoUnitario === 0 ? '' : item.costoUnitario}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemChange(index, 'costoUnitario', val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                          }}
                          placeholder="0.00"
                          className={`w-full bg-transparent text-xs font-mono focus:outline-none text-right ${
                            isDark ? 'text-white' : 'text-[#1A2B5C]'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="col-span-4 flex items-center justify-end gap-2">
                      <span className={`text-xs font-mono font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                        {formatCurrency(item.subtotal || 0)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Settlement Breakdown */}
          <div className={`border rounded-2xl p-4 space-y-3 ${
            isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}>
                  Total Compra (Bs.)
                </label>
                <div className={`text-xl font-black font-mono ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                  {formatCurrency(calculatedTotal)}
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  Monto Pagado / Anticipo (Bs.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    max={calculatedTotal}
                    value={pagadoMonto === 0 ? '' : pagadoMonto}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPagadoMonto(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                    }}
                    placeholder="0.00"
                    className={`w-full border rounded-xl py-2 px-3 text-sm font-bold font-mono focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-[#16234F] border-emerald-500/40 text-emerald-300 focus:ring-emerald-400'
                        : 'bg-white border-emerald-300 text-emerald-800 focus:ring-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setPagadoMonto(calculatedTotal)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded font-bold border cursor-pointer ${
                      isDark
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Total
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-rose-400' : 'text-rose-700'
                }`}>
                  Saldo Pendiente
                </label>
                <div
                  className={`text-xl font-black font-mono ${
                    calculatedSaldo > 0
                      ? isDark ? 'text-rose-300' : 'text-rose-700'
                      : isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                  }`}
                >
                  {formatCurrency(calculatedSaldo)}
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
              }`}>
                Observaciones / Notas de Entrega
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="ej: Mercadería entregada en caja sellada, calidad revisada."
                className={`w-full border rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1A2B5C] ${
                  isDark
                    ? 'bg-[#16234F] border-[#223368] text-white placeholder-[#9AA6C9]/50'
                    : 'bg-white border-[#E8DFC8] text-[#1A2B5C] placeholder-[#78716C]/50'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {onAnular && purchase.estado !== 'Anulado' && (
              <button
                type="button"
                onClick={() => onAnular(purchase)}
                className={`py-3 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isDark
                    ? 'border-rose-800/80 bg-rose-950/40 hover:bg-rose-900 text-rose-300'
                    : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800'
                }`}
                title="Anular esta compra"
              >
                <XCircle className="w-4 h-4" />
                <span>Anular Compra</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm transition cursor-pointer ${
                isDark
                  ? 'border-[#223368] text-white hover:bg-[#0F1B3C]'
                  : 'border-[#E8DFC8] text-[#1A2B5C] hover:bg-[#FBF7EF]'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm active:scale-95 shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer ${
                isDark
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
