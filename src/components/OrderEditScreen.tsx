import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  DollarSign,
  Package,
  User,
  Phone,
  MapPin,
  FileText,
  Box,
} from 'lucide-react';
import { Order, OrderItem, OrderStatus } from '../types';
import { formatCurrency, formatBoliviaPhone } from '../lib/storage';
import { PackagingSelectionModal } from './PackagingSelectionModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface OrderEditScreenProps {
  order: Order;
  onSave: (updatedOrder: Order) => void;
  onCancel: () => void;
}

export const OrderEditScreen: React.FC<OrderEditScreenProps> = ({
  order,
  onSave,
  onCancel,
}) => {
  const { userProfile } = useAuth();
  const { isDark } = useTheme();
  const [cliente, setCliente] = useState(order.cliente);
  const [telefono, setTelefono] = useState(order.telefono);
  const [lugarEntrega, setLugarEntrega] = useState(order.lugarEntrega);
  const [observaciones, setObservaciones] = useState(order.observaciones);
  const [estado, setEstado] = useState<OrderStatus>(order.estado);
  const [packagingModalItem, setPackagingModalItem] = useState<OrderItem | null>(null);
  const [productos, setProductos] = useState<OrderItem[]>(
    order.productos.map((p) => ({ ...p }))
  );
  const [pagado, setPagado] = useState<number>(order.pagado);

  const calculatedTotal = productos.reduce(
    (sum, item) => sum + (item.cantidad || 0) * (item.precioUnitario || 0),
    0
  );
  const calculatedSaldo = Math.max(0, calculatedTotal - (pagado || 0));

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

  const handleAddProduct = () => {
    const newItem: OrderItem = {
      id: `item_${Date.now()}_${productos.length}`,
      nombre: '',
      variante: '',
      cantidad: 1,
      precioUnitario: 0,
    };
    setProductos((prev) => [...prev, newItem]);
  };

  const handleRemoveProduct = (id: string) => {
    if (productos.length === 1) {
      setProductos([
        {
          id: `item_${Date.now()}`,
          nombre: '',
          variante: '',
          cantidad: 1,
          precioUnitario: 0,
        },
      ]);
      return;
    }
    setProductos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim()) {
      alert('Por favor ingresa el nombre de la clienta.');
      return;
    }

    const currentUserName = userProfile?.displayName || userProfile?.email || 'Usuario';
    const currentUserUid = userProfile?.uid || '';
    const nowIso = new Date().toISOString();

    let shippingData = {};
    if (estado === 'Entregado') {
      shippingData = {
        enviadoPorNombre: order.enviadoPorNombre || order.despachadoPorNombre || currentUserName,
        enviadoPorUid: order.enviadoPorUid || order.despachadoPorUid || currentUserUid,
        despachadoPorNombre: order.despachadoPorNombre || order.enviadoPorNombre || currentUserName,
        despachadoPorUid: order.despachadoPorUid || order.enviadoPorUid || currentUserUid,
        fechaEnvio: order.fechaEnvio || order.despachadoAt || nowIso,
        despachadoAt: order.despachadoAt || order.fechaEnvio || nowIso,
      };
    } else if (estado === 'Abierto') {
      shippingData = {
        enviadoPorNombre: undefined,
        enviadoPorUid: undefined,
        despachadoPorNombre: undefined,
        despachadoPorUid: undefined,
        fechaEnvio: undefined,
        despachadoAt: undefined,
      };
    }

    const updated: Order = {
      ...order,
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      lugarEntrega: lugarEntrega.trim(),
      observaciones: observaciones.trim(),
      estado,
      ...shippingData,
      productos: productos.map((p) => ({
        ...p,
        nombre: p.nombre.trim() || 'Artículo',
        variante: p.variante.trim(),
        cantidad: Math.max(1, p.cantidad),
        precioUnitario: Math.max(0, p.precioUnitario),
      })),
      total: calculatedTotal,
      pagado: Math.max(0, pagado),
      saldo: calculatedSaldo,
      updatedAt: nowIso,
    };

    onSave(updated);
  };

  return (
    <div id="order-edit-container" className="max-w-3xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          id="edit-back-btn"
          onClick={onCancel}
          className={`p-2.5 rounded-2xl transition-all flex items-center gap-1 text-xs font-bold active:scale-95 border cursor-pointer ${
            isDark
              ? 'bg-[#16234F] hover:bg-[#1E2D5A] text-white border-[#223368]'
              : 'bg-white hover:bg-[#F5EFE0] text-[#1A2B5C] border-[#E8DFC8]'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancelar</span>
        </button>

        <h1
          className={`text-xl font-black font-['Outfit',sans-serif] ${
            isDark ? 'text-white' : 'text-[#1A2B5C]'
          }`}
        >
          Editar Pedido #{order.orderNumber}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Location Details */}
        <div
          className={`border rounded-3xl p-5 space-y-4 shadow-sm transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <h2
            className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-3 ${
              isDark
                ? 'text-[#FF6FA5] border-[#223368]'
                : 'text-[#1A2B5C] border-[#E8DFC8]'
            }`}
          >
            <User className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
            Datos de la Clienta
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-xs font-bold mb-1.5 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Nombre de la Clienta *
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className={`w-full border rounded-xl py-2.5 px-3 text-sm focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
                required
              />
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-1.5 flex items-center justify-between ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                <span>Teléfono / WhatsApp</span>
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#FF6FA5]' : 'text-[#0F766E]'}`}>
                  🇧🇴 +591
                </span>
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                onBlur={() => {
                  if (telefono.trim()) {
                    setTelefono(formatBoliviaPhone(telefono));
                  }
                }}
                placeholder="Ej. 71234567 o +591 71234567"
                className={`w-full border rounded-xl py-2.5 px-3 text-sm focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className={`block text-xs font-bold mb-1.5 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Lugar de Entrega / Envío
              </label>
              <input
                type="text"
                value={lugarEntrega}
                onChange={(e) => setLugarEntrega(e.target.value)}
                className={`w-full border rounded-xl py-2.5 px-3 text-sm focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className={`block text-xs font-bold mb-1.5 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Observaciones / Notas
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              />
            </div>

            {/* Order Status */}
            <div>
              <label
                className={`block text-xs font-bold mb-1.5 ${
                  isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'
                }`}
              >
                Estado del Pedido
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as OrderStatus)}
                className={`w-full border rounded-xl py-2.5 px-3 text-sm focus:outline-none font-bold transition ${
                  isDark
                    ? 'bg-[#0F1B3C] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                    : 'bg-[#FBF7EF] border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                }`}
              >
                <option value="Abierto">Abierto (Pendiente)</option>
                <option value="Entregado">Entregado (Completado)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div
          className={`border rounded-3xl p-5 space-y-4 shadow-sm transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-[#223368]' : 'border-[#E8DFC8]'
            }`}
          >
            <h2
              className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'
              }`}
            >
              <Package className={`w-4 h-4 ${isDark ? 'text-[#FF6FA5]' : 'text-[#1A2B5C]'}`} />
              Artículos ({productos.length})
            </h2>
            <button
              type="button"
              onClick={handleAddProduct}
              className={`px-3 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer ${
                isDark
                  ? 'bg-[#0F1B3C] hover:bg-[#1E2D5A] border-[#223368] text-[#FF6FA5]'
                  : 'bg-[#F5EFE0] hover:bg-[#E8DFC8] border-[#E8DFC8] text-[#1A2B5C]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Artículo</span>
            </button>
          </div>

          <div className="space-y-3">
            {productos.map((prod) => {
              return (
                <div
                  key={prod.id}
                  className={`p-3.5 border rounded-2xl space-y-2.5 transition ${
                    isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={prod.nombre}
                      onChange={(e) =>
                        handleUpdateProduct(prod.id, 'nombre', e.target.value)
                      }
                      placeholder="Nombre del artículo"
                      className={`flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none font-bold transition ${
                        isDark
                          ? 'bg-[#16234F] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                          : 'bg-white border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(prod.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Packaging Selection Trigger */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prod.variante}
                      onClick={() => setPackagingModalItem(prod)}
                      onChange={(e) =>
                        handleUpdateProduct(prod.id, 'variante', e.target.value)
                      }
                      placeholder="Presentación (ej. Box de 24 u., Docena...)"
                      className={`flex-1 border rounded-xl px-3 py-1.5 text-xs focus:outline-none transition ${
                        isDark
                          ? 'bg-[#16234F] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                          : 'bg-white border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setPackagingModalItem(prod)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 transition cursor-pointer ${
                        isDark
                          ? 'bg-[#FF6FA5] text-[#0F1B3C] hover:bg-[#ff85b3]'
                          : 'bg-[#1A2B5C] text-white hover:bg-[#253B7A]'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>Elegir Box</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center pt-1">
                    {/* Quantity */}
                    <div
                      className={`flex items-center border rounded-xl overflow-hidden ${
                        isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateProduct(
                            prod.id,
                            'cantidad',
                            Math.max(0, (prod.cantidad || 0) - 1)
                          )
                        }
                        className={`w-8 h-8 flex items-center justify-center text-sm font-bold transition cursor-pointer ${
                          isDark ? 'text-white hover:bg-[#223368]' : 'text-[#1A2B5C] hover:bg-[#F5EFE0]'
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
                        className={`w-full bg-transparent text-center text-xs font-bold outline-none ${
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
                        className={`w-8 h-8 flex items-center justify-center text-sm font-bold transition cursor-pointer ${
                          isDark ? 'text-white hover:bg-[#223368]' : 'text-[#1A2B5C] hover:bg-[#F5EFE0]'
                        }`}
                      >
                        +
                      </button>
                    </div>

                    {/* Unit Price */}
                    <div className="relative">
                      <span
                        className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold ${
                          isDark ? 'text-[#FF6FA5]' : 'text-[#78716C]'
                        }`}
                      >
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
                        className={`w-full border rounded-xl py-1.5 pl-8 pr-2 text-xs font-bold outline-none transition ${
                          isDark
                            ? 'bg-[#16234F] border-[#223368] text-white focus:ring-2 focus:ring-[#FF6FA5]'
                            : 'bg-white border-[#E8DFC8] text-[#1A2B5C] focus:ring-2 focus:ring-[#1A2B5C]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Calculation */}
        <div
          className={`border rounded-3xl p-5 space-y-4 shadow-sm transition-colors ${
            isDark ? 'bg-[#16234F] border-[#223368]' : 'bg-white border-[#E8DFC8]'
          }`}
        >
          <h2
            className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-3 ${
              isDark
                ? 'text-[#4FD1B5] border-[#223368]'
                : 'text-[#0F766E] border-[#E8DFC8]'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Finanzas y Saldo
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className={`p-3.5 rounded-2xl border ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Total
              </span>
              <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#1A2B5C]'}`}>
                {formatCurrency(calculatedTotal)}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-2xl border ${
                isDark ? 'bg-[#0F1B3C] border-emerald-500/30' : 'bg-[#FBF7EF] border-emerald-200'
              }`}
            >
              <label className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                Pagado (Bs.)
              </label>
              <input
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
                className={`w-full border rounded-xl p-1.5 text-base font-bold outline-none ${
                  isDark
                    ? 'bg-[#16234F] border-emerald-500/40 text-emerald-300'
                    : 'bg-white border-emerald-300 text-emerald-700'
                }`}
              />
            </div>

            <div
              className={`p-3.5 rounded-2xl border ${
                isDark ? 'bg-[#0F1B3C] border-[#223368]' : 'bg-[#FBF7EF] border-[#E8DFC8]'
              }`}
            >
              <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-[#9AA6C9]' : 'text-[#78716C]'}`}>
                Saldo
              </span>
              <span
                className={`text-xl font-black ${
                  calculatedSaldo <= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {formatCurrency(calculatedSaldo)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className={`flex-1 py-4 px-6 rounded-2xl font-black text-base active:scale-95 shadow-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              isDark
                ? 'bg-[#FF6FA5] hover:bg-[#ff85b3] text-[#0F1B3C] shadow-[#FF6FA5]/25 border border-[#FF6FA5]'
                : 'bg-[#1A2B5C] hover:bg-[#253B7A] text-white shadow-[#1A2B5C]/25'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </form>

      {/* Packaging Selection Modal */}
      {packagingModalItem && (
        <PackagingSelectionModal
          isOpen={!!packagingModalItem}
          onClose={() => setPackagingModalItem(null)}
          productName={packagingModalItem.nombre || 'Artículo'}
          currentValue={packagingModalItem.variante}
          onSelect={(presetLabel, suggestedUnits) => {
            handleUpdateProduct(packagingModalItem.id, 'variante', presetLabel);
            if (suggestedUnits && (!packagingModalItem.cantidad || packagingModalItem.cantidad === 0)) {
              handleUpdateProduct(packagingModalItem.id, 'cantidad', 1);
            }
          }}
        />
      )}
    </div>
  );
};
