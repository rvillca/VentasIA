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
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'cantidad' || field === 'costoUnitario') {
      const qty = field === 'cantidad' ? Number(value) : Number(item.cantidad);
      const cost = field === 'costoUnitario' ? Number(value) : Number(item.costoUnitario);
      item.subtotal = (qty || 0) * (cost || 0);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        nombre: '',
        categoria: 'Papelería Kawaii',
        variante: '',
        cantidad: 1,
        costoUnitario: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedor.trim()) {
      setFormError('Por favor ingresa el nombre del proveedor o mayorista.');
      return;
    }

    const validItems = items.filter((it) => it.nombre.trim().length > 0 && it.cantidad > 0);
    if (validItems.length === 0) {
      setFormError('Agrega al menos un artículo o material con nombre y cantidad válida.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const total = calculatedTotal;
      const pagado = Math.min(total, Math.max(0, Number(pagadoMonto) || 0));
      const saldo = Math.max(0, total - pagado);
      
      const estado: PurchaseStatus =
        purchase.estado === 'Anulado'
          ? 'Anulado'
          : saldo === 0
          ? 'Pagado'
          : 'Saldo Pendiente';

      const updatedFields: Partial<Purchase> = {
        proveedor: proveedor.trim(),
        telefonoProveedor: telefonoProveedor.trim() || '',
        numeroFacturaRecibo: numeroFacturaRecibo.trim() || '',
        metodoPago,
        fechaCompra: new Date(fechaCompra).toISOString(),
        productos: validItems.map((it) => ({
          ...it,
          variante: it.variante?.trim() || '',
          categoria: it.categoria?.trim() || 'General',
          subtotal: it.cantidad * it.costoUnitario,
        })),
        total,
        pagado,
        saldo,
        estado,
        observaciones: observaciones.trim() || '',
      };

      await updatePurchaseInFirestore(purchase.id, updatedFields);

      const updatedPurchase: Purchase = {
        ...purchase,
        ...updatedFields,
      } as Purchase;

      onSaved(updatedPurchase);
      onClose();
    } catch (err: any) {
      console.error('Error updating purchase:', err);
      setFormError(err.message || 'Error al actualizar la compra.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Outfit',sans-serif]">
                Editar Compra #C-{String(purchase.purchaseNumber).padStart(3, '0')}
              </h2>
              <p className="text-xs text-slate-400">
                Corrige datos del proveedor, artículos, costos o comprobantes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Row 1: Proveedor & Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Proveedor o Mayorista *
              </label>
              <input
                type="text"
                required
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="ej: Importadora Sakura Kawaii"
                list="edit-frequent-suppliers-list"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <datalist id="edit-frequent-suppliers-list">
                {FREQUENT_SUPPLIERS.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Teléfono Proveedor
              </label>
              <input
                type="text"
                value={telefonoProveedor}
                onChange={(e) => setTelefonoProveedor(e.target.value)}
                placeholder="ej: 76543210"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Row 2: Fecha, N° Recibo/Factura, Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Fecha de Compra
              </label>
              <input
                type="date"
                required
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                N° Factura / Recibo
              </label>
              <input
                type="text"
                value={numeroFacturaRecibo}
                onChange={(e) => setNumeroFacturaRecibo(e.target.value)}
                placeholder="ej: F-9281 / Recibo #40"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="Efectivo">💵 Efectivo</option>
                <option value="QR">📱 Pago QR</option>
                <option value="Transferencia">🏦 Transferencia Bancaria</option>
                <option value="Crédito">📋 A Crédito</option>
              </select>
            </div>
          </div>

          {/* Section: Artículos / Materiales */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                <span>Artículos & Lotes Adquiridos ({items.length})</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="py-1 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Artículo</span>
              </button>
            </div>

            {/* Item Rows */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        required
                        value={item.nombre}
                        onChange={(e) => handleItemChange(index, 'nombre', e.target.value)}
                        placeholder="Nombre del artículo o lote..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-1.5 px-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        value={item.categoria || 'Mochilas & Bolsos'}
                        onChange={(e) => handleItemChange(index, 'categoria', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-1.5 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-1.5 px-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
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
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Cant:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.cantidad === 0 ? '' : item.cantidad}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemChange(index, 'cantidad', val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                          }}
                          placeholder="0"
                          className="w-full bg-transparent text-xs text-white font-mono focus:outline-none text-right"
                        />
                      </div>
                    </div>

                    <div className="col-span-4">
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Bs c/u:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.costoUnitario === 0 ? '' : item.costoUnitario}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemChange(index, 'costoUnitario', val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                          }}
                          placeholder="0"
                          className="w-full bg-transparent text-xs text-white font-mono focus:outline-none text-right"
                        />
                      </div>
                    </div>

                    <div className="col-span-4 flex items-center justify-end gap-2">
                      <span className="text-xs font-mono font-bold text-amber-300">
                        Bs. {item.subtotal || 0}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900"
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
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Total Compra (Bs.)
                </label>
                <div className="text-xl font-black text-white font-mono">
                  {formatCurrency(calculatedTotal)}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  Monto Pagado / Anticipo (Bs.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={calculatedTotal}
                    value={pagadoMonto === 0 ? '' : pagadoMonto}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPagadoMonto(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                    }}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl py-2 px-3 text-sm font-bold text-emerald-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setPagadoMonto(calculatedTotal)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-900"
                  >
                    Total
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                  Saldo Pendiente
                </label>
                <div
                  className={`text-xl font-black font-mono ${
                    calculatedSaldo > 0 ? 'text-rose-300' : 'text-slate-500'
                  }`}
                >
                  {formatCurrency(calculatedSaldo)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Observaciones / Notas de Entrega
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="ej: Mercadería entregada en caja sellada, calidad revisada."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {onAnular && purchase.estado !== 'Anulado' && (
              <button
                type="button"
                onClick={() => onAnular(purchase)}
                className="py-3 px-3.5 rounded-xl border border-rose-800/80 bg-rose-950/40 hover:bg-rose-950 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                title="Anular esta compra"
              >
                <XCircle className="w-4 h-4" />
                <span>Anular Compra</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs sm:text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
